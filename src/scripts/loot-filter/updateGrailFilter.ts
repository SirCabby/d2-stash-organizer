/**
 * Scopes the loot filter's grail rules to the grail items that the offline
 * stash (the shared .d2x stash next to the saves) has no perfect copy of yet.
 * Run it again after finding new items, with `make grail-filter`.
 *
 * A grail rule is a Show rule with "grail" in its name, in any loot filter
 * profile (.fltr) of the save folder. It ends up showing the bases of the
 * missing items of its rarities (Unique, Set): items count as missing until
 * found with a perfection score of 100, and uniques until found perfect both
 * normal and ethereal, since the loot filter can't tell those apart. Nothing
 * else in the profile changes.
 *
 * Options:
 *   --save-dir <dir>  The save folder, with the offline stash and the loot
 *                     filter profiles. Default: the first of D2R's save
 *                     folders, mods first, that has an offline stash.
 *   --stash <file>    The offline stash. Default: the save folder's.
 *   --profile <name>  Only update this profile. Can be repeated.
 *   --all-saves       Also count the grail items of the save folder's
 *                     characters and other stashes.
 *   --dry-run         Show the changes without saving them.
 */
import { execSync } from "child_process";
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir, userInfo } from "os";
import { basename, dirname, join, resolve } from "path";
import { ARMORS, MISC, WEAPONS } from "../../game-data";
import { characterToSaveFile } from "../character/parsing/characterToSaveFile";
import { parseCharacter } from "../character/parsing/parseCharacter";
import { d2rStashToSaveFile } from "../d2r-stash/parsing/d2rStashToSaveFile";
import { parseD2rStash } from "../d2r-stash/parsing/parseD2rStash";
import {
  allStatuses,
  grailProgress,
  GrailStatus,
} from "../grail/list/grailProgress";
import { Item } from "../items/types/Item";
import { getAllItems } from "../plugy-stash/getAllItems";
import { parsePlugyStash } from "../plugy-stash/parsing/parsePlugyStash";
import { plugyStashToSaveFile } from "../plugy-stash/parsing/plugyStashToSaveFile";
import { isCharacter, isPlugyStash, ItemsOwner } from "../save-file/ownership";
import {
  GrailRuleUpdate,
  MissingGrailItem,
  scopeGrailRules,
} from "./scopeGrailRules";
import { LootFilterProfile } from "./types";

const SAVE_EXTENSIONS = [".d2s", ".d2i", ".d2x", ".sss"];
const PROFILE_EXTENSION = ".fltr";

interface Options {
  saveDir?: string;
  stash?: string;
  profiles: string[];
  allSaves: boolean;
  dryRun: boolean;
}

