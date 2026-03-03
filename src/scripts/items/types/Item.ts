import { ItemQuality } from "./ItemQuality";
import { ItemEquipSlot, ItemLocation, ItemStorageType } from "./ItemLocation";
import { Modifier } from "./Modifier";
import { ItemsOwner } from "../../save-file/ownership";

export interface Item {
  raw: string;
  owner: ItemsOwner;
  version: string;

  identified: boolean;
  socketed: boolean;
  simple: boolean;
  ethereal: boolean;
  personalized: boolean;
  runeword: boolean;

  location: ItemLocation;
  equippedInSlot: ItemEquipSlot;
  stored: ItemStorageType;
  corpse?: boolean;
  mercenary?: boolean;
  page?: number;

  column: number;
  row: number;

  code: string;

  sockets?: number;
  socketsRange?: [number, number];
  nbFilledSockets?: number;
  filledSockets?: Item[];
  socketedIn?: Item;

  id?: number;
  level?: number;
  reqlevel?: number;
  quality?: ItemQuality;

  picture?: number;
  classSpecificAffix?: number;
  qualityModifier?: number;
  classRequirement?: string; // Class code (ama, bar, nec, pal, sor, dru, ass) from base item

  unique?: number;
  runewordId?: number;
  perfectionScore?: number;

  prefixes?: number[];
  suffixes?: number[];

  name?: string;

  defense?: number;
  defenseRange?: [number, number];
  durability?: [current: number, max: number];
  quantity?: number;

  modifiers?: Modifier[];
  setItemModifiers?: Modifier[][];
  setGlobalModifiers?: Modifier[][];

  // Searcheable description of the item. Right now it's only mods.
  search: string;

  // Bit index in the raw string right before modifiers. In D2R format an
  // extra padding bit sits here; in legacy format it does not exist.
  // Always set for non-simple items so conversion functions know where to
  // insert or strip the D2R extra bit.
  d2rExtraBitIndex?: number;
  // True when the raw data actually contains the D2R extra bit at
  // d2rExtraBitIndex (i.e. the item was parsed from a D2R container, or
  // from a legacy container that had the bit via RotW).
  hasD2rExtraBit?: boolean;

  // Personalized name characters (without the "'s" suffix). Stored during
  // parsing so conversion can re-encode between 7-bit (legacy) and 8-bit
  // (D2R) character widths.
  personalizedName?: string;
  // Whether the realm-data flag in parseQuality was set. When set, D2R
  // items carry 4×uint32 of realm data while legacy items carry 3×uint32,
  // so conversion must add or strip 32 bits.
  hasRealmData?: boolean;

  // Additional pre-computed fields for easier display
  extraDurability?: number;
  enhancedDefense?: boolean;
}
