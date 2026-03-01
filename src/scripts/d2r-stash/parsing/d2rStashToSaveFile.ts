import { SaveFileWriter } from "../../save-file/SaveFileWriter";
import { writeItemList } from "../../items/parsing/writeItemList";
import { D2rStash } from "../types";

const TAB_TYPE_STACKABLE = 1;

function writePage(
  writer: SaveFileWriter,
  stash: D2rStash,
  gold: number,
  tabType: number,
  writeContent: () => void
) {
  const pageStart = writer.nextIndex;
  writer.writeInt32LE(0xaa55aa55);
  writer.writeInt32LE(stash.formatId ?? 0);
  writer.writeInt32LE(stash.version);
  writer.writeInt32LE(gold);
  const lengthPosition = writer.nextIndex;
  // Page length (4) + tab type (4) + padding (40) = 48 bytes
  writer.writeInt32LE(0); // placeholder for page length
  writer.writeInt32LE(tabType);
  writer.skip(40);
  writeContent();
  const pageEnd = writer.nextIndex;
  writer.writeInt32LE(pageEnd - pageStart, lengthPosition);
  writer.write([], pageEnd);
}

export function d2rStashToSaveFile(stash: D2rStash) {
  const writer = new SaveFileWriter();

  for (const page of stash.pages) {
    writePage(writer, stash, page.gold, 0, () => {
      writeItemList(writer, page.items, { d2rPadding: true });
    });
  }

  if (stash.dedicatedTab) {
    writePage(writer, stash, 0, TAB_TYPE_STACKABLE, () => {
      const items = stash.dedicatedTab!.map((slot) => slot.item);
      writeItemList(writer, items);
    });
  }

  if (stash.tailData) {
    writer.write(Array.from(stash.tailData));
  }

  return writer.done();
}
