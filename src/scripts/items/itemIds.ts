import { Item } from "./types/Item";
import { ItemsOwner } from "../save-file/ownership";
import { fromInt } from "../save-file/binary";
import { FIRST_D2R, LAST_LEGACY } from "../character/parsing/versions";
import { parseAgain } from "./repairItem";
import { getAllItems } from "../plugy-stash/getAllItems";
import { fittingSeed, random32, seedFits, unusedSeed } from "./seeds";

// RotW gives every item a GUID, which it keeps in the item's realm data. When
// it loads a character and the shared stash, it deletes every item whose GUID
// it has already loaded ("LOADDELETEDUPE" in D2RLoader's log). Items without
// realm data get a GUID from the game. Legacy formats keep the first 3 of its
// 4 dwords, and converting back to D2R makes the 4th one 0, so comparing those
// 3 finds the items that can end up duplicates.
const SHARED_GUID_BITS = 96;

/**
 * The seeds (`item.id`) and GUIDs items have, so that new ones are no other
 * item's. GUIDs go by their first 96 bits, as raw strings (see above).
 */
export interface TakenIds {
  seeds: Set<number>;
  guids: Set<string>;
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

/** The seeds and GUIDs of the owners' items and of the items in their sockets. */
export function takenIds(owners: ItemsOwner[]): TakenIds {
  const taken: TakenIds = { seeds: new Set(), guids: new Set() };
  for (const owner of owners) {
    for (const item of getAllItems(owner)) {
      for (const held of [item, ...(item.filledSockets ?? [])]) {
        if (held.id !== undefined) {
          taken.seeds.add(held.id);
        }
        const guid = sharedGuid(held, owner);
        if (guid !== undefined) {
          taken.guids.add(guid);
        }
      }
    }
  }
  return taken;
}

/**
 * A seed for the item that no other item has and that rolls what its save
 * keeps of it (its base defense, its picture), as one the game made would.
 * `parsed` is the item freshly parsed (see parseAgain).
 */
function newSeed(parsed: Item, taken: TakenIds) {
  // No seed rolls an item the game can't have made: it gets one of its own
  const seed = fittingSeed(parsed, taken.seeds) ?? unusedSeed(taken.seeds);
  taken.seeds.add(seed);
  return seed;
}

/** A random GUID of `dwords` dwords whose first 96 bits no other item has. */
function newGuid(dwords: number, taken: TakenIds) {
  for (;;) {
    let guid = "";
    for (let i = 0; i < dwords; i++) {
      guid += fromInt(random32(), 32);
    }
    const shared = guid.slice(0, SHARED_GUID_BITS);
    if (!taken.guids.has(shared)) {
      taken.guids.add(shared);
      return guid;
    }
  }
}

function writeSeed(item: Item, index: number, seed: number) {
  item.raw =
    item.raw.slice(0, index) + fromInt(seed, 32) + item.raw.slice(index + 32);
  item.id = seed;
}

/**
 * Gives the item a new ID and, if it has one, a new GUID, in its raw string
 * too: see newSeed and newGuid. `owner` is that of the save the item is in
 * (see parseAgain). Returns false when they can't be found in its raw string.
 */
function newIds(item: Item, owner: ItemsOwner, taken: TakenIds): boolean {
  // Legacy simple items have neither
  if (item.simple && owner.version <= LAST_LEGACY) {
    return true;
  }
  const parsed = parseAgain(item, owner);
  if (!parsed) {
    return false;
  }
  if (parsed.idIndex !== undefined) {
    writeSeed(item, parsed.idIndex, newSeed(parsed, taken));
  }
  if (parsed.realmDataIndex !== undefined) {
    const guid = newGuid(owner.version >= FIRST_D2R ? 4 : 3, taken);
    const index = parsed.realmDataIndex;
    item.raw =
      item.raw.slice(0, index) + guid + item.raw.slice(index + guid.length);
  }
  return true;
}

/**
 * Gives a copy, and the items in its sockets, IDs of their own, so that the
 * game doesn't delete the copy or the original as duplicates of each other.
 * Each gets a seed that rolls what it has. Give them in the format of the save
 * the copy ends up in, so that a D2R save gets a whole GUID.
 */
export function giveNewIds(copy: Item, taken: TakenIds) {
  for (const item of [copy, ...(copy.filledSockets ?? [])]) {
    if (!newIds(item, copy.owner, taken)) {
      throw new Error(
        `Could not give the copy of ${copy.name ?? copy.code} IDs of its own.`
      );
    }
  }
}

/**
 * Gives new IDs to the items, or the items in their sockets, that share their
 * GUID with another one, like copies made before copying gave them IDs of their
 * own. One of each keeps its GUID: preferably one `canChange` refuses, then one
 * in a D2R save, which the game has seen. Returns how many got new IDs.
 */
export function fixDuplicateIds(
  items: Item[],
  canChange: (owner: ItemsOwner) => boolean,
  taken: TakenIds
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
      if (holder !== keeper && canChange(owner) && newIds(item, owner, taken)) {
        changed++;
      }
    }
  }
  return changed;
}

