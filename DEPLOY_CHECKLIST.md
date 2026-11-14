# Checklist de deploy — Food Hope (Docker local, sem runner)

Detalhes em [`DEPLOY.md`](DEPLOY.md).

## Antes de publicar

- [ ] Código desejado no diretório de trabalho (`git status`, branch `main`)
- [ ] Notebook com internet e na rede da impressora (Wi-Fi "Food Hope", `10.0.0.0/24`)
- [ ] Backup do banco feito (`~/backups/foodhope/*.sql.gz`) se houver migration nova

## Publicar

- [ ] `make up` (ou `make deploy`); só front: rebuild/up `--no-deps web` em `docker/`

## Conferir

- [ ] `docker compose ls` mostra **só** `foodhope` (nenhum projeto `docker`)
- [ ] `docker ps --filter name=foodhope` com web, api, postgres, redis e os 2 tunnels `Up`
- [ ] `https://foodhope.abjr.dev/` responde 200
- [ ] `https://foodhope-api.abjr.dev/health` responde
- [ ] `docker logs --tail 50 foodhope-api` sem erro de migration
- [ ] Login do painel funciona
- [ ] Impressora: página de teste em Configurações → Impressora

## Configuração (uma vez)

- [x] `docker/.env` com `WEB_PUBLISH_PORT=8088` (porta 80 é de outro projeto)
- [x] `docker/.env` com `IMPRESSORA_REDES=10.0.0.0/24`
- [x] Tokens dos tunnels (`CLOUDFLARE_TUNNEL_TOKEN_WEB/API`) no `docker/.env`
- [x] Workflow do GitHub só manual (sem runner)
