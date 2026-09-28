import { Item } from "../../scripts/items/types/Item";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import { isD2rStash, ownerName } from "../../scripts/save-file/ownership";

function isDedicatedTabItem(item: Item): boolean {
  return (
    !!item.owner &&
    isD2rStash(item.owner) &&
    item.location === ItemLocation.CURSOR &&
    item.stored === ItemStorageType.STASH
  );
}

/**
 * Returns the effective count for a group of items. For dedicated tab items
 * the stack quantity is stored on a single item object; for regular items
 * the count is the number of objects in the group.
 */
export function groupQuantity(group: Item[]): number {
  if (group.length === 1 && isDedicatedTabItem(group[0])) {
    return group[0].quantity ?? 1;
  }
  return group.length;
}

/**
 * Creates a unique key for grouping items by both code and location. It also
 * keys the transfer quantity of each row of simple items.
 */
export function getItemLocationKey(item: Item): string {
  if (!item.owner) {
    return `${item.code}-unknown`;
  }

  const owner = ownerName(item.owner);
  let location = "";

  switch (item.location) {
    case ItemLocation.STORED:
      switch (item.stored) {
        case ItemStorageType.STASH:
          location = `stash-${owner}`;
          // Include page number for stash items
          if (typeof item.page !== "undefined") {
            location += `-page${item.page + 1}`;
          }
          break;
        case ItemStorageType.INVENTORY:
          location = `inventory-${owner}`;
          break;
        case ItemStorageType.CUBE:
          location = `cube-${owner}`;
          break;
        default:
          location = `stored-${owner}`;
      }
      break;
    case ItemLocation.BELT:
      location = `belt-${owner}`;
      break;
    case ItemLocation.EQUIPPED:
      if (item.mercenary) {
        location = `mercenary-${owner}`;
      } else if (item.corpse) {
        location = `corpse-${owner}`;
      } else {
        location = `equipped-${owner}`;
      }
      break;
    case ItemLocation.SOCKET:
      location = `socketed-${owner}`;
      break;
    default:
      location = `unknown-${owner}`;
  }

  return `${item.code}-${location}`;
}

/**
 * Groups simple items together with a quantity, leaves others alone
 * Items are now grouped by both code and location, so items of the same type
 * in different locations will appear as separate rows.
 */
export function groupItems(items: Item[]) {
  const grouped = new Map<string, Item[]>();
  let uid = 0;
  for (const item of items) {
    if (isSimpleItem(item)) {
      const key = getItemLocationKey(item);
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, [item]);
      } else {
        existing.push(item);
      }
    } else {
      grouped.set(`${uid++}`, [item]);
    }
  }
  return Array.from(grouped.values());
}

/**
 * What a transfer, copy or delete acts on: each item with how many of it,
 * which is only more than 1 for a stack in a RotW tab. A row whose transfer
 * quantity was lowered only gives that many of its own items, never those of
 * another row of the same item.
 */
export function applyQuantities(
  items: Item[],
  quantities: Map<string, number>
): [Item, number][] {
  return groupItems(items).flatMap((group): [Item, number][] => {
    const total = groupQuantity(group);
    const chosen = quantities.get(getItemLocationKey(group[0])) ?? 0;
    const quantity = chosen > 0 && chosen < total ? chosen : total;
    return group.length === 1
      ? [[group[0], quantity]]
      : group.slice(0, quantity).map((item) => [item, 1]);
  });
}
