import { Stash } from "../../save-file/ownership";
import { Item } from "../types/Item";
import { collision } from "./collision";
import { positionItem } from "./positionItem";

export function moveItem(
  stash: Stash,
  item: Item,
  toPage: number,
  row: number,
  col: number
) {
  for (const page of stash.pages) {
    const index = page.items.indexOf(item);
    if (index >= 0) {
      page.items.splice(index, 1);
      break;
    }
  }
  if (!stash.pages[toPage]) {
    throw new Error(
      "Cannot move an item to a page that has not been created yet"
    );
  }

  const target: Item = { ...item, row, column: col };
  const itemInSameSpot = stash.pages[toPage].items.find((other) =>
    collision(target, other)
  );
  if (itemInSameSpot) {
    throw new Error(
      `Trying to move ${item.name} to the same spot as ${itemInSameSpot.name}`
    );
  }
  stash.pages[toPage].items.push(item);
  item.owner = stash;
  item.page = toPage;
  positionItem(item, [col, row]);
}
