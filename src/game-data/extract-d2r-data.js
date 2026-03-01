/**
 * Extracts game data files from D2R CASC archives using CascLib.dll.
 *
 * Requires:
 *   - D2R installed (default: C:\Program Files (x86)\Diablo II Resurrected)
 *   - D2RMM installed (provides CascLib.dll)
 *
 * Override paths via environment variables:
 *   D2R_PATH     - D2R installation directory
 *   CASCLIB_PATH - Full path to CascLib.dll
 */
const koffi = require("koffi");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const DEFAULT_D2R_PATH =
  "C:\\Program Files (x86)\\Diablo II Resurrected";

// Excel data tables to extract from global\excel\
const EXCEL_FILES = {
  "armor.txt": "Armor.txt",
  "books.txt": "Books.txt",
  "charstats.txt": "CharStats.txt",
  "gems.txt": "Gems.txt",
  "itemstatcost.txt": "ItemStatCost.txt",
  "itemtypes.txt": "ItemTypes.txt",
  "magicprefix.txt": "MagicPrefix.txt",
  "magicsuffix.txt": "MagicSuffix.txt",
  "misc.txt": "Misc.txt",
  "playerclass.txt": "PlayerClass.txt",
  "properties.txt": "Properties.txt",
  "rareprefix.txt": "RarePrefix.txt",
  "raresuffix.txt": "RareSuffix.txt",
  "runes.txt": "Runes.txt",
  "setitems.txt": "SetItems.txt",
  "sets.txt": "Sets.txt",
  "skilldesc.txt": "SkillDesc.txt",
  "skills.txt": "Skills.txt",
  "treasureclassex.txt": "TreasureClassEx.txt",
  "uniqueitems.txt": "UniqueItems.txt",
  "weapons.txt": "Weapons.txt",
};

// String JSON files from local\lng\strings\
const STRING_JSON_FILES = [
  "item-gems.json",
  "item-modifiers.json",
  "item-nameaffixes.json",
  "item-names.json",
  "item-runes.json",
  "skills.json",
  "ui.json",
  "levels.json",
  "mercenaries.json",
  "monsters.json",
  "npcs.json",
  "objects.json",
  "quests.json",
  "shrines.json",
  "vo.json",
];

// Files that should also be saved with a d2r- prefix (RotW additions use this naming)
const D2R_ALIAS_FILES = [
  "item-modifiers.json",
  "item-names.json",
  "item-runes.json",
  "skills.json",
  "ui.json",
];

function findCascLib() {
  if (process.env.CASCLIB_PATH) {
    if (fs.existsSync(process.env.CASCLIB_PATH)) {
      return process.env.CASCLIB_PATH;
    }
    console.error(`CASCLIB_PATH not found: ${process.env.CASCLIB_PATH}`);
    process.exit(1);
  }

  // Search for D2RMM process to find its installation path
  const searchPaths = [];
  try {
    const psOutput = execSync(
      'powershell -Command "(Get-Process -Name D2RMM -ErrorAction SilentlyContinue | Select-Object -First 1).Path"',
      { encoding: "utf-8", timeout: 10000 }
    ).trim();
    if (psOutput && fs.existsSync(psOutput)) {
      searchPaths.push(path.join(path.dirname(psOutput), "tools", "CascLib.dll"));
    }
  } catch {
    // D2RMM not running
  }

  // Common D2RMM locations
  const home = process.env.USERPROFILE || process.env.HOME || "";
  searchPaths.push(
    path.join(home, "AppData", "Local", "Programs", "D2RMM", "tools", "CascLib.dll"),
    path.join(home, "Google Drive", "Saves", "PC Games + Saved Games", "Diablo 2 Resurrected", "D2RMM 1.7.3", "tools", "CascLib.dll"),
    path.join(home, "Google Drive", "Saves", "PC Games + Saved Games", "Diablo 2 Resurrected", "D2RMM 1.7.4", "tools", "CascLib.dll"),
  );

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  console.error(
    "Could not find CascLib.dll. Install D2RMM or set CASCLIB_PATH.\n" +
    "Searched:\n" +
    searchPaths.map((p) => `  ${p}`).join("\n")
  );
  process.exit(1);
}

function loadCascLib(dllPath) {
  console.log(`Loading CascLib from: ${dllPath}`);
  const lib = koffi.load(dllPath);
  return {
    CascOpenStorage: lib.func("bool CascOpenStorage(str path, int flags, _Out_ void **storage)"),
    CascOpenFile: lib.func("bool CascOpenFile(void *storage, str filePath, int locale, int flags, _Out_ void **file)"),
    CascReadFile: lib.func("bool CascReadFile(void *file, void *buffer, int size, _Out_ uint32_t *bytesRead)"),
    CascCloseFile: lib.func("bool CascCloseFile(void *handle)"),
    CascCloseStorage: lib.func("bool CascCloseStorage(void *storage)"),
    GetCascError: lib.func("int GetCascError()"),
  };
}

