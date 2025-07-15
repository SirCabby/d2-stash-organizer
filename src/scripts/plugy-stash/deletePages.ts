import { isPlugyStash, isStash, ItemsOwner } from "../save-file/ownership";
import { D2rPage } from "../d2r-stash/types";

// Deletes a range of pages and returns all the items they contained
export function deletePages(stash: ItemsOwner, from: number, to?: number) {
  if (!isStash(stash)) {
    throw new Error("deletePages can only be called on stash types");
  }

  const endIndex = to ?? stash.pages.length;
  const removed = stash.pages.splice(from, endIndex - from);
  const allItems = [];

  // For D2R stashes, we need to preserve gold from deleted pages
  if (!isPlugyStash(stash)) {
    // D2R stashes store gold per page, so we need to accumulate it
    let totalGold = 0;
    for (const page of removed) {
      const d2rPage = page as D2rPage;
      totalGold += d2rPage.gold;
      allItems.push(...page.items);
    }

    // Add the accumulated gold to the first remaining page, or create a new page if none exist
    if (totalGold > 0) {
      if (stash.pages.length > 0) {
        // Add to the first remaining page
        stash.pages[0].gold += totalGold;
      } else {
        // Create a new page to hold the gold
        stash.pages.push({
          gold: totalGold,
          items: [],
        });
      }
    }
  } else {
    // For PlugY stashes, gold is stored at the stash level, so we only need to extract items
    for (const { items } of removed) {
      allItems.push(...items);
    }
  }

  return allItems;
}
