.PHONY: init build up down logs clean

init:
	@chmod +x ./bin/init-project.sh
	@./bin/init-project.sh

build:
	@cd app && docker compose build

start:
	@cd app && docker compose down && docker compose up

clean:
	@docker system prune -f
	@docker volume prune -f
