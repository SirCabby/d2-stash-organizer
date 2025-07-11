import {
  isCharacter,
  isPlugyStash,
  ItemsOwner,
} from "../../save-file/ownership";
import { addPage } from "../../plugy-stash/addPage";
import { transferItem } from "./transferItem";
import { ItemStorageType } from "../types/ItemLocation";
import { Item } from "../types/Item";
import { groupItems } from "../../../web/items/groupItems";
import { isSimpleItem } from "../../../web/collection/utils/isSimpleItem";

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
        const itemsOfThisType = items.filter(item => item.code === representativeItem.code);
        const itemsToTransferFromGroup = itemsOfThisType.slice(0, transferQuantity);
        
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
  } else {
    itemsLoop: for (const item of itemsToTransfer) {
      // Retry from page 0 every time, in case the new item is smaller than the previous ones
      let pageIndex = 0;
      while (pageIndex < target.pages.length) {
        if (transferItem(item, target, ItemStorageType.STASH, pageIndex)) {
          continue itemsLoop;
        }
        // We ran out of space on this page, we try the next one
        pageIndex++;
      }
      throw new Error("Not enough space to transfer all the selected items.");
    }
  }
}
