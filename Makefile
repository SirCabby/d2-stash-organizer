# Makefile for d2-stash-organizer

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: regenerate
regenerate: ## Regenerate game data files
	npm run game-strings
	npm run game-data

.PHONY: build
build: regenerate ## Build the project
	npm run build

.PHONY: kill-port
kill-port: ## Kill any process using port 10001
	@kill_port.bat

.PHONY: run
run: build kill-port ## Start development server
	npm run watch

.PHONY: help
help: ## Show this help
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make build      - Build the project"
	@echo "  make run        - Start development server"
	@echo "  make regenerate - Regenerate game data files"
	@echo "  make kill-port  - Kill any process using port 10001"
