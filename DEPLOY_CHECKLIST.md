# Checklist de deploy — Food Hope

## Servidor (`hope@192.168.10.133`)

- [ ] Docker Engine instalado
- [ ] Docker Compose plugin funcionando (`docker compose version`)
- [ ] Usuário `hope` no grupo `docker`
- [ ] Diretório `/home/hope/apps/foodhope` criado
- [ ] Diretório `/home/hope/infra/foodhope-cloudflared` criado
- [ ] Network `foodhope_edge` criada
- [ ] Network `stack_default` com Postgres/Redis
- [ ] Database `foodhope` criado no Postgres
- [ ] `compose.production.yml` no diretório da app
- [ ] `.env` de produção configurado (secrets fortes; não commitado)
- [ ] `docker login ghcr.io` feito (se pacotes privados)

## GitHub (Variables / Runner)

- [ ] Variable `VITE_API_URL` = `https://foodhope-api.abjr.dev`
- [ ] Variable `VITE_SITE_URL` = `https://foodhope.abjr.dev`
- [ ] Variable `HEALTHCHECK_API_URL` = `https://foodhope-api.abjr.dev/health`
- [ ] Variable `HEALTHCHECK_WEB_URL` = `https://foodhope.abjr.dev/`
- [x] Self-hosted runner instalado em `/home/hope/actions-runner` (`foodhope-server`)
- [ ] Runner **Idle/Online** em Settings → Actions → Runners (confirmar na UI)
- [ ] Sem secrets `DEPLOY_*` (não são usados)

## GHCR

- [ ] Workflow publicou `ghcr.io/adelson70/foodhope/api`
- [ ] Workflow publicou `ghcr.io/adelson70/foodhope/web`
- [ ] Pull das imagens funciona no servidor

## Cloudflare

- [ ] Hostnames `foodhope.abjr.dev` e `foodhope-api.abjr.dev` na Cloudflare
- [ ] Tunnels / connectors criados (remotamente gerenciados)
- [ ] `TUNNEL_TOKEN_WEB` e `TUNNEL_TOKEN_API` em `/home/hope/infra/foodhope-cloudflared/.env`
- [ ] Containers cloudflared up na network `foodhope_edge`
- [ ] Hostname `foodhope.abjr.dev` → `http://web:80`
- [ ] Hostname `foodhope-api.abjr.dev` → `http://api:5000`
- [ ] SSL/TLS adequado (Full)

## Validação

- [ ] `docker compose -f compose.production.yml ps` mostra api/web healthy
- [ ] `curl https://foodhope-api.abjr.dev/health` ok
- [ ] `curl https://foodhope.abjr.dev/` ok
- [ ] Login do painel funciona (CORS/cookies)
- [ ] `.current-sha-api` / `.current-sha-web` existem após deploy
- [ ] Rollback para `.previous-sha-*` testado (opcional)
- [ ] Push na `main` dispara o workflow completo com sucesso
