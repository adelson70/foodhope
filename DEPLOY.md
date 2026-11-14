# Deploy — Food Hope

Hospedagem atual: **Docker nesta máquina (notebook), sem runner**. O site e a API saem para a
internet por Cloudflare Tunnel; `git push` só envia código para o GitHub, **não publica**.

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

Na raiz do repositório, com o código desejado no diretório de trabalho:

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
- **Esta máquina precisa estar na mesma rede da impressora.** Hoje a impressora está em
  `10.0.0.0/24` (gateway `10.0.0.1`). Se o notebook estiver em outro Wi-Fi (ex.: "Hope Parking",
  gateway `10.0.23.1`), a impressora não é encontrada, mesmo com a faixa `10.0.x.x` parecida.
- Teste rápido no host: `timeout 3 bash -c '</dev/tcp/<ip-da-impressora>/9100' && echo ok`.

## GitHub Actions

`.github/workflows/deploy.yml` está só com `workflow_dispatch` (não roda no push), porque não há
runner. Só volte a usá-lo quando existir um servidor com runner registrado — ver o guia desativado.

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| `Bind for 0.0.0.0:80 failed: port is already allocated` | `WEB_PUBLISH_PORT=80` no `.env`; use `8088` |
| `docker compose ls` mostra `docker` e `foodhope` | projeto antigo subiu de novo; `docker compose -p docker --profile tunnel down` (sem `-v`) e `make up` |
| Site com erro 1033/530 da Cloudflare | containers `foodhope-cloudflared-*` parados ou máquina sem internet |
| Impressora "não está respondendo" | máquina em rede diferente da impressora (ver acima) ou impressora desligada |

## O que não commitar

`docker/.env`, tokens dos tunnels, backups `.sql.gz`.
