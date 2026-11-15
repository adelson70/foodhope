// Food Hope — ponte de impressão ESP32
//
// Liga na tomada e funciona:
//   1. Entra no Wi-Fi conhecido (salvo > restaurante > alternativo). Se nenhum conectar (ou o Wi-Fi
//      cair por mais de 30 s), abre a rede aberta "FoodHope-Ponte": o celular que entrar nela recebe
//      sozinho a tela para escolher o Wi-Fi (captive portal, http://192.168.77.1). Assim que conecta
//      no Wi-Fi, a FoodHope-Ponte some. Segurar BOOT 2 s ao ligar abre a tela por 5 min mesmo com Wi-Fi.
//   2. Acha a impressora térmica (IP salvo; senão varre o /24 na porta 9100, em lotes curtos
//      intercalados com o WebSocket, para nunca deixar a API sem resposta).
//   3. Abre WSS de saída autenticado para a API e repassa os cupons ESC/POS para a impressora.
//   Configurar não depende do servidor. Também dá pela USB (115200, comandos de texto).
//
// Protocolo binário com a API (espelhado em api/src/modules/impressora/ponte-protocolo.ts):
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

#define FW_VERSAO "1.1.0"

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
enum Canal : uint8_t { C_USB };  // origem de um comando de texto (USB)
enum : uint8_t { P_OK = 0, P_ACABANDO = 1, P_SEM = 2, P_DESCONHECIDO = 255 };

const uint16_t PORTA_IMPRESSORA = 9100;
const uint32_t WIFI_TENTATIVA_MS = 15000;
const uint32_t WIFI_TESTE_MS = 20000;
const uint32_t PORTAL_MS = 300000;
const IPAddress IP_PORTAL(192, 168, 77, 1);
const uint32_t STATUS_MS = 30000;
const uint32_t WDT_MS = 30000;
// Sem Wi-Fi por este tempo (com ele já tendo funcionado), abre a FoodHope-Ponte para reconfigurar.
const uint32_t SEM_WIFI_PORTAL_MS = 30000;
const int LOTE_VARREDURA = 6;            // sockets simultâneos (lwIP tem poucos e a tabela ARP é pequena)
const uint32_t VARREDURA_TIMEOUT_MS = 350;

const uint32_t WIFI_RETENTA_MS = 60000;   // sem Wi-Fi: tenta as redes conhecidas de novo a cada 1 min

WebSocketsClient ws;
Preferences nvs;
WiFiClient imp;  // conexão com a impressora durante um job

uint32_t ipImpressora = 0;  // host order
bool impressoraOnline = false;
uint8_t papel = P_DESCONHECIDO;
bool wsUp = false;
bool wsIniciado = false;
bool redescobrir = false;
bool sondarPedido = false;
uint8_t falhasSeguidas = 0, offlineSeguidos = 0;
uint32_t ultimoStatus = 0, semWifiDesde = 0, wsDesde = 0;
const char *tentandoSsid = nullptr, *tentandoSenha = nullptr;  // rede sendo tentada no boot

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
  uint8_t buf[96];
  if (len > sizeof buf - 5) return;
  buf[0] = tipo;
  escreverU32(buf + 1, id);
  if (len) memcpy(buf + 5, payload, len);
  ws.sendBIN(buf, 5 + len);
}

void enviarStatus() {
  uint8_t p[21 + sizeof(FW_VERSAO) + 33];
  escreverU32(p, ipImpressora);
  p[4] = impressoraOnline ? 1 : 0;
  p[5] = papel;
  p[6] = (uint8_t)(int8_t)WiFi.RSSI();
  escreverU32(p + 7, ESP.getFreeHeap());
  escreverU32(p + 11, millis() / 1000);
  esp_read_mac(p + 15, ESP_MAC_WIFI_STA);  // do eFuse: vale mesmo antes do Wi-Fi subir
  memcpy(p + 21, FW_VERSAO, sizeof(FW_VERSAO) - 1);
  // depois da versão: byte 0 + nome da rede Wi-Fi (o painel mostra; a API antiga ignora)
  size_t n = 21 + sizeof(FW_VERSAO) - 1;
  p[n++] = 0;
  String rede = WiFi.SSID();
  size_t l = min((size_t)32, (size_t)rede.length());
  memcpy(p + n, rede.c_str(), l);
  n += l;
  enviarFrame(F_STATUS, 0, p, n);
  ultimoStatus = millis();
}

