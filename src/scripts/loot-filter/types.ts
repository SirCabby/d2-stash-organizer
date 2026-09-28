// A profile of the in-game loot filter: a .fltr file next to the saves, which
// the game writes with JSON.stringify(profile, null, 4). Only the fields this
// tool reads are listed; the others are kept as they are.
export interface LootFilterProfile {
  name: string;
  rules: LootFilterRule[];
}

// Within a rule, the categories and item codes add up, and so do the rarities.
// A rule without categories or item codes matches every piece of equipment.
export interface LootFilterRule {
  name: string;
  enabled: boolean;
  ruleType: "show" | "hide";
  // The "Ethereal / Socketed" box of the rarities. Like them, it adds items
  // (gray ones) to the rule: it can't limit a rule to ethereal items.
  filterEtherealSocketed: boolean;
  // lowQuality, normal, hiQuality, magic, rare, unique, set
  equipmentRarity?: string[];
  // normal, exceptional, elite
  equipmentQuality?: string[];
  // Whole loot filter categories, like acce, rings or helms
  equipmentCategory?: string[];
  // Base item codes, like rin or uar
  equipmentItemCode?: string[];
  itemCategory?: string[];
  itemCode?: string[];
  goldFilterValue?: number;
}
