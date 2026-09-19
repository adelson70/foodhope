.PHONY: up logs down deploy

COMPOSE = sudo docker compose --profile tunnel

up:
	cd docker && $(COMPOSE) build web api && $(COMPOSE) up -d

logs:
	cd docker && $(COMPOSE) logs -f

down:
	cd docker && $(COMPOSE) down api web

deploy:
	@echo "CD de produção = push na main (GitHub Actions + self-hosted)."
	@echo "Para stack local com tunnel: make up"
	cd docker && $(COMPOSE) build web api && $(COMPOSE) up -d && $(COMPOSE) logs -f
