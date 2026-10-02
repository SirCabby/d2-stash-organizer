import { MISC } from "../../game-data";
import { Item } from "../items/types/Item";
import { D2rStash } from "./types";
import {
  ItemEquipSlot,
  ItemLocation,
  ItemStorageType,
} from "../items/types/ItemLocation";
import { ItemQuality } from "../items/types/ItemQuality";
import { fromBinary, fromInt } from "../save-file/binary";
import { SaveFileReader } from "../save-file/SaveFileReader";
import { isD2rStash, ItemsOwner } from "../save-file/ownership";
import { LAST_LEGACY } from "../character/parsing/versions";
import { getAllItems } from "../plugy-stash/getAllItems";
import { encodeHuffman } from "../items/parsing/huffman";
import { parseItem } from "../items/parsing/parseItem";
import { postProcessItem } from "../items/post-processing/postProcessItem";

const MAX_STACK = 99;

const GEM_TYPES = new Set([
  "gema",
  "gemr",
  "gemd",
  "geme",
  "gems",
  "gemt",
  "gemz",
]);
const RUNE_TYPES = new Set(["rune"]);
const POTION_TYPES = new Set(["rpot"]);

const STACKABLE_BASE_TYPES = new Set([
  ...GEM_TYPES,
  ...RUNE_TYPES,
  ...POTION_TYPES,
]);

// The materials RotW keeps in its tabs (AdvancedStashStackable in Misc.txt).
// Other quest items, like the Standard of Heroes or the Uber Ancient upgrade
// materials, don't go in them.
const MATERIALS = new Set([
  // Keys and organs
  "pk1",
  "pk2",
  "pk3",
  "dhn",
  "bey",
  "mbr",
  // Token of Absolution and essences
  "toa",
  "tes",
  "ceh",
  "bet",
  "fed",
  // Worldstone shards
  "xa1",
  "xa2",
  "xa3",
  "xa4",
  "xa5",
  // Uber Ancient summoning materials
  "ua1",
  "ua2",
  "ua3",
  "ua4",
  "ua5",
]);

function isMaterialEligible(code: string): boolean {
  return MATERIALS.has(code);
}

export function isDedicatedTabEligible(item: Item): boolean {
  const baseType = MISC[item.code]?.type;
  if (baseType && STACKABLE_BASE_TYPES.has(baseType)) return true;
  return isMaterialEligible(item.code);
}

export function dedicatedTabName(item: Item): string {
  const baseType = MISC[item.code]?.type;
  if (baseType && GEM_TYPES.has(baseType)) return "Gems";
  if (baseType && RUNE_TYPES.has(baseType)) return "Runes";
  return "Materials";
}

/**
 * Update the quantity byte at the end of a simple D2R dedicated-tab item's raw
 * binary. The raw ends with [1-bit flag=1][8-bit quantity].
 */
function updateQuantityInRaw(item: Item, quantity: number) {
  item.raw = item.raw.slice(0, -8) + fromInt(quantity, 8);
}

// Clean flag template for dedicated tab items (bits 0-34). Matches the flags
// the game sets on natively-created dedicated tab items: only identified (4),
// simple (21), and the flag at bit 23 are set; all other skip bits are zero.
const DEDICATED_TAB_FLAGS =
  "0000" + // bits 0-3
  "1" + // bit 4: identified
  "000000" + // bits 5-10
  "0" + // bit 11: not socketed
  "000000000" + // bits 12-20
  "1" + // bit 21: simple
  "0" + // bit 22: not ethereal
  "1" + // bit 23: always set on dedicated tab items
  "0" + // bit 24: not personalized
  "0" + // bit 25
  "0" + // bit 26: not runeword
  "00000" + // bits 27-31
  "101"; // bits 32-34: D2R version

/**
 * Build a clean simple-item raw binary for a dedicated tab slot. Works for any
 * item type (simple or non-simple) by constructing the raw entirely from
 * scratch: flags + position + Huffman code + sockets(0) + realm quantity.
 */
function buildDedicatedTabRaw(code: string, quantity: number): string {
  return (
    DEDICATED_TAB_FLAGS +
    fromInt(ItemLocation.CURSOR, 3) +
    fromInt(ItemEquipSlot.NONE, 4) +
    fromInt(0, 4) + // column (4-bit field, not used for slot identity)
    fromInt(0, 4) + // row
    fromInt(ItemStorageType.STASH, 3) +
    encodeHuffman(code.padEnd(4, " ")) +
    "0" + // filled sockets = 0 (1 bit for simple items)
    "1" + // realm data flag = 1
    fromInt(quantity, 8)
  );
}

