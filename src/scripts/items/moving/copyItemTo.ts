import { Item } from "../types/Item";
import { isPlugyStash, isStash, ItemsOwner } from "../../save-file/ownership";
import {
  ItemEquipSlot,
  ItemLocation,
  ItemStorageType,
} from "../types/ItemLocation";
import { findSpot } from "./findSpot";
import {
  D2R_STASH_HEIGHT,
  D2R_STASH_WIDTH,
  getDimensions,
} from "../../character/dimensions";
import { positionItem } from "./positionItem";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../plugy-stash/dimensions";
import { fromInt } from "../../save-file/binary";
import { FIRST_D2R } from "../../character/parsing/versions";
import { D2R_OFFSET, toD2, toD2R } from "./conversion";

function cloneItem(item: Item): Item {
  const clone: Item = { ...item };
  if (item.filledSockets) {
    clone.filledSockets = item.filledSockets.map((s) => ({ ...s }));
  }
  if (item.modifiers) {
    clone.modifiers = item.modifiers.map((m) => ({ ...m }));
  }
  if (item.durability) {
    clone.durability = [...item.durability];
  }
  if (item.prefixes) {
    clone.prefixes = [...item.prefixes];
  }
  if (item.suffixes) {
    clone.suffixes = [...item.suffixes];
  }
  if (item.socketsRange) {
    clone.socketsRange = [...item.socketsRange];
  }
  if (item.defenseRange) {
    clone.defenseRange = [...item.defenseRange];
  }
  return clone;
}

function giveItemTo(
  item: Item,
  owner: ItemsOwner,
  storageType: ItemStorageType
) {
  if (item.owner.version !== owner.version) {
    if (owner.version >= FIRST_D2R) {
      toD2R(item);
    } else {
      toD2(item);
    }
  }

  item.owner = owner;
  item.location = ItemLocation.STORED;
  item.equippedInSlot = ItemEquipSlot.NONE;
  item.stored = storageType;
  const offset = owner.version >= FIRST_D2R ? D2R_OFFSET : 0;
  item.raw =
    item.raw.slice(0, 58 + offset) +
    fromInt(item.location, 3) +
    fromInt(item.equippedInSlot, 4) +
    item.raw.slice(65 + offset, 73 + offset) +
    fromInt(item.stored, 3) +
    item.raw.slice(76 + offset);
  item.corpse = false;
  item.mercenary = false;
}

/**
 * Clone an item and place the copy at the target owner, leaving the
 * original item untouched. Returns false when there is no room.
 */
export function copyItemTo(
  item: Item,
  to: ItemsOwner,
  storageType = ItemStorageType.STASH,
  pageIndex?: number
): boolean {
  const clone = cloneItem(item);

  if (isStash(to)) {
    const page = to.pages[pageIndex ?? 0];
    let height = PAGE_HEIGHT;
    let width = PAGE_WIDTH;
    if (!isPlugyStash(to)) {
      height = D2R_STASH_HEIGHT;
      width = D2R_STASH_WIDTH;
    }
    const position = findSpot(clone, page.items, height, width);
    if (!position) {
      return false;
    }
    positionItem(clone, position);
    page.items.push(clone);
    clone.page = pageIndex;
  } else {
    const itemsInSameStorage = to.items.filter((i) => i.stored === storageType);
    const { height, width } = getDimensions(storageType, to);
    const position = findSpot(clone, itemsInSameStorage, height, width);
    if (!position) {
      return false;
    }
    positionItem(clone, position);
    to.items.push(clone);
    delete clone.page;
  }

  giveItemTo(clone, to, storageType);

  return true;
}
