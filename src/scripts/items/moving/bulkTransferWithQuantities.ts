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
import { groupItems } from "../../../web/items/groupItems";
import { isSimpleItem } from "../../../web/collection/utils/isSimpleItem";
import {
  addToDedicatedTab,
  isDedicatedTabEligible,
} from "../../d2r-stash/dedicatedTab";

export function bulkTransferWithQuantities(
  target: ItemsOwner,
  items: Item[],
  transferQuantities: Map<string, number>,
  storageType = ItemStorageType.STASH
) {
  // Group items to handle quantities properly
  const groupedItems = groupItems(items);

  const itemsToTransfer: Item[] = [];

  for (const itemGroup of groupedItems) {
    const representativeItem = itemGroup[0];

    if (isSimpleItem(representativeItem) && itemGroup.length > 1) {
      // For simple items with quantities, check if we have a specific transfer quantity
      const transferQuantity = transferQuantities.get(representativeItem.code);

      if (
        transferQuantity &&
        transferQuantity > 0 &&
        transferQuantity < itemGroup.length
      ) {
        // Transfer only the specified quantity - use the first N items from the original items array

        // Find the first N items of this type from the original items array
        const itemsOfThisType = items.filter(
          (item) => item.code === representativeItem.code
        );
        const itemsToTransferFromGroup = itemsOfThisType.slice(
          0,
          transferQuantity
        );

        itemsToTransfer.push(...itemsToTransferFromGroup);
      } else {
        // Transfer all items in the group (either no quantity set or quantity equals total)

        // When transferring all items, use the original grouped items to ensure we get all unique items
        itemsToTransfer.push(...itemGroup);
      }
    } else {
      // For non-simple items or single items, transfer all
      itemsToTransfer.push(...itemGroup);
    }
  }

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
