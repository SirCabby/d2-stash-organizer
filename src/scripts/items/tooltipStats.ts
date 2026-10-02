import { ARMORS, CHAR_CLASSES, WEAPONS } from "../../game-data";
import { getBase } from "./getBase";
import { Item } from "./types/Item";
import { ItemQuality } from "./types/ItemQuality";

/*
 * The numbers at the top of an item's tooltip, computed like the game does
 * (D2Client's InventoryTooltips.cpp). Unlike the game's, they don't depend on
 * the character looking at the item: they leave out the damage per level, and
 * the attack speed, which comes from the class' animations.
 */

// The total of a stat over the item's mods, like "maxdamage"
export type StatTotal = (stat: string) => number;

export type ItemSummary = Pick<Item, "code" | "ethereal" | "quality">;

// The item's mods have its sockets' too
export function statTotals(item: Item): StatTotal {
  return (stat) =>
    (item.modifiers ?? [])
      .filter((mod) => mod.stat === stat)
      .reduce((total, mod) => total + (mod.value ?? 0), 0);
}

export function formatRange([low, high]: [number, number]) {
  return low === high ? `${low}` : `${low}-${high}`;
}

export interface Damage {
  label: string;
  min: number;
  max: number;
  // Raised by the item's mods, which the game shows in blue
  enhanced: boolean;
}

// In the order of the tooltip, with the stats of each line's flat damage
const DAMAGE = [
  [
    "Throw Damage",
    "throwDamage",
    "item_throw_mindamage",
    "item_throw_maxdamage",
  ],
  ["One-Hand Damage", "oneHandDamage", "mindamage", "maxdamage"],
  [
    "Two-Hand Damage",
    "twoHandDamage",
    "secondary_mindamage",
    "secondary_maxdamage",
  ],
] as const;

// Inferior weapons deal 3/4 of their base's damage, ethereal ones 3/2
function ownDamage(
  { ethereal, quality }: ItemSummary,
  damage: number,
  lowest: number
) {
  if (quality === ItemQuality.LOW && damage) {
    damage = Math.max(Math.trunc((3 * damage) / 4), lowest);
  }
  return ethereal ? Math.trunc((3 * damage) / 2) : damage;
}

/**
 * The weapon's damage, a line for each way it deals damage. Two-handed swords
 * get both hands' lines, like barbarians see them.
 */
export function weaponDamage(item: ItemSummary, total: StatTotal): Damage[] {
  const base = WEAPONS[item.code];
  // The game describes throwing potions' damage with their skill instead
  if (!base || base.type === "tpot") {
    return [];
  }
  const bothHands = !!base.oneHandDamage && !!base.twoHandDamage;
  const lines: Damage[] = [];
  for (const [label, field, minStat, maxStat] of DAMAGE) {
    const damage = base[field];
    if (!damage) {
      continue;
    }
    const baseMin = ownDamage(item, damage[0], 1);
    const baseMax = ownDamage(item, damage[1], 2);
    // Enhanced damage only multiplies the weapon's own damage
    const min =
      baseMin +
      Math.trunc((baseMin * total("item_mindamage_percent")) / 100) +
      total(minStat);
    let max =
      baseMax +
      Math.trunc((baseMax * total("item_maxdamage_percent")) / 100) +
      total(maxStat);
    const enhanced = min > baseMin || max > baseMax;
    max = Math.max(max, min);
    // The game keeps the max above the min only when it shows a single hand
    if (field !== "throwDamage" && !bothHands) {
      max = Math.max(max, min + 1);
    }
    lines.push({ label, min, max, enhanced });
  }
  return lines;
}

/**
 * A shield's chance to block, lowest and highest over the classes that can
 * use it: the game adds the class' own, up to 75%.
 */
export function blockChance(
  item: ItemSummary,
  total: StatTotal
): [number, number] | undefined {
  const base = ARMORS[item.code];
  if (base?.block === undefined) {
    return undefined;
  }
  const { block, classRequirement } = base;
  const chances = CHAR_CLASSES.filter(
    ({ code }) => !classRequirement || code === classRequirement
  ).map(({ blockFactor }) =>
    Math.min(block + total("toblock") + blockFactor, 75)
  );
  return [Math.min(...chances), Math.max(...chances)];
}

/**
 * The strength and dexterity it takes to use the item, 0 when it needs none.
 * Ethereal items need 10 less of each.
 */
export function statRequirements(item: ItemSummary, total: StatTotal) {
  const { strReq, dexReq } = getBase(item);
  const percent = total("item_req_percent");
  const requirement = (value = 0) =>
    value &&
    Math.max(
      value + Math.trunc((value * percent) / 100) - (item.ethereal ? 10 : 0),
      0
    );
  return { strength: requirement(strReq), dexterity: requirement(dexReq) };
}

// Javelins, throwing knives and axes, but not throwing potions
export function isThrowingWeapon(item: ItemSummary) {
  return !!WEAPONS[item.code]?.throwDamage;
}

// The game doesn't show the durability of indestructible items and throwing weapons
export function showsDurability(item: ItemSummary, total: StatTotal) {
  return total("item_indesctructible") <= 0 && !isThrowingWeapon(item);
}

// How many a full stack of the item holds
export function maxQuantity(item: ItemSummary, total: StatTotal) {
  return Math.min(
    (getBase(item).maxStack ?? 0) + total("item_extra_stack"),
    511
  );
}