String ssidAtual, senhaAtual;  // rede em uso, para voltar a ela se um teste de Wi-Fi falhar

// ---------- respostas de comandos (USB) ----------
void responder(Canal, const char* fmt, ...) {
  char buf[160];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(buf, sizeof buf - 1, fmt, ap);
  va_end(ap);
  strcat(buf, "\n");
  Serial.print(buf);
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
  while (!c.available() && millis() - ini < 300) delay(5);
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

// Varredura do /24 em passos: cada chamada de passoVarredura() testa um lote e volta ao loop,
// que atende o WebSocket entre os lotes. Prefere quem responde status ESC/POS; senão, o primeiro
// host com a porta 9100 aberta (ex.: emulador).
struct {
  bool ativa = false;
  int proximo = 1;
  uint32_t base = 0, eu = 0, gw = 0, candidato = 0;
  uint16_t abertos = 0, falhasSocket = 0;
  uint32_t inicio = 0;
} varredura;

void iniciarVarredura() {
  IPAddress eu = WiFi.localIP();
  varredura.ativa = true;
  varredura.proximo = 1;
  varredura.eu = deIp(eu);
  varredura.gw = deIp(WiFi.gatewayIP());
  varredura.base = varredura.eu & 0xFFFFFF00;
  varredura.candidato = 0;
  varredura.abertos = 0;
  varredura.falhasSocket = 0;
  varredura.inicio = millis();
  Serial.printf("procurando impressora em %u.%u.%u.0/24\n", eu[0], eu[1], eu[2]);
}

void salvarIpImpressora(uint32_t ip) {
  if (ip == ipImpressora) return;
  ipImpressora = ip;
  nvs.putUInt("imp", ip);
}

void terminarVarredura(uint32_t achado, bool respondeu) {
  varredura.ativa = false;
  Serial.printf("varredura: %u ms, %u porta(s) 9100 aberta(s), %u socket(s) sem recurso -> %s%s\n",
                (unsigned)(millis() - varredura.inicio), varredura.abertos, varredura.falhasSocket,
                achado ? paraIp(achado).toString().c_str() : "nada",
                achado ? (respondeu ? " (ESC/POS)" : " (porta aberta)") : "");
  if (achado) {
    salvarIpImpressora(achado);
    bool r;
    impressoraOnline = sondar(achado, papel, r);
  }
  enviarStatus();
}

void passoVarredura() {
  int fds[LOTE_VARREDURA];
  uint32_t ips[LOTE_VARREDURA];
  int n = 0;
  while (n < LOTE_VARREDURA && varredura.proximo < 255) {
    uint32_t ip = varredura.base | varredura.proximo++;
    if (ip == varredura.eu || ip == varredura.gw) continue;
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
      varredura.falhasSocket++;
      varredura.proximo--;  // tenta este host de novo no próximo lote
      break;
    }
    fcntl(fd, F_SETFL, fcntl(fd, F_GETFL, 0) | O_NONBLOCK);
    sockaddr_in a = {};
    a.sin_family = AF_INET;
    a.sin_port = htons(PORTA_IMPRESSORA);
    a.sin_addr.s_addr = htonl(ip);
    connect(fd, (sockaddr*)&a, sizeof a);
    fds[n] = fd;
    ips[n] = ip;
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
    varredura.abertos++;
    Serial.printf("varredura: 9100 aberta em %s\n", paraIp(ips[i]).toString().c_str());
    uint8_t p;
    bool respondeu;
    if (sondar(ips[i], p, respondeu) && respondeu) {
      terminarVarredura(ips[i], true);
      return;
    }
    if (!varredura.candidato) varredura.candidato = ips[i];
  }

  if (varredura.proximo >= 255) terminarVarredura(varredura.candidato, false);
}

