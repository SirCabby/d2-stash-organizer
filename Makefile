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

# Options of grail-filter, like `make grail-filter DRY_RUN=1` (see help)
GRAIL_FILTER_FLAGS = $(if $(SAVE_DIR),--save-dir "$(SAVE_DIR)") \
	$(if $(STASH),--stash "$(STASH)") \
	$(if $(FILTER_PROFILE),--profile "$(FILTER_PROFILE)") \
	$(if $(ALL_SAVES),--all-saves) \
	$(if $(DRY_RUN),--dry-run)

.PHONY: grail-filter
grail-filter: ## Scope the loot filter's grail rules to the grail items without a perfect copy in the offline stash
	npm run grail-filter -- $(GRAIL_FILTER_FLAGS)

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
	@echo "  make grail-filter    - Scope the loot filter's grail rules to the grail items without a perfect copy in the offline stash"
	@echo "  make kill-port       - Kill any process using port 10001"
	@echo ""
	@echo "Environment variables for extract-d2r:"
	@echo "  D2R_PATH      - D2R install dir (default: C:\Program Files (x86)\Diablo II Resurrected;"
	@echo "                  on Linux, the Lutris or Wine prefix's drive_c/Program Files (x86)/Diablo II Resurrected)"
	@echo "  CASCLIB_PATH  - Path to CascLib (default: D2RMM's CascLib.dll on Windows,"
	@echo "                  $(CASCLIB_DIR)/build/libcasc.so elsewhere)"
	@echo ""
	@echo "Variables for grail-filter (e.g. make grail-filter DRY_RUN=1):"
	@echo "  SAVE_DIR        - Save folder with the offline stash and the loot filter profiles"
	@echo "                    (default: the first of D2R's save folders, mods first, with an offline stash)"
	@echo "  STASH           - Offline stash (default: the save folder's shared .d2x stash)"
	@echo "  FILTER_PROFILE  - Only update this loot filter profile (default: all of them)"
	@echo "  ALL_SAVES=1     - Also count the grail items of the save folder's characters and other stashes"
	@echo "  DRY_RUN=1       - Show the changes without saving them"
