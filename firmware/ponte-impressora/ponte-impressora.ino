// Food Hope — ponte de impressão ESP32
//
// Liga na tomada e funciona:
//   1. Entra no Wi-Fi (salvo pelo portal > restaurante > alternativo). Sem Wi-Fi, abre o portal
//      "FoodHope-Ponte" (http://192.168.77.1) para escolher a rede pelo celular.
//   2. Acha a impressora térmica (IP salvo; senão varre o /24 na porta 9100).
//   3. Abre WSS de saída autenticado para a API e repassa os cupons ESC/POS para a impressora.
//
// Protocolo binário (espelhado em api/src/modules/impressora/ponte-protocolo.ts):
//   frame = tipo u8 | id u32 BE | payload
// Credenciais em secrets.h (não versionado; modelo em secrets.example.h).

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <Preferences.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <esp_task_wdt.h>
#include <esp_mac.h>
#include <esp_wifi.h>
#include <lwip/sockets.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/select.h>
#include "secrets.h"
#include "ca_roots.h"

#define FW_VERSAO "1.0.0"

#define BOOT_PIN 0  // botão BOOT do DevKit: segurar ao ligar abre o portal para trocar o Wi-Fi

#ifndef LED_PIN
#define LED_PIN 2
#endif
#ifndef PONTE_PORTA
#define PONTE_PORTA 443
#endif
#ifndef PONTE_TLS
#define PONTE_TLS 1
#endif
#ifndef WIFI_SSID_2
#define WIFI_SSID_2 ""
#define WIFI_PASSWORD_2 ""
#endif

// ---------- protocolo ----------
enum : uint8_t { F_JOB = 1, F_ACK = 2, F_NACK = 3, F_STATUS = 4, F_PROBE = 5, F_SET_IP = 6, F_PARTE = 7 };
enum : uint8_t { E_SEM_IMPRESSORA = 1, E_RECUSADA = 2, E_ESCRITA = 3 };
enum : uint8_t { P_OK = 0, P_ACABANDO = 1, P_SEM = 2, P_DESCONHECIDO = 255 };

const uint16_t PORTA_IMPRESSORA = 9100;
const uint32_t WIFI_TENTATIVA_MS = 15000;
const uint32_t PORTAL_MS = 300000;
const IPAddress IP_PORTAL(192, 168, 77, 1);
const uint32_t STATUS_MS = 30000;
const uint32_t SEM_WIFI_REINICIA_MS = 90000;
const uint32_t WDT_MS = 30000;
const int LOTE_VARREDURA = 8;           // sockets simultâneos (lwIP tem poucos)
const uint32_t VARREDURA_TIMEOUT_MS = 250;

WebSocketsClient ws;
Preferences nvs;
WiFiClient imp;  // conexão com a impressora durante um job

uint32_t ipImpressora = 0;  // host order
bool impressoraOnline = false;
uint8_t papel = P_DESCONHECIDO;
bool wsUp = false;
bool redescobrir = false;
bool sondarPedido = false;
uint8_t falhasSeguidas = 0, offlineSeguidos = 0;
uint32_t ultimoStatus = 0, semWifiDesde = 0;

// job em andamento (pode chegar em vários frames PARTE + JOB)
uint32_t jobAtual = 0;
bool jobAberto = false, jobDescartar = false, jobFalhou = false;
uint8_t jobErro = 0;

// ids já impressos: um JOB reenviado (ACK perdido numa queda) não imprime de novo
uint32_t feitos[32];
uint8_t feitosIdx = 0;

// ---------- utilitários ----------
static inline uint32_t lerU32(const uint8_t* p) {
  return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) | ((uint32_t)p[2] << 8) | p[3];
}
static inline void escreverU32(uint8_t* p, uint32_t v) {
  p[0] = v >> 24; p[1] = v >> 16; p[2] = v >> 8; p[3] = v;
}
static IPAddress paraIp(uint32_t v) { return IPAddress(v >> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255); }
static uint32_t deIp(const IPAddress& ip) { return ((uint32_t)ip[0] << 24) | ((uint32_t)ip[1] << 16) | ((uint32_t)ip[2] << 8) | ip[3]; }