/**
 * Max out the quantity of every occupied slot in a RotW dedicated tab.
 * Slots with 0 items are left untouched. Returns the number of slots topped off.
 */
export function topOffDedicatedTab(stash: D2rStash): number {
  if (!stash.dedicatedTab) return 0;
  let count = 0;
  for (const slot of stash.dedicatedTab) {
    if (slot.quantity > 0 && slot.quantity < MAX_STACK) {
      slot.quantity = MAX_STACK;
      slot.item.quantity = MAX_STACK;
      updateQuantityInRaw(slot.item, MAX_STACK);
      count++;
    }
  }
  return count;
}

function isCodeEligible(code: string): boolean {
  const baseType = MISC[code]?.type;
  if (baseType && STACKABLE_BASE_TYPES.has(baseType)) return true;
  return isMaterialEligible(code);
}

/**
 * Ensure every eligible item type has a dedicated tab slot at max quantity.
 * Existing slots are topped off to 99; missing item types get new slots
 * created at 99. Returns the number of slots created or updated.
 */
export function refillDedicatedTab(stash: D2rStash): number {
  if (!stash.dedicatedTab) {
    stash.dedicatedTab = [];
  }

  const existingCodes = new Set(stash.dedicatedTab.map((s) => s.item.code));
  let count = 0;

  // Top off existing slots
  for (const slot of stash.dedicatedTab) {
    if (slot.quantity < MAX_STACK) {
      slot.quantity = MAX_STACK;
      slot.item.quantity = MAX_STACK;
      updateQuantityInRaw(slot.item, MAX_STACK);
      count++;
    }
  }

  // Create new slots for every eligible code not already present
  for (const code of Object.keys(MISC)) {
    if (existingCodes.has(code) || !isCodeEligible(code)) continue;
    const item: Item = {
      raw: buildDedicatedTabRaw(code, MAX_STACK),
      owner: stash,
      version: "101",
      simple: true,
      identified: true,
      socketed: false,
      ethereal: false,
      personalized: false,
      runeword: false,
      location: ItemLocation.CURSOR,
      equippedInSlot: ItemEquipSlot.NONE,
      column: 0,
      row: 0,
      stored: ItemStorageType.STASH,
      code,
      quantity: MAX_STACK,
      name: MISC[code]?.name ?? code,
      search: "",
    };
    stash.dedicatedTab.push({ item, quantity: MAX_STACK });
    count++;
  }

  return count;
}

/**
 * Try to place an item into the dedicated stacking tab. Returns true if the
 * item was consumed (stacked onto an existing slot or given a new slot).
 * Returns false if the matching slot is already at max capacity (99) — the
 * caller should place the item on a general stash page instead.
 */
export function addToDedicatedTab(stash: D2rStash, item: Item): boolean {
  if (!stash.dedicatedTab) {
    stash.dedicatedTab = [];
  }

  const incomingQty = 1;

  // Try to stack with an existing slot of the same code
  for (const slot of stash.dedicatedTab) {
    if (slot.item.code === item.code) {
      if (slot.quantity >= MAX_STACK) {
        return false;
      }
      slot.quantity += incomingQty;
      slot.item.quantity = slot.quantity;
      updateQuantityInRaw(slot.item, slot.quantity);
      return true;
    }
  }

  // Create a new slot with a clean simple-item raw built from scratch.
  item.raw = buildDedicatedTabRaw(item.code, incomingQty);

  item.simple = true;
  item.identified = true;
  item.socketed = false;
  item.ethereal = false;
  item.personalized = false;
  item.runeword = false;
  item.nbFilledSockets = 0;
  item.filledSockets = undefined;
  item.location = ItemLocation.CURSOR;
  item.equippedInSlot = ItemEquipSlot.NONE;
  item.column = 0;
  item.row = 0;
  item.stored = ItemStorageType.STASH;
  item.quantity = incomingQty;
  item.name = MISC[item.code]?.name ?? item.name;

  stash.dedicatedTab.push({ item, quantity: incomingQty });
  return true;
}

/** Whether the item is a whole stack in a RotW tab, rather than one item. */
export function isStack(item: Item): boolean {
  const { owner } = item;
  return (
    isD2rStash(owner) &&
    !!owner.dedicatedTab?.some((slot) => slot.item === item)
  );
}