// Confere a impressora atual (rápido). Se sumiu e "procurar" estiver ligado, começa a varredura.
void atualizarImpressora(bool procurar) {
  bool respondeu;
  impressoraOnline = sondar(ipImpressora, papel, respondeu);
  if (!impressoraOnline && procurar && !varredura.ativa) iniciarVarredura();
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
      wsDesde = millis();
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

// ---------- Wi-Fi ----------
volatile uint8_t motivoQueda = 0;

// Motivos de queda do Wi-Fi (esp_wifi_types.h) em texto curto para o painel.
const char* textoMotivo(uint8_t m) {
  switch (m) {
    case 2: case 15: case 202: case 204: case 205: case 210: return "senha incorreta";
    case 201: return "rede nao encontrada (precisa ser 2,4 GHz)";
    case 203: return "roteador recusou a associacao";
    case 200: case 6: case 7: return "sinal fraco ou roteador ocupado";
    default: return "falha ao conectar";
  }
}

RTC_NOINIT_ATTR uint32_t pedidoPortal;  // sobrevive ao ESP.restart(): abre o portal direto
const uint32_t MAGICO_PORTAL = 0x504F5254;
bool portalAtivo = false;

void abrirPortalLimpo() {
  pedidoPortal = MAGICO_PORTAL;
  Serial.println("reiniciando direto no portal");
  Serial.flush();
  delay(300);
  ESP.restart();
}

void processarEntradas();
void servirPortal();

// Testa uma rede na hora, sem perder a atual: só grava se conectar. Responde no canal do pedido.
// Sucesso: grava e reinicia (sobe tudo limpo na rede nova). Falha: volta para a rede anterior.
void testarWifi(Canal canal, const String& ssid, const String& senha) {
  responder(canal, "@testando\t%s", ssid.c_str());
  bool tinhaRede = WiFi.status() == WL_CONNECTED;
  if (wsIniciado) ws.disconnect();
  WiFi.mode(portalAtivo ? WIFI_AP_STA : WIFI_STA);
  WiFi.disconnect(false, false);
  delay(100);
  motivoQueda = 0;
  WiFi.begin(ssid.c_str(), senha.c_str());
  uint32_t ini = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - ini < WIFI_TESTE_MS) {
    esp_task_wdt_reset();
    // senha errada costuma aparecer em poucos segundos: não espera os 20 s
    if (motivoQueda && millis() - ini > 4000 && WiFi.status() != WL_CONNECTED) break;
    delay(50);
  }
  if (WiFi.status() == WL_CONNECTED) {
    nvs.putString("ssid", ssid);
    nvs.putString("pass", senha);
    responder(canal, "@salvo");
    responder(canal, "@wifi-ok\t%s\t%s", ssid.c_str(), WiFi.localIP().toString().c_str());
    Serial.printf("Wi-Fi: \"%s\" ok pelo teste, reiniciando\n", ssid.c_str());
    delay(1500);  // dá tempo da resposta chegar ao celular
    ESP.restart();
  }
  uint8_t m = motivoQueda ? motivoQueda : 201;
  responder(canal, "@wifi-falhou\t%s\t%u\t%s", ssid.c_str(), m, textoMotivo(m));
  Serial.printf("Wi-Fi: teste de \"%s\" falhou (%u)\n", ssid.c_str(), m);
  WiFi.disconnect(false, false);
  motivoQueda = 0;
  if (tinhaRede && ssidAtual.length()) WiFi.begin(ssidAtual.c_str(), senhaAtual.c_str());
  else if (tentandoSsid) WiFi.begin(tentandoSsid, tentandoSenha);  // retoma a tentativa do boot
}

