.PHONY: init up down clean test lint format build logs health reset shell

# 開発環境の起動
up:
	@cd app && docker compose up

# 開発環境の停止
down:
	@cd app && docker compose down

# 開発環境の再起動
restart: down up

# ビルド実行
build:
	@cd app && docker compose build --no-cache

# ログ表示
logs:
	@cd app && docker compose logs -f

# アプリケーションのログのみ表示
logs:app:
	@cd app && docker compose logs -f app

# コンテナ内でシェルを実行
shell:
	@cd app && docker compose exec app /bin/bash

# 開発環境の完全リセット
reset: down clean up

# テスト実行
test:
	@cd app && docker compose exec app npm test

# リント実行
lint:
	@cd app && docker compose exec app npm run lint:check

# リント修正
lint:fix:
	@cd app && docker compose exec app npm run lint

# フォーマット実行
format:
	@cd app && docker compose exec app npm run format

# フォーマットチェック
format:check:
	@cd app && docker compose exec app npm run format:check

# 型チェック
type-check:
	@cd app && docker compose exec app npm run type-check

# ヘルスチェック
health:
	@curl -f http://localhost:8080/health || echo "Service is not healthy"


# Dockerのクリーンアップ
clean:
	@docker system prune -f
	@docker volume prune -f

# イメージのクリーンアップ
clean:images:
	@docker image prune -f

# 全体的なクリーンアップ
clean:all: down clean clean:images

# プロジェクト初期化
init:
	@chmod +x ./bin/init-project.sh
	@./bin/init-project.sh

# 開発環境のセットアップ（初回実行時）
setup: init up
	@echo "Waiting for services to be ready..."
	@sleep 10
	@make health
	@echo "Development environment is ready!"

# ヘルプ表示
help:
	@echo "Available commands:"
	@echo "  init          - Initialize project"
	@echo "  up            - Start development environment"
	@echo "  down          - Stop development environment"
	@echo "  restart       - Restart development environment"
	@echo "  up-prod       - Start production environment"
	@echo "  down-prod     - Stop production environment"
	@echo "  shell         - Open shell in container"
	@echo "  test          - Run tests"
	@echo "  lint          - Run linting"
	@echo "  lint:fix      - Fix linting issues"
	@echo "  format        - Format code"
	@echo "  format:check  - Check code formatting"
	@echo "  type-check    - Run TypeScript type checking"
	@echo "  build         - Build Docker images"
	@echo "  logs          - Show all logs"
	@echo "  logs:app      - Show application logs only"
	@echo "  health        - Check service health"
	@echo "  reset         - Reset development environment"
	@echo "  clean         - Clean Docker system"
	@echo "  clean:images  - Clean Docker images"
	@echo "  clean:all     - Clean everything"
	@echo "  setup         - Setup development environment"
	@echo "  setup:prod    - Setup production environment"
	@echo "  help          - Show this help"
