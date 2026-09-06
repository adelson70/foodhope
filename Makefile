.PHONY: up logs

COMPOSE = sudo docker compose --profile tunnel

up:
	cd docker && $(COMPOSE) build web api && $(COMPOSE) up -d

logs:
	cd docker && $(COMPOSE) logs -f

down:
	cd docker && $(COMPOSE) down api web

deploy:
	cd docker && $(COMPOSE) build web api && $(COMPOSE) up -d && $(COMPOSE) logs -f