bool jaFeito(uint32_t id) {
  for (uint32_t f : feitos) if (f == id) return true;
  return false;
}
void marcarFeito(uint32_t id) {
  feitos[feitosIdx] = id;
  feitosIdx = (feitosIdx + 1) % 32;
}

void enviarFrame(uint8_t tipo, uint32_t id, const uint8_t* payload = nullptr, size_t len = 0) {
  if (!wsUp) return;
  uint8_t buf[64];
  buf[0] = tipo;
  escreverU32(buf + 1, id);
  if (len) memcpy(buf + 5, payload, len);
  ws.sendBIN(buf, 5 + len);
}

void enviarStatus() {
  uint8_t p[21 + sizeof(FW_VERSAO)];
  escreverU32(p, ipImpressora);
  p[4] = impressoraOnline ? 1 : 0;
  p[5] = papel;
  p[6] = (uint8_t)(int8_t)WiFi.RSSI();
  escreverU32(p + 7, ESP.getFreeHeap());
  escreverU32(p + 11, millis() / 1000);
  esp_read_mac(p + 15, ESP_MAC_WIFI_STA);  // do eFuse: vale mesmo antes do Wi-Fi subir
  memcpy(p + 21, FW_VERSAO, sizeof(FW_VERSAO) - 1);
  enviarFrame(F_STATUS, 0, p, 21 + sizeof(FW_VERSAO) - 1);
  ultimoStatus = millis();
}

// ---------- impressora ----------
// DLE EOT 4 (sensor de papel). Byte de status ESC/POS válido: bits 1 e 4 em 1, bits 0 e 7 em 0.
bool sondar(uint32_t ip, uint8_t& papelOut, bool& respondeu) {
  respondeu = false;
  papelOut = P_DESCONHECIDO;
  if (!ip) return false;
  WiFiClient c;
  if (!c.connect(paraIp(ip), PORTA_IMPRESSORA, 400)) return false;
  c.setNoDelay(true);
  static const uint8_t DLE_EOT_4[] = {0x10, 0x04, 0x04};
  c.write(DLE_EOT_4, sizeof DLE_EOT_4);
  uint32_t ini = millis();
  while (!c.available() && millis() - ini < 500) delay(5);
  if (c.available()) {
    uint8_t b = c.read();
    if ((b & 0x93) == 0x12) {
      respondeu = true;
      papelOut = (b & 0x60) ? P_SEM : (b & 0x0C) ? P_ACABANDO : P_OK;
    }
  }
  c.stop();
  return true;  // porta 9100 aberta
}