/**
 * Gives a new seed to the items, or the items in their sockets, whose seed
 * doesn't roll what they have, like copies the organizer gave a random one,
 * and to all but one of the items that share a seed. The new seed rolls what
 * they have and is no other item's. Of items sharing a seed, one keeps it: one
 * `canChange` refuses, else one the seed rolls, preferably in a D2R save.
 * Returns how many got a new seed, and how many have a seed that no seed can
 * replace, because the game can't have made what they have.
 */
export function fixSeeds(
  items: Item[],
  canChange: (owner: ItemsOwner) => boolean,
  taken: TakenIds
) {
  interface Holder {
    item: Item;
    owner: ItemsOwner;
    parsed: Item;
    index: number;
    fits: boolean;
  }
  const holders: Holder[] = [];
  const bySeed = new Map<number, Holder[]>();
  for (const item of items) {
    for (const held of [item, ...(item.filledSockets ?? [])]) {
      if (held.simple) continue;
      const parsed = parseAgain(held, item.owner);
      if (parsed?.idIndex === undefined || parsed.id === undefined) continue;
      const holder = {
        item: held,
        owner: item.owner,
        parsed,
        index: parsed.idIndex,
        fits: seedFits(parsed, parsed.id),
      };
      holders.push(holder);
      const group = bySeed.get(parsed.id);
      if (group) {
        group.push(holder);
      } else {
        bySeed.set(parsed.id, [holder]);
      }
    }
  }

  // The items that must not keep the seed they share
  const sharing = new Set<Holder>();
  for (const group of bySeed.values()) {
    if (group.length < 2) continue;
    const isD2r = ({ owner }: Holder) => owner.version >= FIRST_D2R;
    const keeper =
      group.find(({ owner }) => !canChange(owner)) ??
      group.find((h) => h.fits && isD2r(h)) ??
      group.find(({ fits }) => fits) ??
      group.find(isD2r) ??
      group[0];
    for (const holder of group) {
      if (holder !== keeper) sharing.add(holder);
    }
  }

  let fixed = 0;
  let cannotFix = 0;
  for (const holder of holders) {
    if (holder.fits && !sharing.has(holder)) continue;
    if (!canChange(holder.owner)) continue;
    const seed = fittingSeed(holder.parsed, taken.seeds);
    if (seed === undefined) {
      // Nothing the game rolls gives what it has: it still gets a seed of its
      // own if it shares one
      if (!holder.fits) cannotFix++;
      if (!sharing.has(holder)) continue;
    }
    const chosen = seed ?? unusedSeed(taken.seeds);
    taken.seeds.add(chosen);
    writeSeed(holder.item, holder.index, chosen);
    fixed++;
  }
  return { fixed, cannotFix };
}
