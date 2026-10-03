import { Item } from "../types/Item";
import { ItemQuality } from "../types/ItemQuality";
import {
  ARMORS,
  AUTO_MAGIC,
  MAGIC_PREFIXES,
  MAGIC_SUFFIXES,
  MagicAffix,
  MISC,
  SET_ITEMS,
  SKILLS,
  UNIQUE_ITEMS,
  WEAPONS,
} from "../../../game-data";

// One below the highest character level
const MAX_CRAFTED_LEVEL = 98;

// The levels the item's affixes need. 0 is no affix.
function affixLevels(affixes: MagicAffix[], ids: number[] = []) {
  return ids
    .filter((id) => id > 0 && affixes[id])
    .map((id) => affixes[id].reqlevel);
}

/**
 * The character level the item needs, computed like the game does (D2Common's
 * ITEMS_GetRequiredLevel) for no character in particular: some affixes need
 * less for one class, and skills from another class need 6 more levels. The
 * items in its sockets need theirs too, which postProcessItem adds.
 */
export function requiredLevel(item: Item) {
  let level = 0;
  const affixes = [
    ...affixLevels(MAGIC_PREFIXES, item.prefixes),
    ...affixLevels(MAGIC_SUFFIXES, item.suffixes),
  ];
  switch (item.quality) {
    case ItemQuality.MAGIC:
    case ItemQuality.RARE:
      level = Math.max(
        0,
        ...affixes,
        // The mod class-specific items get on top of their affixes
        ...affixLevels(AUTO_MAGIC, [item.classSpecificAffix ?? 0])
      );
      break;
    case ItemQuality.CRAFTED:
      level = Math.min(
        Math.max(0, ...affixes) + 10 + 3 * affixes.length,
        MAX_CRAFTED_LEVEL
      );
      break;
    case ItemQuality.SET:
      level = SET_ITEMS[item.unique ?? -1]?.levelReq ?? 0;
      break;
    case ItemQuality.UNIQUE:
      level = UNIQUE_ITEMS[item.unique ?? -1]?.reqlevel ?? 0;
      break;
  }

  const base = ARMORS[item.code] ?? WEAPONS[item.code] ?? MISC[item.code];
  level = Math.max(level, base?.levelReq ?? 0);

  for (const { stat, param } of item.modifiers ?? []) {
    const skillLevel = SKILLS[param ?? -1]?.reqLevel ?? 0;
    // "+3 to Fire Ball (Sorceress Only)"
    if (stat === "item_singleskill") {
      level = Math.max(level, skillLevel);
    }
    // "+1 to Teleport", which any class can use
    if (stat === "item_nonclassskill") {
      level = Math.max(level, skillLevel + 6);
    }
  }
  return level;
}
