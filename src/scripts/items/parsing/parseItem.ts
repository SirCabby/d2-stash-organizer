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

export function parseItemOnce(
  reader: SaveFileReader,
  owner: ItemsOwner,
  startByte: number,
  dedicatedTab: boolean,
  skipExtraBit: boolean,
  noExtraBit = false
) {
  reader.nextIndex = startByte;
  const stream = binaryStream(reader);
  if (owner.version <= LAST_LEGACY) {
    const header = String.fromCharCode(stream.readInt(8), stream.readInt(8));
    if (header !== "JM") {
      throw new Error(`Unexpected header ${header} for an item`);
    }
  }
  const item = parseSimple(stream, owner);

  if (!item.simple) {
    try {
      parseQuality(stream, item, owner.version >= FIRST_D2R);
      parseQuantified(stream, item);
      item.d2rExtraBitIndex = stream.position();
      if ((owner.version >= FIRST_D2R || skipExtraBit) && !noExtraBit) {
        item.hasD2rExtraBit = true;
        stream.skip(1);
        if (item.socketed && item.sockets != null) {
          item.sockets = item.sockets >> 1;
        }
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

  if (owner.version >= FIRST_D2R) {
    const bits = item.raw.length;
    const byteSize = dedicatedTab
      ? Math.ceil(bits / 8)
      : Math.floor(bits / 8) + 1;
    reader.nextIndex = startByte + byteSize;
  }

  return item;
}

// 0x4a4d = "JM" (item header), 0x5354 = "ST" (page header)
function isValidBoundary(reader: SaveFileReader): boolean {
  if (reader.done) return true;
  reader.peek = true;
  try {
    const next = reader.readString(2);
    return next === "JM" || next === "ST";
  } catch {
    return true;
  } finally {
    reader.peek = false;
  }
}

export function parseItem(
  reader: SaveFileReader,
  owner: ItemsOwner,
  { dedicatedTab = false } = {}
) {
  // https://squeek502.github.io/d2itemreader/formats/d2.html
  const startByte = reader.nextIndex;
  const item = parseItemOnce(reader, owner, startByte, dedicatedTab, false);

  // Some RotW items stored in legacy-format .d2x stashes include a D2R-era
  // extra bit before modifiers. When the standard parse leaves the reader
  // misaligned, re-parse with the extra bit skipped.
  if (
    owner.version <= LAST_LEGACY &&
    !item.simple &&
    !isValidBoundary(reader)
  ) {
    return parseItemOnce(reader, owner, startByte, dedicatedTab, true);
  }

  return item;
}
