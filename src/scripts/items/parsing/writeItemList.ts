import { SaveFileWriter } from "../../save-file/SaveFileWriter";
import { Item } from "../types/Item";
import { fromBinary } from "../../save-file/binary";

function writeItem(writer: SaveFileWriter, item: Item) {
  // Whole bytes, padded with zeros, like the game writes each item
  writer.write(fromBinary(item.raw));
}

export function writeItemList(writer: SaveFileWriter, items: Item[]) {
  writer.writeString("JM");
  writer.writeInt16LE(items.length);
  for (const item of items) {
    writeItem(writer, item);
    for (const socket of item.filledSockets ?? []) {
      writeItem(writer, socket);
    }
  }
}