/** Lowers a stack by `count`. Its slot goes once the stack is empty. */
export function removeFromStack(stack: Item, count: number) {
  const slots = (stack.owner as D2rStash).dedicatedTab ?? [];
  const slot = slots.find((s) => s.item === stack);
  if (!slot || count <= 0) return;
  slot.quantity -= Math.min(count, slot.quantity);
  if (slot.quantity === 0) {
    slots.splice(slots.indexOf(slot), 1);
  } else {
    stack.quantity = slot.quantity;
    updateQuantityInRaw(stack, slot.quantity);
  }
}

// Outside the tabs, runes, gems and potions are simple items, while the
// materials are full items with an ID and a level (compactsave in Misc.txt).
function isSimpleOutsideTabs(code: string) {
  const baseType = MISC[code]?.type;
  return !!baseType && STACKABLE_BASE_TYPES.has(baseType);
}

// The tabs don't keep item levels, and materials don't use theirs.
const MATERIAL_LEVEL = 99;

// What follows a material's code when it is a full item, as the game makes
// them: no sockets, an ID, a level, normal quality and no mods.
function fullMaterialBits(d2r: boolean) {
  return (
    "000" + // no filled sockets
    fromInt(Math.floor(Math.random() * 2 ** 32), 32) + // ID
    fromInt(MATERIAL_LEVEL, 7) +
    fromInt(ItemQuality.NORMAL, 4) +
    "000" + // no picture, class-specific affix or realm data
    (d2r ? "0" : "") + // D2R extra bit
    "111111111" + // end of the empty list of mods
    (d2r ? "0" : "") // no tab stack quantity (see toD2R)
  );
}

// Parsing the bits back sets the item's fields to match them.
function parseBits(raw: string, owner: ItemsOwner) {
  const reader = new SaveFileReader(new Uint8Array(fromBinary(raw)));
  const item = parseItem(reader, owner);
  postProcessItem(item);
  return item;
}

/**
 * One item of a stack's type, laid out the way toD2R lays out items coming
 * from PlugY.
 */
function singleItem(stack: Item): Item {
  const simple = isSimpleOutsideTabs(stack.code);
  const flags = simple
    ? DEDICATED_TAB_FLAGS
    : // Bit 21 is the simple flag
      DEDICATED_TAB_FLAGS.slice(0, 21) + "0" + DEDICATED_TAB_FLAGS.slice(22);
  return parseBits(
    flags +
      fromInt(ItemLocation.STORED, 3) +
      fromInt(ItemEquipSlot.NONE, 4) +
      fromInt(0, 4) + // column
      fromInt(0, 4) + // row
      fromInt(ItemStorageType.STASH, 3) +
      encodeHuffman(stack.code.padEnd(4, " ")) +
      (simple
        ? "0" + // no realm data
          "1" +
          fromInt(0, 8) // empty quantity byte
        : fullMaterialBits(true)),
    stack.owner
  );
}

// In legacy items: the JM header, then bit 21 of the flags is the simple
// flag, and the code ends after the flags, version, location and code.
const LEGACY_SIMPLE_FLAG = 16 + 21;
const LEGACY_CODE_END = 16 + 32 + 10 + 18 + 32;

/**
 * Older versions of this tool took materials out of RotW tabs as simple
 * items, which the game only makes as full items. This turns them back into
 * full items where they are, and returns how many it found. Only for legacy
 * saves (PlugY stashes and the offline stash), whose simple items have no
 * quantity, so that each of them is exactly one material.
 */
export function fixSimpleMaterials(owner: ItemsOwner): number {
  if (owner.version > LAST_LEGACY) return 0;
  let fixed = 0;
  for (const item of getAllItems(owner)) {
    if (
      item.simple &&
      isDedicatedTabEligible(item) &&
      !isSimpleOutsideTabs(item.code)
    ) {
      const raw =
        item.raw.slice(0, LEGACY_SIMPLE_FLAG) +
        "0" +
        item.raw.slice(LEGACY_SIMPLE_FLAG + 1, LEGACY_CODE_END) +
        fullMaterialBits(false);
      // Keeps the fields parsing doesn't set, like the page
      Object.assign(item, parseBits(raw, owner));
      fixed++;
    }
  }
  return fixed;
}

/** `count` single items of a stack's type, leaving the stack as it is. */
export function singlesOfStack(stack: Item, count: number): Item[] {
  return Array.from({ length: count }, () => singleItem(stack));
}

/** Takes `count` items off a stack, as single items to place anywhere. */
export function takeFromStack(stack: Item, count: number): Item[] {
  const singles = singlesOfStack(stack, count);
  removeFromStack(stack, count);
  return singles;
}