// Comandos de texto (uma linha), pela USB. Respostas para máquina começam com "@":
//   estado                -> "@estado\t<ssid ou ->\t<ip>\t<api 0/1>\t<impressora>\t<online 0/1>\t<versao>"
//   scan                  -> "@rede\t<ssid>\t<rssi>" por rede e "@fim"
//   wifi\t<ssid>\t<senha> -> "@testando", depois "@salvo"+"@wifi-ok\t<ssid>\t<ip>" (e reinicia)
//                            ou "@wifi-falhou\t<ssid>\t<motivo>\t<texto>"
//   portal                -> reinicia direto no portal
//   impressora            -> procura a impressora de novo na rede
// Separador: TAB, ou "|" (para digitar em apps de terminal no celular).
void executarComando(Canal canal, char* linha) {
  char* sep = strchr(linha, '\t') ? (char*)"\t" : (char*)"|";
  char* cmd = strtok(linha, sep);
  if (!cmd) return;
  char* a1 = strtok(nullptr, sep);
  char* a2 = strtok(nullptr, "");  // a senha pode conter o separador

  if (!strcmp(cmd, "estado")) {
    responder(canal, "@estado\t%s\t%s\t%d\t%s\t%d\t%s", WiFi.status() == WL_CONNECTED ? WiFi.SSID().c_str() : "-",
              WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : "-", wsUp ? 1 : 0,
              ipImpressora ? paraIp(ipImpressora).toString().c_str() : "-", impressoraOnline ? 1 : 0, FW_VERSAO);
  } else if (!strcmp(cmd, "scan")) {
    if (WiFi.getMode() == WIFI_AP) WiFi.mode(WIFI_AP_STA);
    else if (WiFi.status() != WL_CONNECTED) WiFi.disconnect(false, false);  // scan não roda conectando
    int q = WiFi.scanNetworks();
    for (int i = 0; i < q; i++)
      if (WiFi.SSID(i).length()) responder(canal, "@rede\t%s\t%d", WiFi.SSID(i).c_str(), WiFi.RSSI(i));
    WiFi.scanDelete();
    responder(canal, "@fim");
  } else if (!strcmp(cmd, "wifi")) {
    if (!a1 || !*a1) return responder(canal, "@erro\tssid vazio");
    testarWifi(canal, String(a1), String(a2 ? a2 : ""));
  } else if (!strcmp(cmd, "portal")) {
    abrirPortalLimpo();
  } else if (!strcmp(cmd, "impressora")) {
    redescobrir = true;
    responder(canal, "@ok");
  } else {
    responder(canal, "@erro\tcomando desconhecido");
  }
}

// Lê linhas da USB e executa; trata o resultado do app. Chamado no loop e em todas as esperas (Wi-Fi, portal).
void processarEntradas() {
  servirPortal();
  static char usb[200];
  static uint8_t nUsb = 0;
  while (Serial.available()) {
    char c = Serial.read();
    if (c != '\n' && c != '\r') {
      if (nUsb < sizeof usb - 1) usb[nUsb++] = c;
      continue;
    }
    usb[nUsb] = 0;
    nUsb = 0;
    if (usb[0]) executarComando(C_USB, usb);
  }

}

bool tentarWifi(const char* ssid, const char* senha) {
  if (!ssid || !*ssid) return false;
  motivoQueda = 0;
  Serial.printf("Wi-Fi: tentando \"%s\"\n", ssid);
  tentandoSsid = ssid;
  tentandoSenha = senha;
  WiFi.begin(ssid, senha);
  uint32_t ini = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - ini < WIFI_TENTATIVA_MS) {
    // alguém na rede FoodHope-Ponte: para de tentar (tentar outra rede muda o canal e derruba o celular)
    if (portalAtivo && WiFi.softAPgetStationNum() > 0) {
      WiFi.disconnect(false, false);
      while (WiFi.softAPgetStationNum() > 0) {
        esp_task_wdt_reset();
        processarEntradas();
        delay(50);
      }
      return false;
    }
    digitalWrite(LED_PIN, (millis() / 100) % 2);
    esp_task_wdt_reset();
    processarEntradas();
    delay(50);
  }
  tentandoSsid = tentandoSenha = nullptr;
  if (WiFi.status() == WL_CONNECTED) {
    ssidAtual = ssid;
    senhaAtual = senha;
    return true;
  }
  Serial.printf("Wi-Fi: falhou (status %d, motivo %u: %s)\n", WiFi.status(), motivoQueda, textoMotivo(motivoQueda));
  Serial.printf("@wifi-falhou\t%s\t%u\t%s\n", ssid, motivoQueda, textoMotivo(motivoQueda));
  WiFi.disconnect(false, false);
  delay(100);
  return false;
}

