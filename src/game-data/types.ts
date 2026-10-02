export const enum EquipmentTier {
  NORMAL,
  EXCEPTIONAL,
  ELITE,
}

export interface Equipment {
  name: string;
  type: string;
  tier: EquipmentTier;
  maxSockets: number;
  indestructible: boolean;
  width: number;
  height: number;
  qlevel: number;
  levelReq: number;
  // Before the item's own mods
  strReq?: number;
  dexReq?: number;
  stackable: boolean;
  // Size of a full stack, before the item's own mods
  maxStack?: number;
  trackQuestDifficulty?: boolean;
  classRequirement?: string; // Class code (ama, bar, nec, pal, sor, dru, ass) or undefined if no restriction
}

export interface Armor extends Equipment {
  // [min, max]
  def: number[];
  // Shields only: chance to block, before the class' own
  block?: number;
}

export interface Weapon extends Equipment {
  twoHanded: boolean;
  // [min, max], for each way the weapon deals damage. Two-handed swords have
  // both one-hand and two-hand damage, throwing weapons one-hand and throw.
  oneHandDamage?: number[];
  twoHandDamage?: number[];
  throwDamage?: number[];
}

export interface Misc extends Equipment {}

export interface ModifierRange {
  prop: string;
  param?: number;
  min?: number;
  max?: number;
}

export interface Gem {
  weapon: ModifierRange[];
  armor: ModifierRange[];
  shield: ModifierRange[];
}

export interface UniqueItem {
  name: string;
  enabled: boolean;
  // False for the items the game leaves out of the Chronicle, its own grail
  inChronicle: boolean;
  code: string;
  qlevel: number;
  reqlevel: number;
  modifiers: ModifierRange[];
}

export interface SetItem {
  name: string;
  code: string;
  set: string;
  // False for the items the game leaves out of the Chronicle, its own grail
  inChronicle: boolean;
  baseModifiers: ModifierRange[];
  setModifiers: ModifierRange[][];
  qlevel: number;
  levelReq: number;
}

export interface Set {
  name: string;
  levelReq: number;
  modifiers: ModifierRange[][];
}

export interface Runeword {
  name: string;
  // The ID of the name in the game's strings, which items store to say which
  // runeword they are
  nameId: number;
  enabled: boolean;
  runes: string[];
  levelReq: number;
  modifiers: ModifierRange[];
}

export type PropertyType =
  | "proc"
  | "charges"
  | "all"
  | "min"
  | "max"
  | "param"
  | "other";
export interface Property {
  stats: {
    stat: string;
    param?: number;
    type: PropertyType;
  }[];
}

export interface StatDescription {
  stat: string;
  descPriority: number;
  descFunc: number;
  descVal?: number;
  descPos: string;
  descNeg: string;
  descAdditional?: string;
}

export interface ItemStat extends StatDescription {
  size: number;
  charSize?: number;
  encode: number;
  bias: number;
  paramSize: number;
  followedBy?: number;
}

export interface StatGroup extends StatDescription {
  statsInGroup: number[];
  allEqual?: boolean;
  isRange?: boolean;
}

export interface MagicAffix {
  name: string;
  reqlevel: number;
}

export interface Skill {
  code: string;
  name: string;
  charClass?: number;
}

export interface SkillTab {
  id: number;
  skillsMod: string;
  charClass: number;
}

export interface CharacterClass {
  code: string;
  name: string;
  skillsMod: string;
  classOnly: string;
  // Added to the chance to block of the shields the class uses
  blockFactor: number;
}

export interface ModifierLocale {
  id: number;
  Key: string;
  enUS: string;
}

export interface ItemTypeClassMapping {
  [itemType: string]: string | undefined; // itemType -> class code (ama, bar, nec, pal, sor, dru, ass) or undefined
}