function parseOptions(args: string[]) {
  const options: Options = { profiles: [], allSaves: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    const value = () => {
      const next = args[++i];
      if (typeof next === "undefined") {
        throw new Error(`${option} needs a value.`);
      }
      return next;
    };
    switch (option) {
      case "--save-dir":
        options.saveDir = value();
        break;
      case "--stash":
        options.stash = value();
        break;
      case "--profile":
        options.profiles.push(value());
        break;
      case "--all-saves":
        options.allSaves = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown option: ${option}`);
    }
  }
  return options;
}

// D2R saves in Saved Games. Outside Windows, that's in the Wine prefix that
// Battle.net runs in: Lutris' first, then Wine's, like extract-d2r. The game
// runs as steamuser under Proton, and as the user under Wine.
function savedGamesFolders() {
  if (process.platform === "win32") {
    return [join(process.env.USERPROFILE || homedir(), "Saved Games")];
  }
  const users = ["steamuser", userInfo().username];
  return [["Games", "battlenet"], [".wine"]].flatMap((prefix) =>
    users.map((user) =>
      join(homedir(), ...prefix, "drive_c", "users", user, "Saved Games")
    )
  );
}

// A mod, like D2RMM's, saves in a folder of its own
function saveFolders() {
  return savedGamesFolders().flatMap((savedGames) => {
    const d2r = join(savedGames, "Diablo II Resurrected");
    const mods = join(d2r, "mods");
    const modFolders = existsSync(mods)
      ? readdirSync(mods, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map(({ name }) => join(mods, name))
      : [];
    return [...modFolders, d2r];
  });
}

// The offline stash is a shared .d2x stash: PlugY's personal ones are .d2x too
function offlineStashesIn(folder: string) {
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith(".d2x"))
    .map((name) => join(folder, name))
    .filter(
      (path) => readFileSync(path).subarray(0, 4).toString("latin1") === "SSS\0"
    );
}

function findSaveDir() {
  const folders = saveFolders();
  const saveDir = folders.find((folder) => offlineStashesIn(folder).length > 0);
  if (!saveDir) {
    throw new Error(
      `Found no offline stash in ${folders.join(
        ", "
      )}. Pick the save folder with --save-dir.`
    );
  }
  return saveDir;
}

function findStash(saveDir: string) {
  const stashes = offlineStashesIn(saveDir);
  if (stashes.length !== 1) {
    throw new Error(
      stashes.length === 0
        ? `Found no offline stash in ${saveDir}.`
        : `Found several offline stashes in ${saveDir}: pick one with --stash.`
    );
  }
  return stashes[0];
}

// The loot filter profiles of the save folder, or only the ones named
function findProfiles(saveDir: string, names: string[]) {
  const files = readdirSync(saveDir).filter((file) =>
    file.toLowerCase().endsWith(PROFILE_EXTENSION)
  );
  const profileName = (file: string) =>
    file.slice(0, -PROFILE_EXTENSION.length).toLowerCase();
  const unknown = names.filter(
    (name) => !files.some((file) => profileName(file) === name.toLowerCase())
  );
  if (unknown.length > 0) {
    throw new Error(
      `Found no loot filter profile named ${unknown.join(
        " or "
      )} in ${saveDir}, only: ${files
        .map((file) => file.slice(0, -PROFILE_EXTENSION.length))
        .join(", ")}.`
    );
  }
  return names.length === 0
    ? files
    : files.filter((file) =>
        names.some((name) => profileName(file) === name.toLowerCase())
      );
}

function serialize(owner: ItemsOwner) {
  if (isPlugyStash(owner)) {
    return plugyStashToSaveFile(owner);
  } else if (isCharacter(owner)) {
    return characterToSaveFile(owner);
  } else {
    return d2rStashToSaveFile(owner);
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

function readSave(path: string) {
  const raw = new Uint8Array(readFileSync(path));
  const file = { name: basename(path), lastModified: statSync(path).mtimeMs };
  const extension = file.name.slice(-4).toLowerCase();
  let owner: ItemsOwner;
  if (extension === ".d2s") {
    owner = parseCharacter(raw, file);
  } else if (extension === ".d2i") {
    owner = parseD2rStash(raw, file);
  } else {
    owner = parsePlugyStash(raw, file);
  }
  // The parsers skip the rest of a list after an item they can't read, so
  // only a fully read file comes out identical when written back
  if (!sameBytes(serialize(owner), raw)) {
    console.warn(
      `Warning: some items of ${file.name} could not be read, so they count as missing.`
    );
  }
  return owner;
}

function statusesOf(items: Item[]) {
  return allStatuses(grailProgress(items));
}

function printProgress(statuses: GrailStatus[]) {
  const uniques = statuses.filter(({ item }) => !("set" in item));
  const ethUniques = uniques.filter(
    ({ ethereal }) => typeof ethereal !== "undefined"
  );
  const sets = statuses.filter(({ item }) => "set" in item);
  const count = (
    list: GrailStatus[],
    isFound: (status: GrailStatus) => boolean | undefined
  ) => `${list.filter(isFound).length}/${list.length}`;
  const describe = (
    isFound: (status: GrailStatus) => boolean,
    isFoundEth: (status: GrailStatus) => boolean | undefined
  ) =>
    `${count(uniques, isFound)} uniques, ${count(
      ethUniques,
      isFoundEth
    )} ethereal uniques, ${count(sets, isFound)} set items`;
  console.log(
    `Grail: ${describe(
      ({ normal }) => normal,
      ({ ethereal }) => ethereal
    )}`
  );
  console.log(
    `Perfect: ${describe(
      ({ perfect }) => perfect,
      ({ perfectEth }) => perfectEth
    )}`
  );
}

// The perfect copies that a save's items would add to the offline stash's
function addedEntries(stashStatuses: GrailStatus[], statuses: GrailStatus[]) {
  const before = new Map(stashStatuses.map((status) => [status.item, status]));
  return statuses.flatMap(({ item, perfect, perfectEth }) => {
    const entries: string[] = [];
    if (perfect && !before.get(item)?.perfect) {
      entries.push(item.name);
    }
    if (perfectEth && !before.get(item)?.perfectEth) {
      entries.push(`${item.name} (eth)`);
    }
    return entries;
  });
}

function baseName(code: string) {
  return (ARMORS[code] ?? WEAPONS[code] ?? MISC[code])?.name ?? code;
}

// Like "Thresher (The Reaper's Toll)" for each base
function describeBases(
  codes: string[],
  items: { code: string; name: string }[]
) {
  return codes
    .map((code) => {
      const names = new Set(
        items.filter((item) => item.code === code).map(({ name }) => name)
      );
      return names.size > 0
        ? `${baseName(code)} (${[...names].join(", ")})`
        : baseName(code);
    })
    .join(", ");
}

function describeMissing(missing: MissingGrailItem[]) {
  const counts: [number, string][] = [
    [
      missing.filter(({ item, ethereal }) => !("set" in item) && !ethereal)
        .length,
      "uniques",
    ],
    [missing.filter(({ ethereal }) => ethereal).length, "ethereal uniques"],
    [missing.filter(({ item }) => "set" in item).length, "set items"],
  ];
  const described = counts
    .filter(([count]) => count > 0)
    .map(([count, kind]) => `${count} ${kind}`);
  return described.length > 0
    ? `a perfect copy of ${described.join(", ")}`
    : "nothing";
}

function printUpdate({
  before,
  after,
  missing,
  found,
  addedCodes,
  removedCodes,
}: GrailRuleUpdate) {
  const bases = after.equipmentItemCode?.length ?? 0;
  console.log(
    `  ${before.name}: missing ${describeMissing(missing)}, on ${bases} bases${
      after.enabled ? "" : " (rule disabled)"
    }`
  );
  const foundCodes = removedCodes.filter((code) =>
    found.some((item) => item.code === code)
  );
  const otherCodes = removedCodes.filter((code) => !foundCodes.includes(code));
  if (foundCodes.length > 0) {
    console.log(
      `    No longer shows, all found perfect: ${describeBases(
        foundCodes,
        found
      )}`
    );
  }
  if (otherCodes.length > 0) {
    console.log(
      `    No longer shows, not in the grail: ${describeBases(otherCodes, [])}`
    );
  }
  if (addedCodes.length > 0) {
    const names = missing.map(({ item, ethereal }) => ({
      code: item.code,
      name: ethereal ? `${item.name} (eth)` : item.name,
    }));
    console.log(`    Now shows: ${describeBases(addedCodes, names)}`);
  }
  if (before.equipmentCategory?.length) {
    console.log(
      `    Replaced the categories ${before.equipmentCategory.join(
        ", "
      )} with the bases of their missing items`
    );
  }
  if (before.enabled && !after.enabled) {
    console.log(
      "    Disabled: everything is perfect, and with no item codes it would show everything"
    );
  }
}

// Whether D2R runs, directly or through D2RLoader
function isGameRunning() {
  const gameExe = /^D2R(Loader)?\.exe$/i;
  try {
    if (process.platform === "win32") {
      return execSync("tasklist /FO CSV /NH", { encoding: "utf8" })
        .split(/\r?\n/)
        .some((line) => gameExe.test(line.split(",")[0].replace(/"/g, "")));
    }
    // Wine names its processes after their .exe, and starts their command
    // line with it. Lutris' launch wrappers, which can outlive the game, only
    // have it further in their command line.
    return readdirSync("/proc").some((pid) => {
      try {
        if (!/^\d+$/.test(pid)) {
          return false;
        }
        const name = readFileSync(`/proc/${pid}/comm`, "utf8").trim();
        const [exe] = readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
        return gameExe.test(name) || gameExe.test(exe.split(/[\\/]/).pop()!);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  const saveDir =
    options.saveDir ?? (options.stash ? dirname(options.stash) : findSaveDir());
  const stashPath = options.stash ?? findStash(saveDir);
  const profileFiles = findProfiles(saveDir, options.profiles);

  const stashItems = getAllItems(readSave(stashPath));
  console.log(`Offline stash: ${stashPath} (${stashItems.length} items)`);
  const stashStatuses = statusesOf(stashItems);

  let items = stashItems;
  const counted: string[] = [];
  const notInStash: string[] = [];
  const otherSaves = readdirSync(saveDir)
    .filter((name) =>
      SAVE_EXTENSIONS.some((extension) =>
        name.toLowerCase().endsWith(extension)
      )
    )
    .map((name) => join(saveDir, name))
    .filter((path) => resolve(path) !== resolve(stashPath));
  for (const path of otherSaves) {
    let saveItems: Item[];
    try {
      saveItems = getAllItems(readSave(path));
    } catch (e) {
      console.warn(
        `Warning: skipped ${basename(path)}: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      continue;
    }
    if (options.allSaves) {
      items = [...items, ...saveItems];
      counted.push(basename(path));
    } else {
      const entries = addedEntries(
        stashStatuses,
        statusesOf([...stashItems, ...saveItems])
      );
      if (entries.length > 0) {
        notInStash.push(`  ${basename(path)}: ${entries.join(", ")}`);
      }
    }
  }
  if (counted.length > 0) {
    console.log(`Also counting: ${counted.join(", ")}`);
  }
  const statuses = options.allSaves ? statusesOf(items) : stashStatuses;
  printProgress(statuses);

  let hasGrailRules = false;
  let saved = false;
  for (const file of profileFiles) {
    const path = join(saveDir, file);
    const text = readFileSync(path, "utf8");
    const profile = JSON.parse(
      text.replace(/^\uFEFF/, "")
    ) as LootFilterProfile;
    const {
      profile: scoped,
      updates,
      skipped,
    } = scopeGrailRules(profile, statuses);
    if (updates.length === 0 && skipped.length === 0) {
      continue;
    }
    hasGrailRules = true;
    console.log(`\n${file}`);
    updates.forEach(printUpdate);
    for (const { rule, reason } of skipped) {
      console.log(`  ${rule.name}: left as is, ${reason}`);
    }

    // The game writes its profiles the same way
    const output = JSON.stringify(scoped, null, 4);
    if (output === text) {
      console.log("  Already up to date");
    } else if (options.dryRun) {
      console.log("  Not saved: dry run");
    } else {
      copyFileSync(path, `${path}.bak`);
      // Written aside first, so the game can never read half a file
      writeFileSync(`${path}.tmp`, output);
      renameSync(`${path}.tmp`, path);
      saved = true;
      console.log(`  Saved, the previous version is in ${file}.bak`);
    }
  }
  if (!hasGrailRules) {
    console.log(
      `\nNo loot filter profile in ${saveDir} has a rule with "grail" in its name.`
    );
  }

  if (notInStash.length > 0) {
    console.log(
      "\nThe filter shows these until their perfect copies are in the offline stash (ALL_SAVES=1, or --all-saves, counts them already):"
    );
    notInStash.forEach((line) => console.log(line));
  }
  if (saved && isGameRunning()) {
    console.warn(
      "\nD2R is running: it may only load the new filter once restarted, and changing a loot filter in game before that could undo this update."
    );
  }
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
