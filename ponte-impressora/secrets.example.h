#pragma once
// Copie para secrets.h (não versionado) e preencha.

// Wi-Fi do restaurante (2,4 GHz). Atenção a espaços no nome: "Food Hope " tem um no fim.
#define WIFI_SSID "Food Hope "
#define WIFI_PASSWORD ""
// Rede alternativa (opcional), tentada depois da principal.
#define WIFI_SSID_2 ""
#define WIFI_PASSWORD_2 ""

// Senha do portal "FoodHope-Ponte" (mínimo 8 caracteres), aberto quando nenhuma rede conecta.
#define PORTAL_SENHA "troque-esta-senha"

// API (mesmo valor de PONTE_IMPRESSORA_TOKEN no docker/.env). Gere com: openssl rand -hex 32
#define PONTE_TOKEN ""

// Produção: WSS pelo Cloudflare Tunnel. Para testar na LAN, compile com
//   --build-property "compiler.cpp.extra_flags=-DPONTE_HOST=\"192.168.x.y\" -DPONTE_PORTA=5001 -DPONTE_TLS=0"
#ifndef PONTE_HOST
#define PONTE_HOST "foodhope-api.abjr.dev"
#endif
