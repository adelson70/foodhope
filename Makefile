.PHONY: up logs down deploy

COMPOSE = sudo docker compose --profile tunnel

up:
	cd docker && $(COMPOSE) build web api && $(COMPOSE) up -d

logs:
	cd docker && $(COMPOSE) logs -f

down:
	cd docker && $(COMPOSE) down api web

deploy:
	@echo "Deploy local: build de web/api e up do projeto foodhope (sem runner)."
	cd docker && $(COMPOSE) build web api && $(COMPOSE) up -d && $(COMPOSE) logs -f
