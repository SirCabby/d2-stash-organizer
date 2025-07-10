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

  // Additional pre-computed fields for easier display
  extraDurability?: number;
  enhancedDefense?: boolean;
}