// Varre o /24 local com connect não bloqueante em lotes. Prefere quem responde status ESC/POS.
uint32_t varrerRede() {
  IPAddress eu = WiFi.localIP(), gw = WiFi.gatewayIP();
  uint32_t base = deIp(eu) & 0xFFFFFF00;
  uint32_t candidato = 0;
  Serial.printf("procurando impressora em %u.%u.%u.0/24\n", eu[0], eu[1], eu[2]);

  for (int ini = 1; ini < 255; ini += LOTE_VARREDURA) {
    esp_task_wdt_reset();
    int fds[LOTE_VARREDURA];
    uint32_t ips[LOTE_VARREDURA];
    int n = 0;
    for (int h = ini; h < ini + LOTE_VARREDURA && h < 255; h++) {
      if (h == eu[3] || (base | h) == deIp(gw)) continue;
      int fd = socket(AF_INET, SOCK_STREAM, 0);
      if (fd < 0) continue;
      fcntl(fd, F_SETFL, fcntl(fd, F_GETFL, 0) | O_NONBLOCK);
      sockaddr_in a = {};
      a.sin_family = AF_INET;
      a.sin_port = htons(PORTA_IMPRESSORA);
      a.sin_addr.s_addr = htonl(base | h);
      connect(fd, (sockaddr*)&a, sizeof a);
      fds[n] = fd;
      ips[n] = base | h;
      n++;
    }

    bool aberto[LOTE_VARREDURA] = {false};
    uint32_t limite = millis() + VARREDURA_TIMEOUT_MS;
    int pendentes = n;
    while (pendentes > 0 && (int32_t)(limite - millis()) > 0) {
      fd_set w;
      FD_ZERO(&w);
      int maxfd = -1;
      for (int i = 0; i < n; i++)
        if (fds[i] >= 0) { FD_SET(fds[i], &w); if (fds[i] > maxfd) maxfd = fds[i]; }
      if (maxfd < 0) break;
      timeval tv = {0, 20000};
      if (select(maxfd + 1, nullptr, &w, nullptr, &tv) <= 0) continue;
      for (int i = 0; i < n; i++) {
        if (fds[i] < 0 || !FD_ISSET(fds[i], &w)) continue;
        int err = 0;
        socklen_t l = sizeof err;
        getsockopt(fds[i], SOL_SOCKET, SO_ERROR, &err, &l);
        aberto[i] = (err == 0);
        close(fds[i]);
        fds[i] = -1;
        pendentes--;
      }
    }
    for (int i = 0; i < n; i++) if (fds[i] >= 0) close(fds[i]);

    for (int i = 0; i < n; i++) {
      if (!aberto[i]) continue;
      uint8_t p;
      bool respondeu;
      if (sondar(ips[i], p, respondeu) && respondeu) {
        Serial.printf("impressora ESC/POS em %s\n", paraIp(ips[i]).toString().c_str());
        return ips[i];
      }
      if (!candidato) candidato = ips[i];
    }
  }
  if (candidato) Serial.printf("porta 9100 aberta em %s\n", paraIp(candidato).toString().c_str());
  return candidato;
}

void salvarIpImpressora(uint32_t ip) {
  if (ip == ipImpressora) return;
  ipImpressora = ip;
  nvs.putUInt("imp", ip);
}

// Confere a impressora atual; se sumiu e "procurar" estiver ligado, varre a rede.
void atualizarImpressora(bool procurar) {
  bool respondeu;
  impressoraOnline = sondar(ipImpressora, papel, respondeu);
  if (!impressoraOnline && procurar) {
    uint32_t achado = varrerRede();
    if (achado) {
      salvarIpImpressora(achado);
      impressoraOnline = sondar(achado, papel, respondeu);
    }
  }
}

// ---------- jobs ----------
void abortarJob() {
  if (jobAberto) imp.stop();
  jobAberto = false;
}

void receberPedaco(uint8_t tipo, uint32_t id, const uint8_t* dados, size_t len) {
  bool fim = (tipo == F_JOB);

  if (!jobAberto || id != jobAtual) {
    abortarJob();  // pedaço de job anterior que não terminou: descarta
    jobAtual = id;
    jobAberto = true;
    jobFalhou = false;
    jobDescartar = jaFeito(id);
    if (!jobDescartar) {
      if (!ipImpressora) {
        jobFalhou = true;
        jobErro = E_SEM_IMPRESSORA;
      } else if (!imp.connect(paraIp(ipImpressora), PORTA_IMPRESSORA, 1500)) {
        jobFalhou = true;
        jobErro = E_RECUSADA;
      } else {
        imp.setNoDelay(true);
      }
    }
  }

  if (!jobDescartar && !jobFalhou && len) {
    if (imp.write(dados, len) != len) {
      jobFalhou = true;
      jobErro = E_ESCRITA;
    }
  }

  if (!fim) return;

  if (!jobDescartar) imp.stop();  // close gracioso: os bytes pendentes saem antes do FIN
  jobAberto = false;

  if (jobDescartar || !jobFalhou) {
    if (!jobDescartar) marcarFeito(id);
    falhasSeguidas = 0;
    enviarFrame(F_ACK, id);
  } else {
    enviarFrame(F_NACK, id, &jobErro, 1);
    impressoraOnline = false;
    if (++falhasSeguidas >= 2) redescobrir = true;
    Serial.printf("job %u falhou (erro %u)\n", id, jobErro);
  }
}

