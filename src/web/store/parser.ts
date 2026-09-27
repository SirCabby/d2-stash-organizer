import { parseCharacter } from "../../scripts/character/parsing/parseCharacter";
import { parsePlugyStash } from "../../scripts/plugy-stash/parsing/parsePlugyStash";
import { plugyStashToSaveFile } from "../../scripts/plugy-stash/parsing/plugyStashToSaveFile";
import {
  isCharacter,
  isPlugyStash,
  ItemsOwner,
  ownerName,
} from "../../scripts/save-file/ownership";
import { characterToSaveFile } from "../../scripts/character/parsing/characterToSaveFile";
import { d2rStashToSaveFile } from "../../scripts/d2r-stash/parsing/d2rStashToSaveFile";
import { parseD2rStash } from "../../scripts/d2r-stash/parsing/parseD2rStash";

const DEFAULT_SHARED_FILENAME = "_LOD_SharedStashSave.sss";
const DEFAULT_PERSONAL_FILENAME = "CharacterName.d2x";
const DEFAULT_CHARACTER_FILENAME = "CharacterName.d2s";
const DEFAULT_D2R_SHARED_FILENAME = "SharedStashSoftCoreV2.d2i";

// Save files that don't come out identical when written back, because the
// parser skipped items it couldn't read: the uploaded bytes, and what writing
// the file would have produced. See toSaveFile.
const unreadable = new WeakMap<
  ItemsOwner,
  { original: Uint8Array; rewritten: Uint8Array }
>();

export async function parseSaveFile(file: File) {
  try {
    const raw = new Uint8Array(await file.arrayBuffer());
    let owner: ItemsOwner;
    if (file.name.endsWith(".d2s")) {
      owner = parseCharacter(raw, file);
    } else if (file.name.endsWith(".d2i")) {
      owner = parseD2rStash(raw, file);
    } else {
      owner = parsePlugyStash(raw, file);
    }
    const rewritten = serialize(owner);
    if (!sameBytes(rewritten, raw)) {
      unreadable.set(owner, { original: raw, rewritten });
    }
    return owner;
  } catch (e) {
    if (e instanceof Error) {
      alert(e.message);
    }
    throw e;
  }
}

/** Whether some of the owner's items could not be read from its save file. */
export function isUnreadable(owner: ItemsOwner) {
  return unreadable.has(owner);
}

function serialize(owner: ItemsOwner) {
  if (isPlugyStash(owner)) {
    return plugyStashToSaveFile(owner);
  } else if (isCharacter(owner)) {
    return characterToSaveFile(owner);
  } else {
    return d2rStashToSaveFile(owner);
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/**
 * The save file to store or write for `owner`. A file that was not fully read
 * is kept exactly as uploaded, because writing it would drop the items the
 * parser skipped; if something changed it, this throws instead.
 */
export function toSaveFile(owner: ItemsOwner) {
  let raw = serialize(owner);
  const known = unreadable.get(owner);
  if (known) {
    if (!sameBytes(raw, known.rewritten)) {
      throw new Error(
        `Nothing was saved: some items in ${ownerName(
          owner
        )} could not be read, so saving changes to it would lose them.`
      );
    }
    raw = known.original;
  }
  let defaultName: string;
  if (isPlugyStash(owner)) {
    defaultName = owner.personal
      ? DEFAULT_PERSONAL_FILENAME
      : DEFAULT_SHARED_FILENAME;
  } else if (isCharacter(owner)) {
    defaultName = DEFAULT_CHARACTER_FILENAME;
  } else {
    defaultName = DEFAULT_D2R_SHARED_FILENAME;
  }
  return new File([new Blob([raw.buffer])], owner.filename || defaultName);
}
