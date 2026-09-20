# Deploy — Food Hope

Guia prático para rodar em servidor doméstico com Docker, GitHub Actions, GHCR e Cloudflare Tunnel.

**Domínios**

| Público | Destino |
|---------|---------|
| `https://foodhope.abjr.dev` | container `web:80` |
| `https://foodhope-api.abjr.dev` | container `api:5000` |

Branch de produção: `main`.

---

## Self-hosted runner (LAN)

O job `deploy` usa `runs-on: self-hosted` porque o servidor (`192.168.10.133`) está em IP privado.

O runner fica no servidor, usuário `hope`:

```text
/home/hope/actions-runner
Nome no GitHub: foodhope-server
```

Comandos no servidor:

```bash
cd ~/actions-runner
./svc.sh status
```

Confirme no GitHub: **Settings → Actions → Runners** que o runner está **Idle/Online**.

### Paths neste servidor

```text
/home/hope/apps/foodhope/              # app (compose + .env)
/home/hope/infra/foodhope-cloudflared/ # tunnels web + api
/home/hope/actions-runner/               # self-hosted runner
```

O job `deploy` roda **no próprio servidor** (`runs-on: self-hosted`) e executa `docker compose` em `/home/hope/apps/foodhope` — **não precisa** de secrets SSH (`DEPLOY_HOST`, `DEPLOY_SSH_KEY`, etc.).

### Banco / Redis (`stack_default`)

Neste servidor a stack fica em `/home/hope/infra/stack/` (compose em `deploy/stack/docker-compose.yml` no repo):

| Serviço | Host Docker | Credenciais / DB |
|---------|-------------|------------------|
| Postgres | `postgres:5432` | user/senha/db **`foodhope`** |
| Redis | `redis:6379` | sem senha |

```bash
mkdir -p /home/hope/infra/stack
cp deploy/stack/docker-compose.yml /home/hope/infra/stack/
cd /home/hope/infra/stack && docker compose up -d
```

`DATABASE_URL` no `.env` da app:

`postgresql://foodhope:foodhope@postgres:5432/foodhope`

### Cloudflare Tunnel

Dois containers na network `foodhope_edge`:

| Tunnel | Hostname | Service |
|--------|----------|---------|
| cloudflared-web | `foodhope.abjr.dev` | `http://web:80` |
| cloudflared-api | `foodhope-api.abjr.dev` | `http://api:5000` |

```bash
cd ~/infra/foodhope-cloudflared
docker compose ps
docker compose logs -f
```

Os hostnames só respondem quando os containers `web` e `api` estiverem up na mesma network.

---

## 1. Pré-requisitos

- Linux (Ubuntu/Debian/Fedora)
- Acesso SSH ao servidor (`hope@192.168.10.133`)
- Domínio / zona Cloudflare com `abjr.dev` (ou hostnames já apontados)
- Conta GitHub no repositório `adelson70/foodhope`

## 2. Instalação do Docker

Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
# Siga a documentação oficial do Docker Engine para o seu distro:
# https://docs.docker.com/engine/install/
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Validar:

```bash
docker version
docker compose version
```

## 3. Estrutura de diretórios

```text
/home/hope/apps/foodhope/
  compose.production.yml
  .env
  .current-sha-api
  .previous-sha-api
  .current-sha-web
  .previous-sha-web

/home/hope/infra/foodhope-cloudflared/
  compose.yml
  .env
```

## 4. Deploy sem SSH do GitHub

Este pipeline **não** usa usuário `deploy` remoto nem secrets `DEPLOY_*`.

O self-hosted runner já está no servidor e sobe os containers localmente.

## 5. Configuração do GHCR

Imagens:

- `ghcr.io/adelson70/foodhope/api:<sha>`
- `ghcr.io/adelson70/foodhope/web:<sha>`

O workflow publica com `GITHUB_TOKEN` (`packages: write`).

No servidor, autentique o pull (pacotes privados):

1. GitHub → Settings → Developer settings → Personal access tokens (classic) com `read:packages`
2. No servidor:

```bash
echo SEU_PAT | docker login ghcr.io -u SEU_USUARIO_GITHUB --password-stdin
```

Ou torne os pacotes **Public** em GitHub Packages para evitar PAT no servidor.

## 6. GitHub Secrets necessários

| Secret | Descrição |
|--------|-----------|
| — | **Nenhum secret customizado** para o deploy. `GITHUB_TOKEN` é automático. |

Não configure `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` — o workflow atual não os usa.

## 7. GitHub Variables necessárias

