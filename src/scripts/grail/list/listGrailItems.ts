import {
  EquipmentTier,
  ITEM_TYPE_CATEGORIES,
  SET_ITEMS,
  SetItem,
  UNIQUE_ITEMS,
  UniqueItem,
} from "../../../game-data";
import { getBase } from "../../items/getBase";
import { groupBySet } from "./groupSets";

export const TIER_NAMES = ["Normal", "Exceptional", "Elite"];

export interface GrailTier<T> {
  // Undefined when the section isn't split by tier: accessories and sets
  tier?: EquipmentTier;
  items: T[];
}

export interface GrailSection<T> {
  name: string;
  tiers: GrailTier<T>[];
}

export interface GrailCategory<T> {
  name: string;
  sections: GrailSection<T>[];
}

// The equipment categories of the in-game loot filter, which the Chronicle uses too.
// Each section is one of the categories that ItemTypes.txt gives item types.
const LOOT_CATEGORIES = [
  {
    name: "Armor",
    tiered: true,
    sections: [
      { category: "helms", name: "Helms" },
      { category: "circl", name: "Circlets" },
      { category: "armor", name: "Armor" },
      { category: "shlds", name: "Shields" },
      { category: "glove", name: "Gloves" },
      { category: "boots", name: "Boots" },
      { category: "belts", name: "Belts" },
      { category: "barbh", name: "Barbarian" },
      { category: "druid", name: "Druid" },
      { category: "palad", name: "Paladin" },
      { category: "necro", name: "Necromancer" },
      { category: "warlo", name: "Warlock" },
    ],
  },
  {
    name: "Weapons",
    tiered: true,
    sections: [
      { category: "axes", name: "Axes" },
      { category: "bows", name: "Bows" },
      { category: "xbows", name: "Crossbows" },
      { category: "daggs", name: "Daggers" },
      { category: "javel", name: "Javelins" },
      { category: "maces", name: "Maces" },
      { category: "poles", name: "Polearms" },
      { category: "scept", name: "Scepters" },
      { category: "spear", name: "Spears" },
      { category: "stave", name: "Staves" },
      { category: "sword", name: "Swords" },
      { category: "throw", name: "Throwing" },
      { category: "wands", name: "Wands" },
      { category: "amazo", name: "Amazon" },
      { category: "assas", name: "Assassin" },
      { category: "sorce", name: "Sorceress" },
    ],
  },
  {
    name: "Accessories",
    tiered: false,
    sections: [
      { category: "charm", name: "Charms" },
      { category: "amule", name: "Amulets" },
      { category: "rings", name: "Rings" },
      { category: "jewel", name: "Jewels" },
    ],
  },
];

// Ignore disabled and quest items, and the ones the game's own grail, the Chronicle, leaves out:
// items that can't be found anymore and crafted versions of other uniques.
// The organizer's grail pages keep them, since they need a spot for every unique one may own.
function isGrailUnique(item: UniqueItem) {
  return item.enabled && item.inChronicle && item.qlevel > 0;
}

function groupByTier(items: UniqueItem[]): GrailTier<UniqueItem>[] {
  const byTier = new Map<EquipmentTier, UniqueItem[]>();
  for (const item of items) {
    const { tier } = getBase(item);
    let inTier = byTier.get(tier);
    if (!inTier) {
      inTier = [];
      byTier.set(tier, inTier);
    }
    inTier.push(item);
  }
  return [...byTier]
    .sort(([a], [b]) => a - b)
    .map(([tier, items]) => ({ tier, items }));
}

// Uniques are grouped like in the loot filter, and sets one section per set, like in the Chronicle.
export function listGrailItems() {
  const uniques = UNIQUE_ITEMS.filter(isGrailUnique).sort(
    (a, b) => a.qlevel - b.qlevel
  );

  const grail: GrailCategory<UniqueItem | SetItem>[] = LOOT_CATEGORIES.map(
    ({ name, tiered, sections }) => ({
      name,
      sections: sections.map(({ category, name }) => {
        const items = uniques.filter(
          (item) => ITEM_TYPE_CATEGORIES[getBase(item).type] === category
        );
        return { name, tiers: tiered ? groupByTier(items) : [{ items }] };
      }),
    })
  );

  // Never leave out the uniques of a category that a game update adds
  const listed = new Set(
    grail.flatMap(({ sections }) =>
      sections.flatMap(({ tiers }) => tiers.flatMap(({ items }) => items))
    )
  );
  const others = uniques.filter((item) => !listed.has(item));
  if (others.length > 0) {
    grail.push({
      name: "Other",
      sections: [{ name: "Uniques", tiers: [{ items: others }] }],
    });
  }

  grail.push({
    name: "Sets",
    sections: [
      ...groupBySet(SET_ITEMS.filter(({ inChronicle }) => inChronicle)),
    ]
      .filter(([, items]) => items.length > 0)
      .map(([{ name }, items]) => ({ name, tiers: [{ items }] })),
  });

  return grail;
}
