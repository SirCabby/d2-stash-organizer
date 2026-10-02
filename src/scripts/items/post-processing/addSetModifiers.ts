import { Item } from "../types/Item";
import { SET_ITEMS, SETS } from "../../../game-data";
import { ItemQuality } from "../types/ItemQuality";
import { generateFixedMods } from "./generateFixedMods";

/**
 * Adds global set modifiers to the item
 */
export function addSetMods(item: Item) {
  const setItem = item.quality === ItemQuality.SET && SET_ITEMS[item.unique!];
  const set = setItem && SETS[setItem.set];
  if (!set) return;

  item.setGlobalModifiers = set.modifiers.map((notRanges) =>
    generateFixedMods(notRanges)
  );
}
