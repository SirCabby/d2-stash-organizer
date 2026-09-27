# Makefile for d2-stash-organizer

# The targets form a pipeline (setup extracts the game data before building
# with it), so they must run one after another, even under `make -j`.
.NOTPARALLEL:

# Windows extracts with D2RMM's CascLib.dll; elsewhere, `make casclib` builds
# CascLib first. GNU Make sets OS=Windows_NT only on Windows.
ifeq ($(OS),Windows_NT)
  KILL_PORT := kill_port.bat
  EXTRACT_DEPS :=
else
  KILL_PORT := fuser -k 10001/tcp || true
  EXTRACT_DEPS := casclib
endif

CASCLIB_VERSION := 3.0
CASCLIB_DIR := tools/CascLib

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: casclib
casclib: $(CASCLIB_DIR)/build/libcasc.so ## Build CascLib, which extract-d2r needs outside Windows

$(CASCLIB_DIR)/build/libcasc.so:
	rm -rf $(CASCLIB_DIR)
	git -c advice.detachedHead=false clone --depth 1 --branch $(CASCLIB_VERSION) https://github.com/ladislav-zezula/CascLib.git $(CASCLIB_DIR)
	cmake -S $(CASCLIB_DIR) -B $(CASCLIB_DIR)/build -DCMAKE_BUILD_TYPE=Release
	cmake --build $(CASCLIB_DIR)/build

.PHONY: extract-d2r
extract-d2r: $(EXTRACT_DEPS) ## Extract game data from D2R CASC archives
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
	@$(KILL_PORT)

.PHONY: run
run: build kill-port ## Start development server
	npm run watch

.PHONY: help
help: ## Show this help
	@echo "Available commands:"
	@echo "  make setup           - Full setup from D2R install (extract + build)"
	@echo "  make install         - Install dependencies"
	@echo "  make casclib         - Build CascLib into $(CASCLIB_DIR) (extract-d2r does it outside Windows)"
	@echo "  make extract-d2r     - Extract game data from D2R CASC archives"
	@echo "  make convert-rotw    - Convert RotW string JSONs to legacy format"
	@echo "  make regenerate      - Regenerate game data JSON from txt sources"
	@echo "  make regenerate-all  - Full pipeline: convert RotW + regenerate JSON"
	@echo "  make build           - Regenerate + build the project into docs/"
	@echo "  make build-all       - Full pipeline: convert RotW + regenerate + build"
	@echo "  make run             - Start development server"
	@echo "  make kill-port       - Kill any process using port 10001"
	@echo ""
	@echo "Environment variables for extract-d2r:"
	@echo "  D2R_PATH      - D2R install dir (default: C:\Program Files (x86)\Diablo II Resurrected;"
	@echo "                  on Linux, the Lutris or Wine prefix's drive_c/Program Files (x86)/Diablo II Resurrected)"
	@echo "  CASCLIB_PATH  - Path to CascLib (default: D2RMM's CascLib.dll on Windows,"
	@echo "                  $(CASCLIB_DIR)/build/libcasc.so elsewhere)"
