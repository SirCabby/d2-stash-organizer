import {
  isCharacter,
  isPlugyStash,
  ItemsOwner,
} from "../../save-file/ownership";
import { addPage } from "../../plugy-stash/addPage";
import { cloneItem, copyItemTo } from "./copyItemTo";
import { ItemStorageType } from "../types/ItemLocation";
import { Item } from "../types/Item";
import { applyQuantities } from "../../../web/items/groupItems";
import { TakenIds } from "../itemIds";
import {
  addToDedicatedTab,
  isDedicatedTabEligible,
  isStack,
  singlesOfStack,
} from "../../d2r-stash/dedicatedTab";

/**
 * Copies the items to the target, with IDs of their own: `taken` must have the
 * IDs of every item in the collection (see takenIds).
 */
export function bulkCopyWithQuantities(
  target: ItemsOwner,
  items: Item[],
  transferQuantities: Map<string, number>,
  taken: TakenIds,
  storageType = ItemStorageType.STASH
) {
  const itemsToCopy = applyQuantities(items, transferQuantities).flatMap(
    ([item, count]) => (isStack(item) ? singlesOfStack(item, count) : [item])
  );

  if (isPlugyStash(target)) {
    let pageIndex = target.pages.length;
    addPage(target, "Copied");
    for (const item of itemsToCopy) {
      if (!copyItemTo(item, target, taken, ItemStorageType.STASH, pageIndex)) {
        addPage(target, "Copied");
        pageIndex++;
        copyItemTo(item, target, taken, ItemStorageType.STASH, pageIndex);
      }
    }
  } else if (isCharacter(target)) {
    for (const item of itemsToCopy) {
      if (!copyItemTo(item, target, taken, storageType)) {
        throw new Error("Not enough space to copy all the selected items.");
      }
    }
  } else {
    let copied = 0;
    const failed: Item[] = [];
    itemsLoop: for (const item of itemsToCopy) {
      // Like transfers, RotW keeps runes, gems and materials in its tabs
      if (target.variant === "rotw" && isDedicatedTabEligible(item)) {
        const copy = cloneItem(item, taken);
        copy.owner = target;
        if (addToDedicatedTab(target, copy)) {
          copied++;
          continue;
        }
      }
      let pageIndex = 0;
      while (pageIndex < target.pages.length) {
        if (copyItemTo(item, target, taken, ItemStorageType.STASH, pageIndex)) {
          copied++;
          continue itemsLoop;
        }
        pageIndex++;
      }
      failed.push(item);
    }
    if (failed.length > 0) {
      throw new Error(
        `Not enough space: ${copied}/${itemsToCopy.length} items copied. ` +
          `${failed.length} item(s) could not fit.`
      );
    }
  }
}
