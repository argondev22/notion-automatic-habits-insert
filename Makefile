.PHONY: init build up down logs clean

init:
	@chmod +x ./bin/init-project.sh
	@./bin/init-project.sh

start:
	@cd app && docker compose build && docker image prune -f && docker compose down && docker compose up

clean:
	@docker system prune -f
	@docker volume prune -f
