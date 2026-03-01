import { SaveFileWriter } from "../../save-file/SaveFileWriter";
import { Item } from "../types/Item";
import { fromBinary } from "../../save-file/binary";

function writeItem(writer: SaveFileWriter, item: Item, d2rPadding: boolean) {
  writer.write(fromBinary(item.raw));
  // Standard D2R items occupy floor(bits/8)+1 bytes. When bits is divisible
  // by 8, fromBinary only produces bits/8 bytes — one short. Append a zero
  // padding byte so the game reads the correct number of bytes.
  if (d2rPadding && item.raw.length % 8 === 0) {
    writer.write([0]);
  }
}

export function writeItemList(
  writer: SaveFileWriter,
  items: Item[],
  { d2rPadding = false } = {}
) {
  writer.writeString("JM");
  writer.writeInt16LE(items.length);
  for (const item of items) {
    writeItem(writer, item, d2rPadding);
    for (const socket of item.filledSockets ?? []) {
      writeItem(writer, socket, d2rPadding);
    }
  }
}
