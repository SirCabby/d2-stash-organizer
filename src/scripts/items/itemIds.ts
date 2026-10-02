import { Item } from "./types/Item";
import { ItemsOwner } from "../save-file/ownership";
import { fromInt } from "../save-file/binary";
import { FIRST_D2R, LAST_LEGACY } from "../character/parsing/versions";
import { parseAgain } from "./repairItem";

// RotW gives every item a GUID, which it keeps in the item's realm data. When
// it loads a character and the shared stash, it deletes every item whose GUID
// it has already loaded ("LOADDELETEDUPE" in D2RLoader's log). Items without
// realm data get a GUID from the game. Legacy formats keep the first 3 of its
// 4 dwords, and converting back to D2R makes the 4th one 0, so comparing those
// 3 finds the items that can end up duplicates.
const SHARED_GUID_BITS = 96;

function random32() {
  return Math.floor(Math.random() * 2 ** 32);
}

/**
 * Gives the item a new random ID and, if it has one, a new random GUID, in its
 * raw string too. `owner` is that of the save the item is in (see parseAgain).
 * Returns false when they can't be found in its raw string.
 */
function newIds(item: Item, owner: ItemsOwner): boolean {
  // Legacy simple items have neither
  if (item.simple && owner.version <= LAST_LEGACY) {
    return true;
  }
  const parsed = parseAgain(item, owner);
  if (!parsed) {
    return false;
  }
  let raw = item.raw;
  if (parsed.idIndex !== undefined) {
    const id = random32();
    const index = parsed.idIndex;
    raw = raw.slice(0, index) + fromInt(id, 32) + raw.slice(index + 32);
    item.id = id;
  }
  if (parsed.realmDataIndex !== undefined) {
    let guid = "";
    for (let i = owner.version >= FIRST_D2R ? 4 : 3; i > 0; i--) {
      guid += fromInt(random32(), 32);
    }
    const index = parsed.realmDataIndex;
    raw = raw.slice(0, index) + guid + raw.slice(index + guid.length);
  }
  item.raw = raw;
  return true;
}

/**
 * Gives a copy, and the items in its sockets, IDs of their own, so that the
 * game doesn't delete the copy or the original as duplicates of each other.
 */
export function giveNewIds(copy: Item) {
  for (const item of [copy, ...(copy.filledSockets ?? [])]) {
    if (!newIds(item, copy.owner)) {
      throw new Error(
        `Could not give the copy of ${copy.name ?? copy.code} IDs of its own.`
      );
    }
  }
}

function sharedGuid(item: Item, owner: ItemsOwner) {
  // Only items loaded with realm data can have some, and simple items lose it
  // in legacy saves
  if (!item.hasRealmData || (item.simple && owner.version <= LAST_LEGACY)) {
    return undefined;
  }
  const index = parseAgain(item, owner)?.realmDataIndex;
  return index === undefined
    ? undefined
    : item.raw.slice(index, index + SHARED_GUID_BITS);
}

/**
 * Gives new IDs to the items, or the items in their sockets, that share their
 * GUID with another one, like copies made before copying gave them IDs of their
 * own. One of each keeps its GUID: preferably one `canChange` refuses, then one
 * in a D2R save, which the game has seen. Returns how many got new IDs.
 */
export function fixDuplicateIds(
  items: Item[],
  canChange: (owner: ItemsOwner) => boolean
): number {
  const byGuid = new Map<string, [Item, ItemsOwner][]>();
  for (const item of items) {
    for (const held of [item, ...(item.filledSockets ?? [])]) {
      const guid = sharedGuid(held, item.owner);
      if (guid === undefined) continue;
      const holders = byGuid.get(guid);
      if (!holders) {
        byGuid.set(guid, [[held, item.owner]]);
      } else {
        holders.push([held, item.owner]);
      }
    }
  }

  let changed = 0;
  for (const holders of byGuid.values()) {
    if (holders.length < 2) continue;
    const keeper =
      holders.find(([, owner]) => !canChange(owner)) ??
      holders.find(([, owner]) => owner.version >= FIRST_D2R) ??
      holders[0];
    for (const holder of holders) {
      const [item, owner] = holder;
      if (holder !== keeper && canChange(owner) && newIds(item, owner)) {
        changed++;
      }
    }
  }
  return changed;
}