// ---------- WebSocket ----------
void onWs(WStype_t tipo, uint8_t* payload, size_t len) {
  switch (tipo) {
    case WStype_CONNECTED:
      wsUp = true;
      Serial.println("API conectada");
      enviarStatus();
      break;
    case WStype_DISCONNECTED:
      if (wsUp) Serial.println("API desconectada");
      wsUp = false;
      abortarJob();
      break;
    case WStype_BIN: {
      if (len < 5) return;
      uint8_t t = payload[0];
      uint32_t id = lerU32(payload + 1);
      if (t == F_JOB || t == F_PARTE) {
        receberPedaco(t, id, payload + 5, len - 5);
      } else if (t == F_PROBE) {
        sondarPedido = true;
      } else if (t == F_SET_IP && len >= 9) {
        uint32_t ip = lerU32(payload + 5);
        if (ip) {
          salvarIpImpressora(ip);
          sondarPedido = true;
        } else {
          redescobrir = true;
        }
      }
      break;
    }
    default:
      break;
  }
}

RTC_NOINIT_ATTR uint32_t pedidoPortal;  // sobrevive ao ESP.restart(): abre o portal com o Wi-Fi zerado
const uint32_t MAGICO_PORTAL = 0x504F5254;

void abrirPortalLimpo() {
  pedidoPortal = MAGICO_PORTAL;
  Serial.println("reiniciando direto no portal");
  Serial.flush();
  ESP.restart();
}

// Comandos pela USB (115200), aceitos em qualquer estado (conectando, portal ou online).
// Respostas para máquina começam com "@" (usadas pelo painel via Web Serial):
//   scan                 -> "@rede\t<ssid>\t<rssi>" por rede e "@fim"
//   wifi\t<ssid>\t<senha> -> grava na NVS, "@salvo" e reinicia; no boot sai "@wifi-ok <ip>" ou "@wifi-falhou"
//   portal               -> reinicia direto no portal
void comandoSerial() {
  static char linha[200];
  static uint8_t n = 0;
  while (Serial.available()) {
    char c = Serial.read();
    if (c != '\n' && c != '\r') {
      if (n < sizeof linha - 1) linha[n++] = c;
      continue;
    }
    linha[n] = 0;
    n = 0;
    if (!strcmp(linha, "portal")) {
      abrirPortalLimpo();
    } else if (!strcmp(linha, "scan")) {
      if (WiFi.getMode() == WIFI_AP) WiFi.mode(WIFI_AP_STA);
      else if (WiFi.status() != WL_CONNECTED) WiFi.disconnect(false, false);  // scan não roda conectando
      int q = WiFi.scanNetworks();
      for (int i = 0; i < q; i++)
        if (WiFi.SSID(i).length()) Serial.printf("@rede\t%s\t%d\n", WiFi.SSID(i).c_str(), WiFi.RSSI(i));
      WiFi.scanDelete();
      Serial.println("@fim");
    } else if (!strncmp(linha, "wifi\t", 5)) {
      char* ssid = linha + 5;
      char* senha = strchr(ssid, '\t');
      if (senha) *senha++ = 0;
      if (!*ssid) {
        Serial.println("@erro ssid vazio");
        continue;
      }
      nvs.putString("ssid", ssid);
      nvs.putString("pass", senha ? senha : "");
      Serial.println("@salvo");
      Serial.flush();
      delay(200);
      ESP.restart();
    }
  }
}

// ---------- Wi-Fi + portal ----------
volatile uint8_t motivoQueda = 0;

