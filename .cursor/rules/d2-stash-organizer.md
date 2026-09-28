# D2 Stash Organizer - Project Rules

## Project Overview
This is a TypeScript/Preact web app for organizing Diablo 2 stash files (PlugY and D2R). It runs entirely client-side in the browser. The project is built and tested on Windows and Linux.

## Build and Validation
- **Always run `make build` to validate code changes**
- The build process includes:
  - Code formatting with Prettier
  - Linting with ESLint (zero warnings allowed)
  - TypeScript compilation
  - Rollup bundling for production

## Platform Considerations
- The project is built on both Windows and Linux: keep commands and paths working on both
- Use the Makefile rather than raw npm scripts. It branches on `OS=Windows_NT` (e.g. `kill_port.bat` on Windows, `fuser` elsewhere) and sets `.NOTPARALLEL`, because its targets form a pipeline and the owner runs `make -j16`
- Game data extraction (`make extract-d2r`) needs CascLib: D2RMM's `CascLib.dll` on Windows; on Linux, `make casclib` builds `tools/CascLib/build/libcasc.so` (git-ignored). The D2R install defaults to Lutris' `~/Games/battlenet` Wine prefix, then `~/.wine`; override with `D2R_PATH`

## Development Workflow
1. Make code changes
2. Run `make build` to validate
3. Fix any linting or compilation errors
4. Test functionality
5. Commit changes

