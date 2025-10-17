.PHONY: init up down clean

init:
	@chmod +x ./bin/init-project.sh
	@./bin/init-project.sh

up:
	@cd app && docker compose up

down:
	@cd app && docker compose down

clean:
	@docker system prune -f
	@docker volume prune -f
