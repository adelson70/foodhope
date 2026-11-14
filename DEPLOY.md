# Deploy — Food Hope

Hospedagem atual: **Docker no servidor de casa** (`claude-server`, `~/apps/foodhope`, Tailscale
`100.69.188.116`). O site e a API saem para a internet por Cloudflare Tunnel. **Todo push na
`main` publica**: o runner self-hosted do servidor faz o build e o deploy (ver "GitHub Actions"). O **notebook** guarda uma réplica do
Postgres (streaming via Tailscale) para failover manual — ver "Réplica e failover".

A impressora fica no restaurante e é alcançada pela **ponte ESP32** (a API não está na rede dela).

O guia antigo (servidor dedicado + GitHub Actions + self-hosted runner + GHCR) está em
[`docs/deploy-servidor-runner-desativado.md`](docs/deploy-servidor-runner-desativado.md).

## Visão geral

| URL | Destino |
|---|---|
| `https://foodhope.abjr.dev` | container `foodhope-web` (`web:80`) |
| `https://foodhope-api.abjr.dev` | container `foodhope-api` (`api:5000`) |

Tudo vem de **um único projeto compose, `foodhope`**, definido em `docker/docker-compose.yml`
(`name: foodhope`), com o `.env` em `docker/.env` (não versionado; modelo em `docker/.env.example`).

| Container | Papel | Porta no host |
|---|---|---|
| `foodhope-web` | nginx com o build do front (PWA) | `8088` (`WEB_PUBLISH_PORT`) |
| `foodhope-api` | NestJS; aplica migrations no boot | `5000` (`API_PUBLISH_PORT`) |
| `foodhope-postgres` | Postgres 16 | — |
| `foodhope-redis` | Redis 7 | — |
| `foodhope-cloudflared-web` | tunnel → `http://web:80` (perfil `tunnel`) | — |
| `foodhope-cloudflared-api` | tunnel → `http://api:5000` (perfil `tunnel`) | — |

- A porta 80 do host é de outro projeto (`portaldeservicos-nginx`). O tunnel fala com o web pela
  rede interna do Docker, então a porta publicada do web não afeta o site.
- Volumes (dados): `docker_postgres-data`, `docker_redis-data`, `docker_produto-imagens`. Os nomes
  têm o prefixo `docker_` porque o projeto se chamava `docker`; o compose fixa esses nomes.
  **Não renomeie nem rode `down -v`.**

## Publicar uma versão nova

Normalmente basta `git push` na `main`. Para publicar à mão (ou com o runner fora do ar),
no servidor (`ssh claude-server-ts`), em `~/apps/foodhope`. O `docker/.env` de lá já define
`COMPOSE_FILE` (inclui `docker-compose.servidor.yml`) e `COMPOSE_PROFILES=tunnel`:

```bash
cd ~/apps/foodhope && git pull --ff-only
cd docker && docker compose build api web && docker compose up -d
```

Os alvos do `Makefile` abaixo usam `sudo` e o perfil `tunnel`; servem para rodar a stack inteira
numa máquina só (ex.: o notebook em failover). Na raiz do repositório:

```bash
make deploy   # build de web e api + up -d do projeto foodhope + segue os logs
# ou, sem seguir os logs:
make up
```

Só o front mudou? Rebuild só do web (API, banco e tunnels continuam no ar):

```bash
cd docker
docker compose --profile tunnel build web
docker compose --profile tunnel up -d --no-deps web
```

Migrations do Prisma rodam sozinhas no boot da API (`prisma migrate deploy`, só para frente).

### Conferir depois do deploy

```bash
docker compose ls                          # um projeto "foodhope", sem "docker" duplicado
docker ps --filter name=foodhope
curl -s -o /dev/null -w "%{http_code}\n" https://foodhope.abjr.dev/
curl -s -o /dev/null -w "%{http_code}\n" https://foodhope-api.abjr.dev/health
docker logs --tail 50 foodhope-api
```

Ao atualizar o front, o PWA instalado nos aparelhos se atualiza sozinho (service worker com
`autoUpdate`) na próxima vez que abrir com internet.

## Operação

