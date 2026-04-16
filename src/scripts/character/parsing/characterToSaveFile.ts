import { Character } from "../types";
import { SaveFileWriter } from "../../save-file/SaveFileWriter";
import { writeItemList } from "../../items/parsing/writeItemList";
import { FIRST_D2R } from "./versions";

export function characterToSaveFile(character: Character) {
  const writer = new SaveFileWriter();
  writer.writeInt32LE(parseInt("aa55aa55", 16));
  writer.writeInt32LE(character.version);
  // We don't know either the file size or the checksum yet, we will write them at the end.
  writer.skip(8);
  writer.write(character.characterData);
  const d2rPadding = character.version >= FIRST_D2R;
  writeItemList(
    writer,
    character.items.filter((item) => !item.mercenary && !item.corpse),
    { d2rPadding }
  );

  // Corpse data
  writer.writeString("JM");
  writer.writeInt16LE(character.hasCorpse ? 1 : 0);
  if (character.hasCorpse) {
    writer.skip(12);
    writeItemList(
      writer,
      character.items.filter((item) => item.corpse),
      { d2rPadding }
    );
  }

  // TODO: classic characters
  const expansionChar = true;
  if (expansionChar) {
    writer.writeString("jf");
    const mercItems = character.items.filter((item) => item.mercenary);
    writeItemList(writer, mercItems, { d2rPadding });
    writer.write(character.golem);
  }

  // Update file size and checksum now that we know them
  const result = writer.done();
  writer.writeInt32LE(writer.length, 8);
  writer.writeInt32LE(writer.computeChecksum(), 12);
  return result;
}
