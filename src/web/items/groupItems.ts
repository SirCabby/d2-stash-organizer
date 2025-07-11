import { Item } from "../../scripts/items/types/Item";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import { ownerName } from "../../scripts/save-file/ownership";

/**
 * Creates a unique key for grouping items by both code and location
 */
function getItemLocationKey(item: Item): string {
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