```bash
make logs                                   # logs de todos os serviços
cd docker && docker compose --profile tunnel restart api
cd docker && docker compose --profile tunnel ps
```

## Backup e restauração

Backup completo do Postgres (guarde fora do repositório):

```bash
mkdir -p ~/backups/foodhope
docker exec foodhope-postgres sh -c 'pg_dumpall -U "$POSTGRES_USER"' \
  | gzip > ~/backups/foodhope/foodhope-$(date +%Y%m%d-%H%M%S).sql.gz
chmod 600 ~/backups/foodhope/*.sql.gz
```

Restaurar (sobrescreve dados — confira o arquivo antes):

```bash
gunzip -c ~/backups/foodhope/<arquivo>.sql.gz \
  | docker exec -i foodhope-postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres'
```

Imagens dos produtos ficam no volume `docker_produto-imagens`.

## Impressora de rede

- A API procura impressoras (porta 9100) nas redes de `IMPRESSORA_REDES` (`docker/.env`, CIDR,
  no máximo `/22`), além do IP salvo na configuração do painel.
- Só vale no modo "Impressora de rede"; no servidor de casa use a **Ponte ESP32**.
- **A máquina da API precisa estar na mesma rede da impressora.** Hoje a impressora está em
  `10.0.0.0/24` (gateway `10.0.0.1`). Se o notebook estiver em outro Wi-Fi (ex.: "Hope Parking",
  gateway `10.0.23.1`), a impressora não é encontrada, mesmo com a faixa `10.0.x.x` parecida.
- Teste rápido no host: `timeout 3 bash -c '</dev/tcp/<ip-da-impressora>/9100' && echo ok`.

## Ponte de impressão ESP32

Com a ponte, a API não precisa estar na rede da impressora. Um ESP32 no restaurante abre um WSS
de saída para `wss://foodhope-api.abjr.dev/ponte-impressora` e repassa os cupons ESC/POS para a
impressora na porta 9100.

- **Painel:** Configurações → Impressora → **Ponte ESP32**. Mostra se o ESP32 está conectado e
  autenticado, o MAC, o firmware, o sinal e a impressora encontrada (IP + papel). Testar → Salvar.
- **Autenticação:** `PONTE_IMPRESSORA_TOKEN` (`docker/.env`) precisa ser igual a `PONTE_TOKEN`
  (`firmware/ponte-impressora/secrets.h`). O primeiro ESP32 com token válido fica registrado pelo
  MAC. Um ESP32 diferente só recebe cupons depois de "Autorizar" no painel.
- **Firmware:** `firmware/ponte-impressora/`. Copie `secrets.example.h` para `secrets.h`, preencha
  e grave:
  ```bash
  arduino-cli compile --fqbn esp32:esp32:esp32 firmware/ponte-impressora
  arduino-cli upload  --fqbn esp32:esp32:esp32 -p /dev/ttyUSB0 firmware/ponte-impressora
  ```
- **Plug and play:** o ESP32 tenta o Wi-Fi salvo, depois `WIFI_SSID` e depois `WIFI_SSID_2`. A
  impressora é achada sozinha: primeiro testa o IP salvo, senão varre o /24 na porta 9100.
- **Trocar o Wi-Fi (recomendado):** ligue o ESP32 na USB de um computador e, no painel (Chrome/Edge),
  Ponte ESP32 → **Conectar ESP32 pela USB** → escolha a rede → senha → Gravar. Ele reinicia e
  confirma o IP em ~5 s. Pela serial (115200): `scan`, `wifi<TAB>ssid<TAB>senha`, `portal`.
