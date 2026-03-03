import { SaveFileReader } from "../../save-file/SaveFileReader";
import { Character } from "../types";
import { parseAttributes } from "./parseAttributes";
import { parseItemList } from "../../items/parsing/parseItemList";
import { parseMercenary } from "./parseMercenary";
import { postProcessCharacter } from "./postProcessCharacter";
import { parseCorpses } from "./parseCorpses";
import { FIRST_D2R } from "./versions";

// Fixed header size for legacy/D2R base (v96-99). RotW (v105+) has a larger
// header due to expanded character preview and quest sections.
const LEGACY_HEADER_SIZE = 765;

// Can't use Node's Buffer because this needs to run in the browser
export function parseCharacter(
  raw: Uint8Array,
  file?: { name: string; lastModified: number }
) {
  const reader = new SaveFileReader(raw);
  const header = reader.readInt32LE().toString(16);
  if (header !== "aa55aa55") {
    throw new Error("This does not look like a Diablo 2 character save (.d2s)");
  }

  const version = reader.readInt32LE(4);
  const isD2R = version >= FIRST_D2R;

  let name: string;
  let charClass: number;
  if (isD2R) {
    // D2R moved the character name into the Preview section, whose offset
    // varies by version. The filename is always the character name.
    name = file?.name?.replace(/\.d2s$/i, "") ?? "";
    // The class byte offset shifted in RotW (v105+). Try the legacy offset
    // and fall back to 0 if the value is out of range.
    const classVal = reader.readInt8(40);
    charClass = classVal <= 7 ? classVal : 0;
  } else {
    name = reader.readNullTerminatedString(20);
    charClass = reader.readInt8(40);
  }

  const character: Character = {
    filename: file?.name ?? "",
    lastModified: file?.lastModified ?? 0,
    version,
    name,
    class: charClass,
    hasCorpse: false,
    hasMercenary: !!reader.readInt32LE(179),
    characterData: new Uint8Array(),
    golem: new Uint8Array(),
    items: [],
  };

  // Navigate to the "gf" attributes header. The fixed header size varies:
  // legacy/D2R base = 765 bytes, RotW expanded the character section.
  // Scan forward from the legacy offset to handle all versions.
  reader.nextIndex = findSectionMarker(raw, 0x67, 0x66, LEGACY_HEADER_SIZE);

  parseAttributes(reader);

  // Skip over skills (2-byte "if" header + 30 skill levels)
  reader.readString(32);

  character.characterData = reader.read(reader.nextIndex - 16, 16);

  // Items on the character or in stash
  character.items.push(...parseItemList(reader, character));

  // If an item failed to parse, the reader is at an unknown position.
  // Try each subsequent section and recover by scanning for known headers.
  try {
    parseCorpses(reader, character);
  } catch {
    const jfOffset = findMarker(raw, 0x6a, 0x66, reader.nextIndex);
    if (jfOffset >= 0) {
      reader.nextIndex = jfOffset;
    }
  }

  // TODO: classic characters
  const expansionChar = true;
  if (expansionChar) {
    try {
      parseMercenary(reader, character);
    } catch {
      // Skip mercenary items when the reader can't be recovered.
    }
    character.golem = reader.readRemaining();
  }

  postProcessCharacter(character);
  return character;
}

function findMarker(
  raw: Uint8Array,
  byte0: number,
  byte1: number,
  minOffset: number
): number {
  for (let i = minOffset; i < raw.length - 1; i++) {
    if (raw[i] === byte0 && raw[i + 1] === byte1) {
      return i;
    }
  }
  return -1;
}

function findSectionMarker(
  raw: Uint8Array,
  byte0: number,
  byte1: number,
  minOffset: number
): number {
  const maxOffset = Math.min(raw.length - 1, minOffset + 200);
  for (let i = minOffset; i < maxOffset; i++) {
    if (raw[i] === byte0 && raw[i + 1] === byte1) {
      return i;
    }
  }
  throw new Error(
    `Could not find section marker 0x${byte0.toString(16)}${byte1.toString(
      16
    )} in character file`
  );
}
