import { SaveFileReader } from "../../save-file/SaveFileReader";
import { parseItemList } from "../../items/parsing/parseItemList";
import { Character } from "../types";

export function parseMercenary(reader: SaveFileReader, character: Character) {
  const header = reader.readString(2);
  if (header !== "jf") {
    throw new Error(`Unexpected header ${header} for mercenary data`);
  }
  // The hasMercenary flag is read from a fixed byte offset that may be wrong
  // for newer save versions (e.g. RotW). Peek for the "JM" item list header
  // as a more reliable indicator of whether mercenary items follow.
  reader.peek = true;
  const next = reader.readString(2);
  reader.peek = false;
  if (next === "JM") {
    const items = parseItemList(reader, character);
    for (const item of items) {
      item.mercenary = true;
    }
    character.items.push(...items);
    character.hasMercenary = true;
  }
}