// ---------- portal "FoodHope-Ponte" (captive portal, não bloqueia) ----------
// Rede aberta: nada sensível passa por ela (o token só trafega no TLS com a API). Quem entra recebe
// a tela sozinho (Android, iPhone, Windows e Linux checam uma URL e caem no redirecionamento).
DNSServer dns;
WebServer srv(80);
String opcoesRedes;
int canalConhecida = 0;  // canal da rede salva/restaurante, se vista na última busca
uint32_t portalDesde = 0, portalJanela = 0, probes = 0;  // janela 0 = até o Wi-Fi conectar
enum : uint8_t { T_NADA, T_TESTANDO, T_OK, T_FALHOU } teste = T_NADA;
String testeSsid, testeSenha, testeIp;
uint8_t testeMotivo = 0;
uint32_t testeDesde = 0, reiniciarEm = 0;

String escaparHtml(const String& t) {
  String o;
  for (char c : t) {
    if (c == '<') o += "&lt;";
    else if (c == '>') o += "&gt;";
    else if (c == '"') o += "&quot;";
    else if (c == '&') o += "&amp;";
    else o += c;
  }
  return o;
}

String escaparJson(const String& t) {
  String o;
  for (char c : t) {
    if (c == '"' || c == '\\') o += '\\';
    if ((uint8_t)c >= 0x20) o += c;
  }
  return o;
}

void listarRedes() {
  int n = WiFi.scanNetworks();
  opcoesRedes = "";
  String salva = nvs.getString("ssid", "");
  canalConhecida = 0;
  for (int i = 0; i < n; i++) {
    String s = WiFi.SSID(i);
    if (!canalConhecida && s.length() && (s == salva || s == WIFI_SSID || s == WIFI_SSID_2))
      canalConhecida = WiFi.channel(i);
    if (!s.length() || opcoesRedes.indexOf("value=\"" + escaparHtml(s) + "\"") >= 0) continue;
    opcoesRedes += "<option value=\"" + escaparHtml(s) + "\">" + escaparHtml(s) + " (" + String(WiFi.RSSI(i)) +
                   " dBm)</option>";
  }
  WiFi.scanDelete();
}

const char PAGINA_JS[] PROGMEM = R"JS(
<script>
function ver(){fetch('/estado').then(r=>r.json()).then(e=>{var m=document.getElementById('m');
if(e.fase=='testando'){m.textContent='Conectando em "'+e.ssid+'"...';setTimeout(ver,1500);}
else if(e.fase=='ok'){m.innerHTML='<b style="color:#1a7f37">Conectado em "'+e.ssid+'"</b> ('+e.ip+'). O ESP32 vai reiniciar e já começa a imprimir. Pode fechar esta página.';}
else if(e.fase=='falhou'){m.innerHTML='<b style="color:#c62828">Não conectou em "'+e.ssid+'": '+e.motivo+'.</b> Confira a senha e tente de novo.';document.getElementById('f').style.display='block';}
}).catch(()=>setTimeout(ver,2000));}
function enviar(ev){ev.preventDefault();var f=document.getElementById('f');
fetch('/salvar',{method:'POST',body:new URLSearchParams(new FormData(f))}).then(()=>{f.style.display='none';ver();});}
</script>)JS";

