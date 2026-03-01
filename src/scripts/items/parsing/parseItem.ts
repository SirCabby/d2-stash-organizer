import { parseSimple } from "./parseSimple";
import { binaryStream } from "../../save-file/binary";
import { parseQuality } from "./parseQuality";
import { parseQuantified } from "./parseQuantified";
import { parseModifiers } from "./parseModifiers";
import { ItemParsingError } from "../../errors/ItemParsingError";
import { SaveFileReader } from "../../save-file/SaveFileReader";
import { FIRST_D2R, LAST_LEGACY } from "../../character/parsing/versions";
import { ItemsOwner } from "../../save-file/ownership";
import { MISC } from "../../../game-data";

export function parseItem(
  reader: SaveFileReader,
  owner: ItemsOwner,
  { dedicatedTab = false } = {}
) {
  // https://squeek502.github.io/d2itemreader/formats/d2.html
  const startByte = reader.nextIndex;
  const stream = binaryStream(reader);
  if (owner.version <= LAST_LEGACY) {
    // This is awkward, but we're juggling between the regular reader and the binary stream
    // In this case, we want to read with the binary stream to make sure the header is included
    // in the raw binary of the item.
    const header = String.fromCharCode(stream.readInt(8), stream.readInt(8));
    if (header !== "JM") {
      throw new Error(`Unexpected header ${header} for an item`);
    }
  }
  const item = parseSimple(stream, owner);

  if (!item.simple) {
    // If the id is cut short, it means it contained a "JM" which was identified as a boundary
    try {
      parseQuality(stream, item, owner.version >= FIRST_D2R);
      parseQuantified(stream, item);
      if (owner.version >= FIRST_D2R) {
        stream.skip(1);
      }
      parseModifiers(stream, item);
    } catch (e) {
      if (e instanceof ItemParsingError) {
        throw e;
      }
      throw new ItemParsingError(item, (e as Error).message);
    }
  } else {
    item.reqlevel = Math.max(
      item.reqlevel || 0,
      MISC[item.code]?.levelReq || 0
    );
  }

  item.raw = stream.done();

  // D2R items are serialized into individual byte buffers. Standard items use
  // floor(bits/8)+1 (always one extra byte). Dedicated tab items are packed
  // tightly at ceil(bits/8).
  if (owner.version >= FIRST_D2R) {
    const bits = item.raw.length;
    const byteSize = dedicatedTab
      ? Math.ceil(bits / 8)
      : Math.floor(bits / 8) + 1;
    reader.nextIndex = startByte + byteSize;
  }

  return item;
}