Caminho: repositório **adelson70/foodhope** → **Settings → Secrets and variables → Actions** → aba **Variables** → **New repository variable**.

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://foodhope-api.abjr.dev` |
| `VITE_SITE_URL` | `https://foodhope.abjr.dev` |
| `HEALTHCHECK_API_URL` | `https://foodhope-api.abjr.dev/health` |
| `HEALTHCHECK_WEB_URL` | `https://foodhope.abjr.dev/` |

Se as variables não existirem, o workflow usa esses mesmos defaults.

## 8. Configuração do `.env` no servidor

```bash
cd /home/hope/apps/foodhope
cp /caminho/do/repo/.env.example .env
nano .env
```

Campos críticos:

- `DATABASE_URL` (host Docker `postgres`, DB `foodhope`)
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`
- `JWT_SECRET` (longo e aleatório)
- `APP` = `https://foodhope.abjr.dev`
- `API_PUBLIC_URL` = `https://foodhope-api.abjr.dev` (webhook InfinitePay)
- `DIALOUT_GID` / `LP_GID` (impressora USB; neste servidor `DIALOUT_GID=20`, `LP_GID=7`)
- `SWAGGER_USER` / `SWAGGER_PASSWORD`

Subir Postgres/Redis antes da app: `cd /home/hope/infra/stack && docker compose up -d`.

`VITE_API_URL` e `VITE_SITE_URL` **não** precisam no `.env` de runtime — entram na imagem web no bake (Variables do GitHub).

## 9. Configuração do Cloudflare

1. Conta Cloudflare com a zona dos hostnames
2. Proxy laranja (proxied) nos hostnames do Tunnel
3. SSL/TLS recomendado: **Full** (origem HTTP interna)

## 10. Criação do Cloudflare Tunnel

1. Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared (dois tunnels, um por hostname, ou dois connectors)
2. Copie os **tokens** (não vão para o Git)
3. No servidor:

```bash
mkdir -p /home/hope/infra/foodhope-cloudflared
cp deploy/cloudflared/compose.yml /home/hope/infra/foodhope-cloudflared/compose.yml
cp deploy/cloudflared/.env.example /home/hope/infra/foodhope-cloudflared/.env
nano /home/hope/infra/foodhope-cloudflared/.env   # TUNNEL_TOKEN_WEB=... e TUNNEL_TOKEN_API=...
docker network create foodhope_edge || true
cd /home/hope/infra/foodhope-cloudflared
docker compose up -d
```

## 11. Configuração do DNS / hostname

No Tunnel → Public Hostname:

| Hostname | Service |
|----------|---------|
| `foodhope.abjr.dev` | `http://web:80` |
| `foodhope-api.abjr.dev` | `http://api:5000` |

**Importante:** `cloudflared` e os containers `web`/`api` devem estar na network `foodhope_edge`.

## 12. Primeiro deployment

No servidor (como `hope`), a partir de um clone do repo:

```bash
git clone https://github.com/adelson70/foodhope.git
cd foodhope
bash deploy/scripts/bootstrap-server.sh
# ou só a app:
# bash deploy/scripts/prepare-server.sh /home/hope/apps/foodhope
nano /home/hope/apps/foodhope/.env
nano /home/hope/infra/foodhope-cloudflared/.env
docker login ghcr.io
cd /home/hope/infra/foodhope-cloudflared && docker compose up -d
cd /home/hope/apps/foodhope
docker compose -f compose.production.yml pull
docker compose -f compose.production.yml up -d
```

Ou: configure Variables no GitHub, registre o runner e faça `git push origin main` — o workflow faz o resto.

Criar o banco (uma vez), se ainda não existir — com a stack `deploy/stack` o DB `foodhope` já nasce no primeiro `up`:

```bash
docker exec -it postgres psql -U foodhope -c '\l'
```

## 13. Deploy automático

Fluxo em push na `main` (paths-ignore: markdown / DEPLOY*):

```text
changes → (só o que mudou)
  api:  build-api → deploy-api
  web:  build-web → deploy-web
```

- Push na `main`: sobe **só** o lado alterado (`api/**` ou `web/**`; também `docker-bake.hcl` / `compose.production.yml`).
- `workflow_dispatch`: força **api e web**.
- Cache Docker: GHA (`scope=api|web`) + registry `:latest` no bake.
- Migration de produção no boot da API (`docker-entrypoint.sh`).

## 14. Logs