- **Portal (reserva):** sem Wi-Fi, ou segurando BOOT 2 s ao ligar, abre a rede aberta
  **FoodHope-Ponte** (http://192.168.77.1). Nesta placa os celulares veem a rede mas não associam
  (o ESP32 recebe os probes, nenhum aparelho conecta), por isso a USB é o caminho principal.
- **LED:** pisca rápido = sem Wi-Fi; médio = sem API; lento = sem impressora; aceso = pronto.
- **Sem perder comanda:** a fila (`fila-impressao`) tenta 10 vezes com backoff exponencial a partir
  de 5 s (~40 min). Com a ponte fora do ar, cada job ainda espera até 30 s pela reconexão. O ESP32
  não reimprime um job já confirmado.
- **Carga:** `api/scripts/carga-ponte.mjs <A|B|C|D|E|real> --confirmo` (use o emulador
  `docker compose --profile dev up -d escpos`). Os cenários partem do pico real de 05/09/2026:
  6 pedidos/min, 44/h.

## Réplica e failover (notebook)

- **Servidor:** `docker-compose.servidor.yml` publica o Postgres na porta `5433` com
  `docker/postgres/pg_hba.conf`: fora da rede do compose, só o role `replicador` vindo do IP
  Tailscale do notebook (`100.64.8.84`). O slot físico `notebook` segura no máximo 2 GB de WAL
  (`max_slot_wal_keep_size`), então o notebook desligado não lota o disco do servidor.
  Role e slot: `sh postgres/replicacao.sh` (idempotente; senha em `PG_REPLICA_PASSWORD` do `.env`).
- **Notebook:** `docker/replica/` (projeto `foodhope-replica`, volume `foodhope-replica-data`,
  porta `127.0.0.1:5434`). `.env` com a mesma `PG_REPLICA_PASSWORD` (modelo em `.env.example`).
  ```bash
  cd docker/replica && docker compose up -d   # 1º boot: pg_basebackup; depois streaming
  ```
- **Conferir:** no servidor `docker exec foodhope-postgres psql -U foodhope -c "select client_addr,state,replay_lag from pg_stat_replication"`;
  no notebook `docker exec foodhope-postgres-replica psql -U foodhope -d foodhope -c "select pg_is_in_recovery(), now()-pg_last_xact_replay_timestamp()"`.
- **Failover manual (só com o servidor fora do ar e sem previsão de volta):**
  1. Garanta que a stack do servidor está parada (senão os dois tunnels dividem o tráfego e os
     bancos divergem).
  2. `docker exec foodhope-postgres-replica psql -U foodhope -d foodhope -c "select pg_promote()"`.
  3. No notebook, suba `redis`, `api`, `web` e os tunnels com `DATABASE_URL` apontando para a
     réplica (`host.docker.internal:5434` ou a rede do projeto `foodhope-replica`).
  4. Quando o servidor voltar, ele é que vira o desatualizado: refaça o servidor a partir de um
     dump do notebook e recrie a réplica (`docker compose down -v` em `docker/replica` + `up -d`).
- **Stack antiga do notebook:** containers `foodhope-*` parados (não removidos) e volumes
  `docker_*` preservados como cópia do dia da migração. Não suba os tunnels dela junto com o servidor.

## GitHub Actions

`.github/workflows/deploy.yml` roda em todo push na `main` (e por `workflow_dispatch`) no runner
self-hosted **`foodhope-server`** (label `foodhope`), no próprio servidor:
`git merge --ff-only` em `~/apps/foodhope` → `docker compose build api web` → `up -d` → confere
`localhost:5000/health` e as URLs públicas. Um deploy por vez; o seguinte espera.

- Runner: `~/actions-runner-foodhope`, serviço systemd do usuário `actions-runner-foodhope`
  (`systemctl --user status actions-runner-foodhope`; linger ativo, sobe no boot).
- Se o `git merge --ff-only` falhar, alguém mexeu no código em `~/apps/foodhope`: resolva lá
  (sem commits locais no servidor).
- **Repositório público + runner self-hosted:** PRs de fork podem trazer workflows. Mantenha em
  Settings → Actions → General "Require approval for all outside collaborators".

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| `Bind for 0.0.0.0:80 failed: port is already allocated` | `WEB_PUBLISH_PORT=80` no `.env`; use `8088` |
| `docker compose ls` mostra `docker` e `foodhope` | projeto antigo subiu de novo; `docker compose -p docker --profile tunnel down` (sem `-v`) e `make up` |
| Site com erro 1033/530 da Cloudflare | containers `foodhope-cloudflared-*` parados ou máquina sem internet |
| Impressora "não está respondendo" | máquina em rede diferente da impressora (ver acima) ou impressora desligada |

## O que não commitar

`docker/.env`, tokens dos tunnels, backups `.sql.gz`.
