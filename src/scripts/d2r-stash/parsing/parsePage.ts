import { D2rPage, D2rStash } from "../types";
import { SaveFileReader } from "../../save-file/SaveFileReader";
import { parseItemList } from "../../items/parsing/parseItemList";

export function parsePage(reader: SaveFileReader, stash: D2rStash) {
  const header = reader.readInt32LE().toString(16);
  if (header !== "aa55aa55") {
    throw new Error(`Unexpected header ${header} for a stash page`);
  }

  // Capture format identifier from first page (same value on all pages)
  if (stash.formatId == null) {
    stash.formatId = reader.readInt32LE();
  } else {
    reader.read(4);
  }

  // Skip game version field
  reader.read(4);
  const page: D2rPage = {
    gold: reader.readInt32LE(),
    items: [],
  };

  // Skip page length (4) + padding (44)
  reader.read(48);
  page.items.push(...parseItemList(reader, stash));

  return page;
}