```bash
cd /home/hope/apps/foodhope
docker compose -f compose.production.yml ps
docker compose -f compose.production.yml logs -f api
docker compose -f compose.production.yml logs -f web
```

Tunnel:

```bash
cd /home/hope/infra/foodhope-cloudflared
docker compose logs -f
```

## 15. Healthcheck

```bash
curl -fsS https://foodhope-api.abjr.dev/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://foodhope.abjr.dev/
docker compose -f /home/hope/apps/foodhope/compose.production.yml ps
```

## 16. Versão instalada

```bash
cat /home/hope/apps/foodhope/.current-sha-api
cat /home/hope/apps/foodhope/.current-sha-web
grep -E '^(API_IMAGE|WEB_IMAGE)=' /home/hope/apps/foodhope/.env
docker compose -f /home/hope/apps/foodhope/compose.production.yml images
```

## 17. Rollback

API:

```bash
cd /home/hope/apps/foodhope
PREV=$(cat .previous-sha-api)
echo "Rollback API para $PREV"
sed -i "s|^API_IMAGE=.*|API_IMAGE=ghcr.io/adelson70/foodhope/api:${PREV}|" .env
docker compose -f compose.production.yml pull api
docker compose -f compose.production.yml up -d --no-deps api
```

Web:

```bash
cd /home/hope/apps/foodhope
PREV=$(cat .previous-sha-web)
echo "Rollback Web para $PREV"
sed -i "s|^WEB_IMAGE=.*|WEB_IMAGE=ghcr.io/adelson70/foodhope/web:${PREV}|" .env
docker compose -f compose.production.yml pull web
docker compose -f compose.production.yml up -d --no-deps web
```

## 18. Atualização manual

```bash
cd /home/hope/apps/foodhope
SHA=abcdef...
sed -i "s|^API_IMAGE=.*|API_IMAGE=ghcr.io/adelson70/foodhope/api:${SHA}|" .env
sed -i "s|^WEB_IMAGE=.*|WEB_IMAGE=ghcr.io/adelson70/foodhope/web:${SHA}|" .env
docker compose -f compose.production.yml pull
docker compose -f compose.production.yml up -d
```

## 19. Reiniciar

```bash
cd /home/hope/apps/foodhope
docker compose -f compose.production.yml restart
docker compose -f compose.production.yml restart api
```

## 20. Backup

Postgres (dump via container da stack):

```bash
mkdir -p /home/hope/apps/foodhope/backups
docker exec -t postgres \
  pg_dump -U dev foodhope | gzip > "/home/hope/apps/foodhope/backups/db-$(date +%F-%H%M).sql.gz"
```

Imagens de produtos (volume Docker `produto-imagens`):

```bash
docker run --rm -v foodhope_produto-imagens:/data -v /home/hope/apps/foodhope/backups:/backup \
  alpine tar czf /backup/produto-imagens-$(date +%F).tar.gz -C /data .
```

**Nunca** rode `docker compose down -v` em produção (apaga volumes).

## 21. Restaurar backup

```bash
gunzip -c /home/hope/apps/foodhope/backups/db-AAAA-MM-DD-HHMM.sql.gz | \
  docker exec -i postgres psql -U dev foodhope
```

## 22. Migrations

No boot da API, `docker-entrypoint.sh` executa `prisma migrate deploy` (não destrutivo).

Não use `migrate reset` / `db push` / `down -v` em produção.

## 23. Troubleshooting

| Sintoma | Ação |
|---------|------|
| Deploy não inicia no self-hosted | Runner Idle/Online? Label `self-hosted`? |
| `pull` 401 no GHCR | `docker login ghcr.io` ou pacote público |
| API unhealthy | `logs api`; checar `DATABASE_URL`, Redis, migrations |
| Web 502 no Tunnel | `cloudflared` na `foodhope_edge`? hostname → `http://web:80`? |
| CORS no browser | `APP` deve ser `https://foodhope.abjr.dev` |
| InfinitePay webhook falha | `API_PUBLIC_URL` = `https://foodhope-api.abjr.dev` |
| Impressora USB vazia | `DIALOUT_GID`/`LP_GID` e bind `/dev` no compose |
| `/health` 401 | Endpoint deve ser `@Public()` |

## O que NÃO commitá

- `.env` (servidor ou local)
- `deploy/cloudflared/.env` (tokens Tunnel)
- Chaves SSH privadas / senhas
- PAT do GitHub
- Dumps de backup com dados reais

## Documentação oficial de referência

- https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- https://docs.docker.com/compose/
- https://docs.docker.com/build/building/multi-stage/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/
