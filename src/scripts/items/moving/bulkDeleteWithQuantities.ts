import { Item } from "../types/Item";
import { applyQuantities } from "../../../web/items/groupItems";
import { isStack, removeFromStack } from "../../d2r-stash/dedicatedTab";

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
  let deleted = 0;
  for (const [item, count] of applyQuantities(items, transferQuantities)) {
    if (isStack(item)) {
      removeFromStack(item, count);
    } else {
      removeFromOwner(item);
    }
    deleted += count;
  }
  return deleted;
}
