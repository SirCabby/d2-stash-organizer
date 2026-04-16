# D2 Stash Organizer - Project Rules

## Project Overview
This is a TypeScript/Preact web app for organizing Diablo 2 stash files (PlugY and D2R). It runs entirely client-side in the browser. The project is built and tested on Windows.

## Build and Validation
- **Always run `make build` to validate code changes**
- The build process includes:
  - Code formatting with Prettier
  - Linting with ESLint (zero warnings allowed)
  - TypeScript compilation
  - Rollup bundling for production

## Windows-Specific Considerations
- This project is designed for Windows environments
- Use Windows-compatible commands and paths
- The build system uses Windows batch files (e.g., `kill_port.bat`)
- File operations should use Windows path separators when necessary

## Development Workflow
1. Make code changes
2. Run `make build` to validate
3. Fix any linting or compilation errors
4. Test functionality
5. Commit changes

## Key Commands
- `make install` - Install dependencies
- `make build` - Build and validate the project
- `make run` - Start development server
- `make regenerate` - Regenerate game data files

## Code Quality Standards
- Follow TypeScript best practices
- Maintain zero ESLint warnings
- Use Prettier for consistent formatting
- Write clear, documented code

## File Structure
- Source code in `src/` directory
- Game data in `game-data/` directory
- Web interface in `src/web/` directory
- Scripts in `src/scripts/` directory
- Temporary outputs in `Output/` directory

## Debugging and Output Management
- **All temporary debugging outputs must go to the `Output/` folder**
- Reuse existing output files when possible instead of generating new ones
- Use descriptive filenames for output files (e.g., `build_output.txt`, `lint_output.txt`)
- Clean up old output files periodically to prevent clutter
- Console logs, build outputs, and temporary data should be directed to appropriate files in `Output/`

---

## Item Processing Architecture

### postProcessItem is NOT Idempotent

`postProcessItem` (`src/scripts/items/post-processing/postProcessItem.ts`) must be called **exactly once** per item. It performs cumulative operations that corrupt data if repeated:

- **`addSocketedMods`**: Pushes gem/rune/jewel modifier values onto `item.modifiers`. A second call doubles socketed bonuses (e.g. +19 all res from a diamond becomes +38).
- **`consolidateMods`**: Merges duplicate modifier IDs by summing values. After doubled mods are pushed, consolidation inflates totals further.
- **`describeMods`**: Appends modifier descriptions to `item.search`. Re-calling duplicates all search text.
- **`computePerfectionScore`**: Computes scores based on current modifier values. Inflated mods produce incorrect scores.

**When postProcessItem is called:**
- During initial parsing only, via `postProcessStash` (PlugY/D2R) or `postProcessCharacter`.
- `postProcessStash` also sets `item.owner` and `item.page` on each item.
- After that initial call, **never call postProcessItem again** on already-processed items.

**If you need to update items after mutation (repair, top-off, etc.):**
- Modify the in-memory properties directly (e.g. `item.durability[0]`, `mod.charges`).
- If items move between pages, update `item.owner` and `item.page` with a simple assignment loop — do NOT call `postProcessStash` or `postProcessItem`.
- Only call `postProcessItem` on **newly created** items that have never been post-processed.

### Stash Location Types and Item Structure Differences

The codebase handles three owner types with different item binary formats:

| Owner Type | Type Guard | Item Format | Padding | Dedicated Tab |
|---|---|---|---|---|
| PlugY Stash | `isPlugyStash(owner)` | Legacy (v96) | None | No |
| D2R Stash | `isD2rStash(owner)` | D2R (v97+) | `d2rPadding: true` for regular pages | RotW variant only |
| Character | `isCharacter(owner)` | Matches character version | `d2rPadding` if D2R char | No |

**Key structural differences by location:**

1. **D2R regular page items** vs **D2R dedicated tab items**:
   - Byte size: regular = `floor(bits/8) + 1`; dedicated tab = `ceil(bits/8)`
   - Write padding: regular pages need `d2rPadding: true`; dedicated tab does not
   - Simple item extra byte: regular = opaque realm data; dedicated tab = stack quantity
   - Location field: regular = `ItemLocation.STORED`; dedicated tab = `ItemLocation.CURSOR`

2. **D2R items** vs **Legacy (PlugY) items**:
   - D2R items have a bit offset (`D2R_OFFSET`) affecting position and other field locations in raw binary
   - Item codes: D2R uses Huffman encoding; legacy uses 4-byte ASCII
   - Version field: D2R = 3 bits; legacy = 10 bits
   - Personalized names: D2R = 8-bit chars; legacy = 7-bit chars
   - Realm data size: D2R = 4×32 bits; legacy = 3×32 bits

3. **Save file writes use `item.raw` directly** (`writeItemList` → `fromBinary(item.raw)`). Property changes (durability, charges, position) must update the raw binary string to persist. Use `positionItem()` for position updates. Durability and charges currently only modify in-memory properties.

### Settings Page Handler Guidelines

The settings page (`src/web/settings/Settings.tsx`) has bulk-operation buttons. When implementing or modifying these handlers:

- **Never call `postProcessStash` or `postProcessItem` on items that were already post-processed during initial parse.** This was a past bug that corrupted socketed mod values and search text, with severity depending on stash location (stash items were triple-processed while character items were only double-processed).
- For newly created items (e.g. `refillDedicatedTab` creating new dedicated tab slots), call `postProcessItem` only on those new items.
- After `organize()` reshuffles pages, update `item.owner` and `item.page` with a direct loop — not via `postProcessStash`.

### Past Bug Reference

- **Socket doubling**: D2R format has an extra bit before the 4-bit sockets field. Misreading this bit doubled socket counts in the UI. Fixed by right-shifting after handling the D2R extra bit in `parseItem.ts`.
- **Mercenary parsing misalignment**: `hasMercenary` was read from hardcoded offset 179 which shifted in RotW. Fixed by peeking for the "JM" header after the "jf" marker.
- **postProcessItem double/triple call**: Settings handlers called `postProcessItem` multiple times on already-processed items, causing inflated modifier values on stash items. Fixed by removing all re-post-processing from repair/top-off/refill handlers.
- **Missing mercenary item list header**: `characterToSaveFile` skipped writing the "JM" item list header when a character had zero mercenary items. D2R expects the `"jf" + "JM" + count(0)` sequence to always be present; omitting "JM" caused the game to fail to join. Fixed by always calling `writeItemList` for mercenary items even when the list is empty.