## Key Commands
- `make setup` - First run: install dependencies, extract D2R game data, and build
- `make install` - Install dependencies
- `make build` - Build and validate the project
- `make run` - Start development server
- `make regenerate` - Regenerate game data files
- `make extract-d2r` - Re-extract game data after a game update

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
- **RotW simple-item realm data**: v105 sets the realm-data flag on simple items (runes in sockets, potions in the belt), followed by 128 bits of realm data, like non-simple items. The parser read that flag as the 1-bit socket count, lost alignment after the first such item, and `parseItemList` silently dropped the rest of the list (46 of a character's items). `parseSimple` now reads the flag and data for D2R simple items, and `toD2` truncates simple items right after their code instead of guessing their tail.
- **Tooltip format strings**: D2R mod strings carry their own printf-style values (`%+d to Maximum Damage`, `%0%% Reanimate as: %1`), but the stat groups and several descfuncs added the value next to the string and only replaced `%d`, showing `+4 %+d to Maximum Damage`. `describeSingleMod` fills every string with `formatGameString` and appends `descstr2` ("(Based on Character Level)"). Skill tabs now come from CharStats.txt (with the Warlock's), and reanimate targets from MonStats.txt, so `make extract-d2r` must have been run since. The Properties parser also read `set` instead of `val`, which dropped the class from set bonuses' "+X to class skills" (all shown as Amazon).

---

## Saving and the GameStateTracker Companion Site

This site also runs as a GameStateTracker (GST) companion site. GST serves the production build (`docs/`) from a local path at `/companion-sites/<id>/` and embeds it in an iframe with `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"`. The tool does not read GST's save data: users upload their saves as usual.

- **GST setup**: add a companion site with Local Path = this repo's `docs/` (after `make build`); the URL Template can be empty. A hosted Base URL does not work embedded, because Chromium refuses file pickers in cross-origin iframes.
- **Keep every emitted URL relative** (scripts, `assets/`, `examples/`): the site is served from a sub-path.
- **No network calls or analytics**: GST is a local, offline-first tool.
- **Saving goes through `src/web/store/saveLocation.ts`**. Uploads keep File System Access handles (Chromium only) in IndexedDB (`save_location` store), and saving writes back through them. GST's iframe sandbox blocks downloads, so writing in place is the only way to save from the embedded view; the download fallback for other browsers only works in a new tab.
- **The save location changes together with the collection**: uploads parse every file before storing anything, and `writeAllFiles` / `writeSaveFile` store the new location in the same IndexedDB transaction as the files. Otherwise a save could write one folder's characters into another folder.
- **Saving stays all or nothing** (`writeToSaveLocation`): every destination and permission is resolved before writing, and every file is staged before any is committed. Saving some characters but not others duplicates or loses the items moved between them.
- **Never write what wasn't fully read** (`toSaveFile` in `src/web/store/parser.ts`): `parseItemList` skips the rest of a list after an item it can't parse, so rewriting that file would drop those items. `parseSaveFile` records every file that doesn't re-serialize to its exact bytes; `toSaveFile` returns such a file's original bytes while it's unchanged and throws once something changes it. Every persistence path (IndexedDB working copy, in-place save, download) goes through `toSaveFile`.
- **Never overwrite a newer file**: the save location records each file's disk `lastModified` when it's loaded or saved (`versions`), and `writeToSaveLocation` refuses to write if any file on disk changed since (typically the game saving it).

---

## Grail Tracker

The tracker mirrors the game's own tools: the Chronicle (its grail) decides what counts, and the loot filter decides the grouping.

- **What counts** (`listGrailItems`): uniques and set items the Chronicle tracks (`inChronicle`, from the `disableChronicle` column), minus quest items (qlevel 0). That leaves out what can't be found anymore (Constricting Ring, the Crystal Sword Azurewrath, the Warlord's Glory set, the pre-RotW sunder charms) and the crafted Renewed sunders. RotW replaced UniqueItems.txt's `enabled` column with `disabled`, which no row sets, so `enabled` alone no longer excludes anything.
- **Grouping**: uniques go under Armor, Weapons and Accessories, one section per loot filter category, split into Normal/Exceptional/Elite for armor and weapons. Each item type's category is ItemTypes.txt's `UICategory` column (`ItemTypeCategories.json`), or its parent type's when empty. Uniques of a category the list doesn't know yet land in an "Other" section instead of disappearing. Sets stay one section per set, like in the Chronicle.
- **The organizer keeps its own list** (`listGrailUniques` and `UNIQUES_ORDER`): `fillTemplate` throws for a unique that has no spot in its section's template, so the organizer's grail pages keep every enabled unique, whether the Chronicle tracks it or not.
- **Always-ethereal uniques** (Ethereal Edge, Ghostflame, Shadow Killer, Wraith Flight have the `ethereal` property): their ethereal copy is the normal grail entry (`isAlwaysEthereal`), and they have no eth entry.

---

## Loot Filter Grail Rules

`make grail-filter` (`src/scripts/loot-filter/updateGrailFilter.ts`) rewrites the Show rules with "grail" in their name, in every loot filter profile of the save folder, so that they only show the bases of the grail items missing from the offline stash (`scopeGrailRules`). The filter can't tell ethereal items apart, so there is no eth rule: a unique rule also shows the bases of the uniques still missing their ethereal copy.

- **Profiles** are `<name>.fltr` files next to the saves (`mods/D2RMM/` under D2RMM), written by the game as `JSON.stringify(profile, null, 4)` with no trailing newline; `lootfilter.json` maps characters to profiles. The game was seen rewriting a profile when it was edited in game, and not when it exited.
- **Matching**: in a rule, categories and item codes add up (a category is a whole checked branch of the tree), and so do the rarities. A rule without categories or codes matches all equipment, so a grail rule with nothing missing is disabled rather than emptied. Item codes are base codes, so the rules can't tell apart two uniques of the same base.
- **`filterEtherealSocketed`** is the "Ethereal / Socketed" box of the rarity list: it adds gray (ethereal or socketed) items to the rule and can't limit a rule to ethereal items, per the Blizzard forums and filter authors. The executable is encrypted on disk, so this couldn't be checked in its code.
- **Game detection**: on Linux, Lutris' umu/proton wrappers keep `D2RLoader.exe` in their command line after the game exits, so `isGameRunning` only looks at the process name and the command line's first argument.
