import {
  isCharacter,
  isPlugyStash,
  ItemsOwner,
} from "../../save-file/ownership";
import { addPage } from "../../plugy-stash/addPage";
import { copyItemTo } from "./copyItemTo";
import { ItemStorageType } from "../types/ItemLocation";
import { Item } from "../types/Item";
import { groupItems } from "../../../web/items/groupItems";
import { isSimpleItem } from "../../../web/collection/utils/isSimpleItem";

export function bulkCopyWithQuantities(
  target: ItemsOwner,
  items: Item[],
  transferQuantities: Map<string, number>,
  storageType = ItemStorageType.STASH
) {
  const groupedItems = groupItems(items);

  const itemsToCopy: Item[] = [];

  for (const itemGroup of groupedItems) {
    const representativeItem = itemGroup[0];

    if (isSimpleItem(representativeItem) && itemGroup.length > 1) {
      const transferQuantity = transferQuantities.get(representativeItem.code);

      if (
        transferQuantity &&
        transferQuantity > 0 &&
        transferQuantity < itemGroup.length
      ) {
        const itemsOfThisType = items.filter(
          (item) => item.code === representativeItem.code
        );
        itemsToCopy.push(...itemsOfThisType.slice(0, transferQuantity));
      } else {
        itemsToCopy.push(...itemGroup);
      }
    } else {
      itemsToCopy.push(...itemGroup);
    }
  }

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
    let pageCount = 0;
    const failed: Item[] = [];
    itemsLoop: for (const item of itemsToCopy) {
      let pageIndex = 0;
      while (pageIndex < target.pages.length) {
        if (copyItemTo(item, target, ItemStorageType.STASH, pageIndex)) {
          pageCount++;
          continue itemsLoop;
        }
        pageIndex++;
      }
      failed.push(item);
    }
    if (failed.length > 0) {
      throw new Error(
        `Not enough space: ${pageCount}/${itemsToCopy.length} items copied. ` +
          `${failed.length} item(s) could not fit.`
      );
    }
  }
}