void mostrarPagina() {
  String p;
  p.reserve(2500 + opcoesRedes.length());
  p += "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
       "<title>Food Hope - Wi-Fi da impressora</title>"
       "<body style='font-family:sans-serif;max-width:24rem;margin:1.5rem auto;padding:0 1rem'>"
       "<h2>Ponte de impressão</h2><p>Escolha o Wi-Fi do restaurante (o mesmo da impressora, 2,4 GHz).</p>";
  if (WiFi.status() == WL_CONNECTED)
    p += "<p style='color:#555'>Agora conectado em <b>" + escaparHtml(WiFi.SSID()) + "</b>.</p>";
  p += "<form id=f onsubmit='enviar(event)'><p>Rede<br><select name=s style='width:100%;padding:.6rem'>" +
       opcoesRedes +
       "</select></p><p>Ou digite o nome<br><input name=m style='width:100%;padding:.6rem' "
       "placeholder='opcional'></p><p>Senha<br><input name=p type=password style='width:100%;padding:.6rem'></p>"
       "<button style='width:100%;padding:.9rem;font-size:1rem'>Conectar</button></form>"
       "<p id=m></p><p><a href='/redes'>Procurar redes de novo</a></p>";
  p += FPSTR(PAGINA_JS);
  srv.send(200, "text/html; charset=utf-8", p);
}

void iniciarPortal(uint32_t janela) {
  if (portalAtivo) return;
  portalAtivo = true;
  teste = T_NADA;
  portalDesde = millis();
  portalJanela = janela;
  WiFi.persistent(false);
  WiFi.mode(WIFI_AP_STA);
  listarRedes();  // antes do AP subir, para ele não cair durante a busca
  // mesmo canal da rede conhecida (se estiver no ar): ao conectar nela o AP não muda de canal e
  // quem estiver no portal não cai
  String salva = nvs.getString("ssid", "");
  int canal = canalConhecida ? canalConhecida : 6;
  esp_wifi_set_bandwidth(WIFI_IF_AP, WIFI_BW_HT20);
  // potência menor no portal: picos de corrente no máximo derrubavam a associação nesta placa
  WiFi.setTxPower(WIFI_POWER_11dBm);
  WiFi.softAPConfig(IP_PORTAL, IP_PORTAL, IPAddress(255, 255, 255, 0));
  bool ok = WiFi.softAP("FoodHope-Ponte", nullptr, canal, 0, 4);
  if (WiFi.softAPIP() != IP_PORTAL) WiFi.softAPConfig(IP_PORTAL, IP_PORTAL, IPAddress(255, 255, 255, 0));
  dns.setErrorReplyCode(DNSReplyCode::NoError);
  dns.start(53, "*", IP_PORTAL);

  static bool rotas = false;  // o portal pode abrir e fechar várias vezes no mesmo boot
  if (rotas) {
    srv.begin();
    Serial.printf("portal: rede FoodHope-Ponte %s (canal %d, http://192.168.77.1)\n", ok ? "no ar" : "FALHOU",
                  WiFi.channel());
    return;
  }
  rotas = true;
  auto redirecionar = []() {
    srv.sendHeader("Location", "http://192.168.77.1/");
    srv.send(302, "text/plain", "");
  };
  srv.on("/", mostrarPagina);
  srv.on("/hotspot-detect.html", mostrarPagina);  // iPhone/Mac
  srv.on("/generate_204", redirecionar);         // Android
  srv.on("/gen_204", redirecionar);
  srv.on("/connecttest.txt", redirecionar);      // Windows
  srv.on("/ncsi.txt", redirecionar);
  srv.onNotFound(redirecionar);                   // Linux e o resto
  srv.on("/redes", []() {
    listarRedes();
    srv.sendHeader("Location", "/");
    srv.send(302, "text/plain", "");
  });
  srv.on("/estado", []() {
    const char* fase = teste == T_TESTANDO ? "testando" : teste == T_OK ? "ok" : teste == T_FALHOU ? "falhou" : "nada";
    srv.send(200, "application/json",
             String("{\"fase\":\"") + fase + "\",\"ssid\":\"" + escaparJson(testeSsid) + "\",\"ip\":\"" + testeIp +
                 "\",\"motivo\":\"" + textoMotivo(testeMotivo) + "\"}");
  });
  srv.on("/salvar", HTTP_POST, []() {
    String ssid = srv.arg("m");
    ssid.trim();
    if (!ssid.length()) ssid = srv.arg("s");
    if (!ssid.length() || teste == T_TESTANDO) return srv.send(400, "text/plain", "rede vazia ou teste em andamento");
    testeSsid = ssid;
    testeSenha = srv.arg("p");
    testeMotivo = 0;
    teste = T_TESTANDO;
    testeDesde = millis();
    motivoQueda = 0;
    Serial.printf("portal: testando \"%s\"\n", ssid.c_str());
    if (wsIniciado) ws.disconnect();
    WiFi.disconnect(false, false);
    WiFi.begin(testeSsid.c_str(), testeSenha.c_str());
    srv.send(200, "text/plain", "ok");
  });
  srv.begin();
  Serial.printf("portal: rede FoodHope-Ponte %s (canal %d, http://192.168.77.1), %s\n", ok ? "no ar" : "FALHOU",
                WiFi.channel(), salva.length() ? "rede salva: tentando junto" : "sem rede salva");
}

