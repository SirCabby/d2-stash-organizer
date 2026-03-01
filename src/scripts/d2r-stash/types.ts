import { Item } from "../items/types/Item";
import { SaveFile } from "../save-file/types";

export type D2rVariant = "expansion" | "rotw";

export interface D2rPage {
  gold: number;
  items: Item[];
}

/**
 * A slot in a RotW dedicated stacking tab (runes, gems, etc.).
 * Each slot holds one item type identified by its code, with a quantity up to 99.
 */
export interface DedicatedSlot {
  item: Item;
  quantity: number;
}

export interface D2rStash extends SaveFile {
  variant: D2rVariant;
  /** Per-page format identifier (e.g. 1=legacy, 2=expansion, 3=RotW) */
  formatId?: number;
  pages: D2rPage[];
  /** RotW dedicated stacking tab (runes, gems, potions, etc.) */
  dedicatedTab?: DedicatedSlot[];
  /** Raw bytes for non-item pages that we don't parse (chronicle tab, etc.) */
  tailData?: Uint8Array;
}
