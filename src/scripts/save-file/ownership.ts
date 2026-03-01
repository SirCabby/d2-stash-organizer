import { PlugyStash } from "../plugy-stash/types";
import { Character } from "../character/types";
import { D2rStash } from "../d2r-stash/types";

export const PLUGY_SHARED_STASH_NAME = "PlugY shared stash";
export const NON_PLUGY_SHARED_STASH_NAME = "Offline stash";
export const D2R_SHARED_STASH_NAME = "D2R shared stash";

export function d2rStashName(filename: string) {
  const lower = filename.toLowerCase();
  const isRotW = lower.startsWith("modern");
  const isHardcore = lower.includes("hardcore");
  const tags: string[] = [];
  if (isHardcore) tags.push("HC");
  if (isRotW) tags.push("RotW");
  else if (lower.includes("sharedstash")) tags.push("Expansion");
  if (tags.length === 0) return D2R_SHARED_STASH_NAME;
  return `${D2R_SHARED_STASH_NAME} (${tags.join(", ")})`;
}

export type ItemsOwner = Character | D2rStash | PlugyStash;

export type Stash = D2rStash | PlugyStash;

export function isStash(owner: ItemsOwner): owner is Stash {
  return "pages" in owner;
}

export function isPlugyStash(owner: ItemsOwner): owner is PlugyStash {
  return "personal" in owner;
}

export function isD2rStash(owner: ItemsOwner): owner is D2rStash {
  return isStash(owner) && !isPlugyStash(owner);
}

export function isCharacter(owner: ItemsOwner): owner is Character {
  return "items" in owner;
}

export function ownerName(owner: ItemsOwner) {
  if (isPlugyStash(owner)) {
    return owner.personal
      ? `${owner.filename.slice(0, -4)}'s stash`
      : owner.nonPlugY
      ? NON_PLUGY_SHARED_STASH_NAME
      : PLUGY_SHARED_STASH_NAME;
  } else if (isCharacter(owner)) {
    return owner.filename.slice(0, -4);
  } else {
    return d2rStashName(owner.filename);
  }
}
