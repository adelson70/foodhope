.PHONY: up logs

COMPOSE = sudo docker compose --profile tunnel

up:
	cd docker && $(COMPOSE) build web api && $(COMPOSE) up -d

logs:
	cd docker && $(COMPOSE) logs -f
