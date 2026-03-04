import { Item } from "../types/Item";
import { groupItems } from "../../../web/items/groupItems";
import { isSimpleItem } from "../../../web/collection/utils/isSimpleItem";

function removeFromOwner(item: Item) {
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

export function bulkDeleteWithQuantities(
  items: Item[],
  transferQuantities: Map<string, number>
): number {
  const groupedItems = groupItems(items);

  const itemsToDelete: Item[] = [];

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
        itemsToDelete.push(...itemsOfThisType.slice(0, transferQuantity));
      } else {
        itemsToDelete.push(...itemGroup);
      }
    } else {
      itemsToDelete.push(...itemGroup);
    }
  }

  for (const item of itemsToDelete) {
    removeFromOwner(item);
  }

  return itemsToDelete.length;
}