void encerrarPortal() {
  if (!portalAtivo) return;
  srv.stop();
  dns.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  portalAtivo = false;
  Serial.printf("portal: fechado (memória livre %u)\n", ESP.getFreeHeap());
}

// Atende o portal e acompanha o teste de uma rede escolhida na tela.
void servirPortal() {
  if (!portalAtivo) return;
  dns.processNextRequest();
  srv.handleClient();
  uint32_t agora = millis();
  if (teste == T_TESTANDO) {
    if (WiFi.status() == WL_CONNECTED && WiFi.SSID() == testeSsid) {
      teste = T_OK;
      testeIp = WiFi.localIP().toString();
      nvs.putString("ssid", testeSsid);
      nvs.putString("pass", testeSenha);
      reiniciarEm = agora + 8000;  // a página mostra "conectado" antes de reiniciar
      Serial.printf("portal: \"%s\" ok (%s), reiniciando em 8 s\n", testeSsid.c_str(), testeIp.c_str());
    } else if ((motivoQueda && agora - testeDesde > 4000) || agora - testeDesde > WIFI_TESTE_MS) {
      teste = T_FALHOU;
      testeMotivo = motivoQueda ? motivoQueda : 201;
      Serial.printf("portal: \"%s\" falhou (%u: %s)\n", testeSsid.c_str(), testeMotivo, textoMotivo(testeMotivo));
      WiFi.disconnect(false, false);
      if (ssidAtual.length()) WiFi.begin(ssidAtual.c_str(), senhaAtual.c_str());
    }
  }
  if (teste == T_OK && (int32_t)(agora - reiniciarEm) > 0) {
    ESP.restart();
  }
}

