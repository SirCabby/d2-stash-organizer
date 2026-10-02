import { Item } from "./types/Item";
import { Modifier } from "./types/Modifier";
import { SaveFileReader } from "../save-file/SaveFileReader";
import { fromBinary, fromInt } from "../save-file/binary";
import { parseItemOnce } from "./parsing/parseItem";
import { LAST_LEGACY } from "../character/parsing/versions";
import { describeSingleMod } from "./post-processing/describeSingleMod";
import { isThrowingWeapon, maxQuantity, statTotals } from "./tooltipStats";

// Where the item's fields are in its raw string now: converting between
// legacy and D2R formats moves them, so the indexes from loading can be off.
// `owner` decides the format. Moves only update the owner of the item itself,
// so the items in its sockets must be parsed with its owner.
export function parseAgain(item: Item, owner = item.owner) {
  const reader = new SaveFileReader(new Uint8Array(fromBinary(item.raw)));
  // Legacy items with the D2R extra bit were parsed skipping it (see parseItem)
  const skipExtraBit = owner.version <= LAST_LEGACY && !!item.hasD2rExtraBit;
  try {
    const parsed = parseItemOnce(reader, owner, 0, skipExtraBit);
    // Only trust the indexes if parsing read exactly the item's bits
    return parsed.raw === item.raw ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function sumOf(mods: Modifier[], stat: string) {
  return mods
    .filter((mod) => mod.stat === stat)
    .reduce((total, mod) => total + (mod.value ?? 0), 0);
}

/**
 * The durability of the item once repaired. Like the game, its flat bonuses
 * add to its max, then its percentage applies.
 */
export function fullDurability(item: Item): number {
  const mods = item.modifiers ?? [];
  const flat = (item.durability?.[1] ?? 0) + sumOf(mods, "maxdurability");
  const percent = sumOf(mods, "item_maxdurability_percent");
  return flat + Math.floor((flat * percent) / 100);
}

/**
 * Gives the item full durability and charges, and a full stack to throwing
 * weapons like repairing them at a vendor does, in its raw string too so that
 * saving keeps them. Returns how many of those it changed.
 */
export function repairItem(item: Item): number {
  const parsed = item.simple ? undefined : parseAgain(item);
  if (!parsed) {
    return 0;
  }
  const mods = parsed.modifiers ?? [];
  let raw = item.raw;
  let repaired = 0;

  if (parsed.durability && parsed.durabilityIndex !== undefined) {
    const [current, max] = parsed.durability;
    // Current durability is 9 bits
    const full = Math.min(fullDurability(parsed), 511);
    if (current !== full) {
      const index = parsed.durabilityIndex;
      raw = raw.slice(0, index) + fromInt(full, 9) + raw.slice(index + 9);
      item.durability = [full, max];
      repaired++;
    }
  }

  if (parsed.quantityIndex !== undefined && isThrowingWeapon(parsed)) {
    const full = maxQuantity(parsed, statTotals(parsed));
    if (parsed.quantity !== full) {
      const index = parsed.quantityIndex;
      raw = raw.slice(0, index) + fromInt(full, 9) + raw.slice(index + 9);
      item.quantity = full;
      repaired++;
    }
  }

  for (const mod of mods) {
    if (mod.chargesIndex !== undefined && mod.charges !== mod.maxCharges) {
      // The max charges come right after, with the same size and bias
      const index = mod.chargesIndex;
      raw =
        raw.slice(0, index) +
        raw.slice(index + 8, index + 16) +
        raw.slice(index + 8);
      repaired++;
    }
  }
  for (const mod of item.modifiers ?? []) {
    if (mod.maxCharges !== undefined && mod.charges !== mod.maxCharges) {
      mod.charges = mod.maxCharges;
      mod.description = describeSingleMod(mod);
    }
  }

  item.raw = raw;
  return repaired;
}
