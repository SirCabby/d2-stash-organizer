# Makefile for d2-stash-organizer

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: regenerate
regenerate: install ## Regenerate game data files
	npm run game-strings
	npm run game-data

.PHONY: build
build: install ## Build the project
	npm run build

.PHONY: run
run: install ## Start development server
	npm run watch

.PHONY: help
help: ## Show this help
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make build      - Build the project"
	@echo "  make run        - Start development server"
	@echo "  make regenerate - Regenerate game data files"