// Tenta as redes conhecidas (salva pelo portal/USB > restaurante > alternativa). Sem sucesso, volta
// false e o loop tenta de novo a cada minuto, com o portal aberto esperando configuração.
bool conectarWifi() {
  WiFi.mode(portalAtivo ? WIFI_AP_STA : WIFI_STA);
  WiFi.setSleep(false);  // sem power-save: latência mínima
  WiFi.setAutoReconnect(true);
  String ssid = nvs.getString("ssid", ""), senha = nvs.getString("pass", "");
  bool ok = tentarWifi(ssid.c_str(), senha.c_str()) || tentarWifi(WIFI_SSID, WIFI_PASSWORD) ||
            tentarWifi(WIFI_SSID_2, WIFI_PASSWORD_2);
  if (ok) {
    Serial.printf("Wi-Fi ok: %s  RSSI %d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    Serial.printf("@wifi-ok\t%s\t%s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
  } else {
    Serial.println("Wi-Fi: nenhuma rede conhecida; portal FoodHope-Ponte aberto esperando configuração");
  }
  return ok;
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

void iniciarApi() {
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
  wsIniciado = true;
  Serial.println("API: conectando");
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
  // 8 e 36 são a própria placa saindo (disconnect): não apagam o motivo real (ex.: 201, senha).
  WiFi.onEvent(
      [](WiFiEvent_t, WiFiEventInfo_t info) {
        uint8_t r = info.wifi_sta_disconnected.reason;
        if (r != 8 && r != 36) motivoQueda = r;
      },
      ARDUINO_EVENT_WIFI_STA_DISCONNECTED);

  uint32_t segurando = millis();
  while (digitalRead(BOOT_PIN) == LOW && millis() - segurando < 2000) delay(10);
  bool pedido = pedidoPortal == MAGICO_PORTAL;
  pedidoPortal = 0;
  bool pedirPortal = pedido || digitalRead(BOOT_PIN) == LOW;
  if (pedirPortal) Serial.println(pedido ? "portal pedido" : "BOOT pressionado: portal por 5 min");
  if (pedirPortal) iniciarPortal(PORTAL_MS);
  if (conectarWifi()) atualizarImpressora(true);  // a varredura (se precisar) roda no loop
  else if (!portalAtivo) iniciarPortal(0);         // nenhuma rede conhecida: tela até configurar
}

void loop() {
  esp_task_wdt_reset();
  processarEntradas();
  ws.loop();
  led();
  uint32_t agora = millis();

  // Alerta de loop lento: tudo o que bloqueia mais de 2 s atrasa cupons e ping da API.
  static uint32_t ultimoLoop = 0;
  if (ultimoLoop && agora - ultimoLoop > 2000) Serial.printf("aviso: loop parado %u ms\n", (unsigned)(agora - ultimoLoop));
  ultimoLoop = agora;

  if (WiFi.status() != WL_CONNECTED) {
    if (!semWifiDesde) semWifiDesde = agora;
    if (portalAtivo || teste == T_TESTANDO) {
      // portal esperando configuração: de tempos em tempos tenta as redes conhecidas de novo
      static uint32_t ultimaTentativa = 0;
      if (teste != T_TESTANDO && WiFi.softAPgetStationNum() == 0 && agora - ultimaTentativa > WIFI_RETENTA_MS) {
        ultimaTentativa = agora;
        if (conectarWifi()) atualizarImpressora(true);
      }
    } else if (agora - semWifiDesde > SEM_WIFI_PORTAL_MS) {
      Serial.println("Wi-Fi: caiu há 30 s, abrindo a FoodHope-Ponte para reconfigurar");
      iniciarPortal(0);  // o Wi-Fi salvo continua tentando junto; ao voltar, a FoodHope-Ponte some
    }
    return;
  }
  semWifiDesde = 0;

  // conectado no Wi-Fi: a FoodHope-Ponte some (pedido pelo BOOT/USB: só depois dos 5 min), sem
  // derrubar quem estiver configurando nela
  if (portalAtivo && teste != T_TESTANDO && teste != T_OK && WiFi.softAPgetStationNum() == 0 &&
      (!portalJanela || agora - portalDesde > portalJanela))
    encerrarPortal();

  if (!wsIniciado) iniciarApi();  // a API não espera o portal: imprime desde o boot

  if (jobAberto) return;  // nada de sondar a impressora no meio de um cupom

  if (varredura.ativa) {
    passoVarredura();  // um lote por volta do loop
    return;
  }

  if (redescobrir) {
    redescobrir = false;
    falhasSeguidas = 0;
    impressoraOnline = false;
    salvarIpImpressora(0);
    iniciarVarredura();
  } else if (sondarPedido || agora - ultimoStatus >= STATUS_MS) {
    sondarPedido = false;
    ultimoStatus = agora;
    bool antes = impressoraOnline;
    uint8_t papelAntes = papel;
    // impressora sumiu por ~1,5 min (desligada ou trocou de IP no DHCP): procura de novo
    atualizarImpressora(!ipImpressora || offlineSeguidos >= 3);
    offlineSeguidos = impressoraOnline ? 0 : offlineSeguidos + 1;
    if (offlineSeguidos > 3) offlineSeguidos = 0;
    if (!varredura.ativa) enviarStatus();
    if (antes != impressoraOnline || papelAntes != papel)
      Serial.printf("impressora %s, papel %u\n", impressoraOnline ? "online" : "offline", papel);
  }
}
