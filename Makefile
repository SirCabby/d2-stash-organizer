# Makefile for d2-stash-organizer

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: extract-d2r
extract-d2r: ## Extract game data from D2R CASC archives (needs D2RMM for CascLib.dll)
	npm run extract-d2r

.PHONY: convert-rotw
convert-rotw: ## Convert RotW string JSONs to legacy format + item-modifiers.json
	npm run convert-rotw

.PHONY: regenerate
regenerate: ## Regenerate game data JSON files from txt sources
	npm run game-strings
	npm run game-data

.PHONY: regenerate-all
regenerate-all: convert-rotw regenerate ## Full pipeline: convert RotW strings then regenerate all JSON

.PHONY: build
build: regenerate ## Build the project
	npm run build

.PHONY: build-all
build-all: regenerate-all ## Full pipeline: convert RotW, regenerate, then build
	npm run build

.PHONY: setup
setup: install extract-d2r build-all ## Full setup: install deps, extract D2R data, and build

.PHONY: kill-port
kill-port: ## Kill any process using port 10001
	@kill_port.bat

.PHONY: run
run: build kill-port ## Start development server
	npm run watch

.PHONY: help
help: ## Show this help
	@echo "Available commands:"
	@echo "  make setup           - Full setup from D2R install (extract + build)"
	@echo "  make install         - Install dependencies"
	@echo "  make extract-d2r     - Extract game data from D2R CASC archives"
	@echo "  make convert-rotw    - Convert RotW string JSONs to legacy format"
	@echo "  make regenerate      - Regenerate game data JSON from txt sources"
	@echo "  make regenerate-all  - Full pipeline: convert RotW + regenerate JSON"
	@echo "  make build           - Regenerate + build the project"
	@echo "  make build-all       - Full pipeline: convert RotW + regenerate + build"
	@echo "  make run             - Start development server"
	@echo "  make kill-port       - Kill any process using port 10001"
	@echo ""
	@echo "Environment variables for extract-d2r:"
	@echo "  D2R_PATH      - D2R install dir (default: C:\Program Files (x86)\Diablo II Resurrected)"
	@echo "  CASCLIB_PATH   - Path to CascLib.dll (auto-detected from D2RMM if not set)"
