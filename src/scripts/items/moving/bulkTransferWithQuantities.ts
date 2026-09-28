import {
  isCharacter,
  isD2rStash,
  isPlugyStash,
  ItemsOwner,
} from "../../save-file/ownership";
import { addPage } from "../../plugy-stash/addPage";
import { transferItem } from "./transferItem";
import { ItemStorageType } from "../types/ItemLocation";
import { Item } from "../types/Item";
import { applyQuantities } from "../../../web/items/groupItems";
import {
  addToDedicatedTab,
  isDedicatedTabEligible,
  isStack,
  takeFromStack,
} from "../../d2r-stash/dedicatedTab";

export function bulkTransferWithQuantities(
  target: ItemsOwner,
  items: Item[],
  transferQuantities: Map<string, number>,
  storageType = ItemStorageType.STASH
) {
  const itemsToTransfer = applyQuantities(items, transferQuantities).flatMap(
    ([item, count]) => {
      if (!isStack(item)) {
        return [item];
      }
      // A stack moved to its own stash would go right back into its tab
      return item.owner === target ? [] : takeFromStack(item, count);
    }
  );

  // Now transfer the selected items
  if (isPlugyStash(target)) {
    let pageIndex = target.pages.length;
    addPage(target, "Transferred");
    for (const item of itemsToTransfer) {
      if (!transferItem(item, target, ItemStorageType.STASH, pageIndex)) {
        // We ran out of space, we insert a new page
        addPage(target, "Transferred");
        pageIndex++;
        // Don't forget to re-transfer the failed item
        transferItem(item, target, ItemStorageType.STASH, pageIndex);
      }
    }
  } else if (isCharacter(target)) {
    for (const item of itemsToTransfer) {
      if (!transferItem(item, target, storageType)) {
        throw new Error("Not enough space to transfer all the selected items.");
      }
    }
  } else if (isD2rStash(target) && target.variant === "rotw") {
    let dedicatedCount = 0;
    let pageCount = 0;
    const failed: Item[] = [];
    itemsLoop: for (const item of itemsToTransfer) {
      if (isDedicatedTabEligible(item)) {
        removeFromOriginalOwner(item);
        item.owner = target;
        if (addToDedicatedTab(target, item)) {
          dedicatedCount++;
          continue;
        }
        // Dedicated tab slot is full (99) — fall through to place on a
        // general stash page instead.
      }
      let pageIndex = 0;
      while (pageIndex < target.pages.length) {
        if (transferItem(item, target, ItemStorageType.STASH, pageIndex)) {
          pageCount++;
          continue itemsLoop;
        }
        pageIndex++;
      }
      failed.push(item);
    }
    if (failed.length > 0) {
      const placed = dedicatedCount + pageCount;
      throw new Error(
        `Not enough space: ${placed}/${itemsToTransfer.length} items transferred ` +
          `(${dedicatedCount} to dedicated tab, ${pageCount} to stash pages). ` +
          `${failed.length} item(s) could not fit.`
      );
    }
  } else {
    itemsLoop2: for (const item of itemsToTransfer) {
      let pageIndex = 0;
      while (pageIndex < target.pages.length) {
        if (transferItem(item, target, ItemStorageType.STASH, pageIndex)) {
          continue itemsLoop2;
        }
        pageIndex++;
      }
      throw new Error("Not enough space to transfer all the selected items.");
    }
  }
}

function removeFromOriginalOwner(item: Item) {
  const { owner } = item;
  if (!owner) return;
  if ("pages" in owner) {
    for (const page of owner.pages) {
      const idx = page.items.indexOf(item);
      if (idx >= 0) {
        page.items.splice(idx, 1);
        return;
      }
    }
    if ("dedicatedTab" in owner && owner.dedicatedTab) {
      const tab = owner.dedicatedTab;
      const idx = tab.findIndex((s) => s.item === item);
      if (idx >= 0) {
        tab.splice(idx, 1);
        return;
      }
    }
  } else {
    const idx = owner.items.indexOf(item);
    if (idx >= 0) {
      owner.items.splice(idx, 1);
    }
  }
}