function extractFile(casc, storage, cascPath) {
  const fileOut = [null];
  const fullPath = `data:data\\${cascPath}`;

  if (!casc.CascOpenFile(storage, fullPath, 0, 0, fileOut)) {
    return null;
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  const buffer = Buffer.alloc(MAX_SIZE);
  const bytesRead = [0];

  if (!casc.CascReadFile(fileOut[0], buffer, MAX_SIZE, bytesRead)) {
    casc.CascCloseFile(fileOut[0]);
    return null;
  }

  casc.CascCloseFile(fileOut[0]);

  // Trim to actual size and strip trailing null bytes
  let data = buffer.subarray(0, bytesRead[0]);
  const nullIdx = data.indexOf(0);
  if (nullIdx !== -1) {
    data = data.subarray(0, nullIdx);
  }
  return data;
}

function main() {
  const gameDir = process.env.D2R_PATH || DEFAULT_D2R_PATH;
  const gamePath = path.join(gameDir, "Data");

  if (!fs.existsSync(gamePath)) {
    console.error(
      `D2R Data directory not found: ${gamePath}\n` +
      "Set D2R_PATH to your D2R installation directory."
    );
    process.exit(1);
  }

  const cascLibPath = findCascLib();
  const casc = loadCascLib(cascLibPath);

  // Open CASC storage (try multiple path formats like D2RMM does)
  const openPaths = [`${gamePath}:osi`, `${gamePath}:`, gamePath];
  let storage = null;

  for (const p of openPaths) {
    const storageOut = [null];
    if (casc.CascOpenStorage(p, 0, storageOut)) {
      storage = storageOut[0];
      console.log(`Opened CASC storage: ${p}`);
      break;
    }
  }

  if (!storage) {
    console.error(`Failed to open CASC storage at ${gamePath} (error ${casc.GetCascError()})`);
    process.exit(1);
  }

  const rootDir = path.join(__dirname, "..", "..", "game-data");
  const rotwDir = path.join(rootDir, "txt-rotw");
  const rotwStringsDir = path.join(rotwDir, "strings");
  const txtDir = path.join(rootDir, "txt");

  fs.mkdirSync(rotwDir, { recursive: true });
  fs.mkdirSync(rotwStringsDir, { recursive: true });
  fs.mkdirSync(txtDir, { recursive: true });

  let extracted = 0;
  let failed = 0;

  // Extract excel data tables
  console.log("\n--- Extracting data tables ---");
  for (const [cascName, outputName] of Object.entries(EXCEL_FILES)) {
    const cascPath = `global\\excel\\${cascName}`;
    const data = extractFile(casc, storage, cascPath);
    if (data) {
      const rotwPath = path.join(rotwDir, outputName);
      const txtPath = path.join(txtDir, outputName);
      fs.writeFileSync(rotwPath, data);
      fs.writeFileSync(txtPath, data);
      console.log(`  ${outputName} (${data.length} bytes)`);
      extracted++;
    } else {
      console.warn(`  SKIP ${outputName} - not found in CASC (error ${casc.GetCascError()})`);
      failed++;
    }
  }

  // Extract string JSON files
  console.log("\n--- Extracting string files ---");
  for (const file of STRING_JSON_FILES) {
    const cascPath = `local\\lng\\strings\\${file}`;
    const data = extractFile(casc, storage, cascPath);
    if (data) {
      fs.writeFileSync(path.join(rotwStringsDir, file), data);
      console.log(`  ${file} (${data.length} bytes)`);
      extracted++;

      // RotW CASC contains updated versions; save with d2r- prefix too
      if (D2R_ALIAS_FILES.includes(file)) {
        const alias = `d2r-${file}`;
        fs.writeFileSync(path.join(rotwStringsDir, alias), data);
        console.log(`  ${alias} (copy)`);
      }
    } else {
      console.warn(`  SKIP ${file} - not found in CASC (error ${casc.GetCascError()})`);
      failed++;
    }
  }

  casc.CascCloseStorage(storage);

  console.log(`\nExtraction complete: ${extracted} files extracted, ${failed} skipped`);
  console.log(`  txt-rotw: ${rotwDir}`);
  console.log(`  txt:      ${txtDir}`);

  if (extracted === 0) {
    console.error("No files were extracted. Check your D2R installation.");
    process.exit(1);
  }
}

main();