bool tentarWifi(const char* ssid, const char* senha) {
  if (!ssid || !*ssid) return false;
  motivoQueda = 0;
  Serial.printf("Wi-Fi: tentando \"%s\"\n", ssid);
  WiFi.begin(ssid, senha);
  uint32_t ini = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - ini < WIFI_TENTATIVA_MS) {
    digitalWrite(LED_PIN, (millis() / 100) % 2);
    esp_task_wdt_reset();
    comandoSerial();
    delay(50);
  }
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.printf("Wi-Fi: falhou (status %d, motivo %u)\n", WiFi.status(), motivoQueda);
  Serial.printf("@wifi-falhou\t%s\t%u\n", ssid, motivoQueda);
  WiFi.disconnect(false, false);
  delay(100);
  return false;
}

// Portal aberto (sem senha): só existe enquanto o ESP32 está sem Wi-Fi, e nada sensível passa
// por ele (o token só trafega no TLS com a API). O celular abre a página sozinho (captive portal).
void portal() {
  Serial.println("Wi-Fi indisponível: abrindo portal FoodHope-Ponte (http://192.168.77.1)");
  WiFi.disconnect(false, false);
  WiFi.mode(WIFI_STA);
  int n = WiFi.scanNetworks();  // antes de subir o AP, para ele não cair durante a busca
  String opcoes;
  for (int i = 0; i < n; i++) {
    String s = WiFi.SSID(i);
    Serial.printf("  rede vista: \"%s\" canal %d %d dBm\n", s.c_str(), WiFi.channel(i), WiFi.RSSI(i));
    if (!s.length() || opcoes.indexOf("\"" + s + "\"") >= 0) continue;
    opcoes += "<option value=\"" + s + "\">" + s + " (" + String(WiFi.RSSI(i)) + " dBm)</option>";
  }
  WiFi.scanDelete();

  // AP limpo: sem gravar na flash, HT20 (alguns celulares não associam em HT40), IP fixo antes de subir.
  WiFi.persistent(false);
  WiFi.mode(WIFI_OFF);
  delay(100);
  WiFi.mode(WIFI_AP);
  esp_wifi_set_bandwidth(WIFI_IF_AP, WIFI_BW_HT20);
  esp_wifi_set_protocol(WIFI_IF_AP, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);
  esp_wifi_set_event_mask(WIFI_EVENT_MASK_NONE);  // libera o evento de probe request (diagnóstico)
  static uint32_t probes = 0;
  WiFi.onEvent([](WiFiEvent_t e, WiFiEventInfo_t info) {
    if (e == ARDUINO_EVENT_WIFI_AP_PROBEREQRECVED) { probes++; return; }
    if (e == ARDUINO_EVENT_WIFI_AP_STACONNECTED) Serial.println("portal: aparelho conectou no AP");
    if (e == ARDUINO_EVENT_WIFI_AP_STAIPASSIGNED)
      Serial.printf("portal: IP entregue %s\n", IPAddress(info.wifi_ap_staipassigned.ip.addr).toString().c_str());
    if (e == ARDUINO_EVENT_WIFI_AP_STADISCONNECTED)
      Serial.printf("portal: aparelho saiu do AP (motivo %u)\n", info.wifi_ap_stadisconnected.reason);
  });
  WiFi.softAPConfig(IP_PORTAL, IP_PORTAL, IPAddress(255, 255, 255, 0));
  bool apOk = WiFi.softAP("FoodHope-Ponte", nullptr, 6, 0, 4);
  delay(500);
  if (WiFi.softAPIP() != IP_PORTAL) WiFi.softAPConfig(IP_PORTAL, IP_PORTAL, IPAddress(255, 255, 255, 0));
  WiFi.setSleep(false);
  Serial.printf("portal: AP %s em %s canal 6, tx %d, %d redes na lista\n", apOk ? "no ar" : "FALHOU",
                WiFi.softAPIP().toString().c_str(), (int)WiFi.getTxPower(), n);
  DNSServer dns;
  dns.setErrorReplyCode(DNSReplyCode::NoError);
  dns.start(53, "*", WiFi.softAPIP());
  WebServer srv(80);

  const String pagina =
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
      "<title>Food Hope</title><body style='font-family:sans-serif;max-width:22rem;margin:2rem auto;padding:0 1rem'>"
      "<h2>Ponte de impressão</h2><p>Escolha o Wi-Fi do restaurante (2,4 GHz).</p>"
      "<form method=post action=/salvar><p>Rede<br><select name=s style='width:100%;padding:.5rem'>" + opcoes +
      "</select></p><p>Ou digite o nome<br><input name=m style='width:100%;padding:.5rem' placeholder='opcional'></p>"
      "<p>Senha<br><input name=p type=password style='width:100%;padding:.5rem'></p>"
      "<button style='width:100%;padding:.8rem;font-size:1rem'>Conectar</button></form>";

  auto mostrar = [&]() {
    Serial.printf("portal: GET %s -> pagina\n", srv.uri().c_str());
    srv.send(200, "text/html; charset=utf-8", pagina);
  };
  auto redirecionar = [&]() {
    Serial.printf("portal: %s%s -> redireciona\n", srv.hostHeader().c_str(), srv.uri().c_str());
    srv.sendHeader("Location", "http://192.168.77.1/");
    srv.send(302, "text/plain", "");
  };
  srv.on("/", mostrar);
  srv.on("/generate_204", redirecionar);         // Android
  srv.on("/gen_204", redirecionar);
  srv.on("/hotspot-detect.html", mostrar);       // iPhone/Mac
  srv.on("/connecttest.txt", redirecionar);      // Windows
  srv.on("/ncsi.txt", redirecionar);
  srv.onNotFound(redirecionar);
  srv.on("/salvar", HTTP_POST, [&]() {
    String ssid = srv.arg("m");
    ssid.trim();
    if (!ssid.length()) ssid = srv.arg("s");
    Serial.printf("portal: salvo Wi-Fi \"%s\"\n", ssid.c_str());
    nvs.putString("ssid", ssid);
    nvs.putString("pass", srv.arg("p"));
    srv.send(200, "text/html; charset=utf-8",
             "<meta charset=utf-8><body style='font-family:sans-serif;padding:2rem'>Salvo. O ESP32 vai "
             "reiniciar e conectar em <b>" + ssid + "</b>. Pode fechar esta página.");
    delay(1000);
    ESP.restart();
  });
  srv.begin();

  uint32_t ultimoUso = millis();
  while (millis() - ultimoUso < PORTAL_MS) {
    dns.processNextRequest();
    srv.handleClient();
    if (WiFi.softAPgetStationNum() > 0) ultimoUso = millis();  // não fecha com alguém conectado
    static uint32_t ultimoLog = 0;
    if (millis() - ultimoLog > 10000) {
      ultimoLog = millis();
      Serial.printf("portal: %u aparelho(s) no AP, %u probes recebidos\n", WiFi.softAPgetStationNum(), probes);
    }
    digitalWrite(LED_PIN, (millis() / 1000) % 2 ? HIGH : (millis() / 100) % 2);
    esp_task_wdt_reset();
    comandoSerial();
    delay(2);
  }
  Serial.println("portal: 5 min sem uso, reiniciando para tentar as redes de novo");
  ESP.restart();  // ninguém configurou: tenta as redes de novo
}

