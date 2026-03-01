import { SaveFileReader } from "../../save-file/SaveFileReader";
import { Item } from "../types/Item";
import { parseItem } from "./parseItem";
import { ItemLocation } from "../types/ItemLocation";
import { ItemsOwner } from "../../save-file/ownership";

export function parseItemList(
  reader: SaveFileReader,
  owner: ItemsOwner,
  options?: { dedicatedTab?: boolean }
) {
  const header = reader.readString(2);
  if (header !== "JM") {
    throw new Error(`Unexpected header ${header} for an item list`);
  }

  let remainingItems = reader.readInt16LE();
  const items: Item[] = [];

  while (remainingItems > 0) {
    let parsedItem: Item;
    try {
      parsedItem = parseItem(reader, owner, options);
    } catch (e) {
      // A failed parse (e.g. mod-added item code not in our data) leaves the
      // reader at an unknown position. We can't reliably find the next item
      // boundary, so return whatever we successfully parsed so far.
      console.warn(
        `Item parse failed — skipping ${remainingItems} remaining item(s):`,
        e instanceof Error ? e.message : e
      );
      break;
    }
    if (parsedItem.location === ItemLocation.SOCKET) {
      const socketedItem = items[items.length - 1];
      if (!socketedItem.filledSockets) {
        throw new Error("Trying to socket a non-socketed item");
      }
      parsedItem.socketedIn = socketedItem;
      socketedItem.filledSockets.push(parsedItem);
    } else {
      items.push(parsedItem);
      remainingItems += parsedItem.nbFilledSockets ?? 0;
    }
    remainingItems--;
  }

  return items;
}
