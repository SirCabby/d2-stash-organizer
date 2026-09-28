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
import {
  addToDedicatedTab,
  isDedicatedTabEligible,
  isStack,
  singlesOfStack,
} from "../../d2r-stash/dedicatedTab";

export function bulkCopyWithQuantities(
  target: ItemsOwner,
  items: Item[],
  transferQuantities: Map<string, number>,
  storageType = ItemStorageType.STASH
) {
  const itemsToCopy = applyQuantities(items, transferQuantities).flatMap(
    ([item, count]) => (isStack(item) ? singlesOfStack(item, count) : [item])
  );

  if (isPlugyStash(target)) {
    let pageIndex = target.pages.length;
    addPage(target, "Copied");
    for (const item of itemsToCopy) {
      if (!copyItemTo(item, target, ItemStorageType.STASH, pageIndex)) {
        addPage(target, "Copied");
        pageIndex++;
        copyItemTo(item, target, ItemStorageType.STASH, pageIndex);
      }
    }
  } else if (isCharacter(target)) {
    for (const item of itemsToCopy) {
      if (!copyItemTo(item, target, storageType)) {
        throw new Error("Not enough space to copy all the selected items.");
      }
    }
  } else {
    let copied = 0;
    const failed: Item[] = [];
    itemsLoop: for (const item of itemsToCopy) {
      // Like transfers, RotW keeps runes, gems and materials in its tabs
      if (target.variant === "rotw" && isDedicatedTabEligible(item)) {
        const copy = cloneItem(item);
        copy.owner = target;
        if (addToDedicatedTab(target, copy)) {
          copied++;
          continue;
        }
      }
      let pageIndex = 0;
      while (pageIndex < target.pages.length) {
        if (copyItemTo(item, target, ItemStorageType.STASH, pageIndex)) {
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