void conectarWifi() {
  WiFi.onEvent([](WiFiEvent_t, WiFiEventInfo_t info) { motivoQueda = info.wifi_sta_disconnected.reason; },
               ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // sem power-save: latência mínima
  WiFi.setAutoReconnect(true);
  String ssid = nvs.getString("ssid", ""), senha = nvs.getString("pass", "");
  if (tentarWifi(ssid.c_str(), senha.c_str())) return;
  if (tentarWifi(WIFI_SSID, WIFI_PASSWORD)) return;
  if (tentarWifi(WIFI_SSID_2, WIFI_PASSWORD_2)) return;
  portal();
}

// ---------- LED: rápido = sem Wi-Fi, médio = sem API, lento = sem impressora, aceso = pronto ----------
void led() {
  uint32_t t = millis();
  bool on;
  if (WiFi.status() != WL_CONNECTED) on = (t / 100) % 2;
  else if (!wsUp) on = (t / 400) % 2;
  else if (!impressoraOnline) on = (t / 1000) % 2;
  else on = true;
  digitalWrite(LED_PIN, on);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  esp_task_wdt_config_t wdt = {.timeout_ms = WDT_MS, .idle_core_mask = 0, .trigger_panic = true};
  if (esp_task_wdt_reconfigure(&wdt) != ESP_OK) esp_task_wdt_init(&wdt);
  esp_task_wdt_add(nullptr);

  nvs.begin("ponte", false);
  ipImpressora = nvs.getUInt("imp", 0);

  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  pinMode(BOOT_PIN, INPUT_PULLUP);
  Serial.printf("\nFood Hope ponte %s  MAC %02X:%02X:%02X:%02X:%02X:%02X\n", FW_VERSAO, mac[0], mac[1],
                mac[2], mac[3], mac[4], mac[5]);
  uint32_t segurando = millis();
  while (digitalRead(BOOT_PIN) == LOW && millis() - segurando < 2000) delay(10);
  bool pedido = pedidoPortal == MAGICO_PORTAL;
  pedidoPortal = 0;
  if (pedido || digitalRead(BOOT_PIN) == LOW) {
    Serial.println(pedido ? "portal pedido pela USB" : "BOOT pressionado: abrindo portal para trocar o Wi-Fi");
    portal();
  }
  conectarWifi();
  Serial.printf("Wi-Fi ok: %s  RSSI %d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  Serial.printf("@wifi-ok\t%s\t%s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());

  atualizarImpressora(true);

  static char auth[128];
  snprintf(auth, sizeof auth, "Authorization: Bearer %s", PONTE_TOKEN);
  ws.setExtraHeaders(auth);
#if PONTE_TLS
  ws.beginSslWithCA(PONTE_HOST, PONTE_PORTA, "/ponte-impressora", CA_ROOTS);
#else
  ws.begin(PONTE_HOST, PONTE_PORTA, "/ponte-impressora");
#endif
  ws.onEvent(onWs);
  ws.setReconnectInterval(1000);
  ws.enableHeartbeat(15000, 3000, 2);
}

void loop() {
  esp_task_wdt_reset();
  comandoSerial();
  ws.loop();
  led();
  uint32_t agora = millis();

  if (WiFi.status() != WL_CONNECTED) {
    if (!semWifiDesde) semWifiDesde = agora;
    if (agora - semWifiDesde > SEM_WIFI_REINICIA_MS) ESP.restart();  // volta pelo fluxo completo (portal)
    return;
  }
  semWifiDesde = 0;

  if (jobAberto) return;  // nada de sondar a impressora no meio de um cupom

  if (redescobrir) {
    redescobrir = false;
    falhasSeguidas = 0;
    impressoraOnline = false;
    salvarIpImpressora(0);
    atualizarImpressora(true);
    enviarStatus();
  } else if (sondarPedido || agora - ultimoStatus >= STATUS_MS) {
    sondarPedido = false;
    ultimoStatus = agora;
    bool antes = impressoraOnline;
    uint8_t papelAntes = papel;
    // impressora sumiu por ~1,5 min (desligada ou trocou de IP no DHCP): procura de novo
    atualizarImpressora(!ipImpressora || offlineSeguidos >= 3);
    offlineSeguidos = impressoraOnline ? 0 : offlineSeguidos + 1;
    if (offlineSeguidos > 3) offlineSeguidos = 0;
    enviarStatus();
    if (antes != impressoraOnline || papelAntes != papel)
      Serial.printf("impressora %s, papel %u\n", impressoraOnline ? "online" : "offline", papel);
  }
}
