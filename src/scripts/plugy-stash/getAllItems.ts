import { isD2rStash, isStash, ItemsOwner } from "../save-file/ownership";

export function getAllItems(owner: ItemsOwner, skipPages = 0) {
  if (isStash(owner)) {
    const all = [];
    for (const { items } of owner.pages.slice(skipPages)) {
      all.push(...items);
    }
    if (isD2rStash(owner) && owner.dedicatedTab) {
      for (const slot of owner.dedicatedTab) {
        all.push(slot.item);
      }
    }
    return all;
  } else {
    // No pages to skip for characters
    return owner.items;
  }
}
