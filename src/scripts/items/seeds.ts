import { SEED_ROLLS, SeedRolls } from "../../game-data";
import { Item } from "./types/Item";
import { ItemQuality } from "./types/ItemQuality";

// D2R 3.3's random stream (0x367110, 0x153B00 in D2R.exe): multiply with carry
// on {lo, hi}, the carry seeded with 666. The 64-bit product is worked out in
// 16-bit halves, so that doubles keep it exact.
const MULTIPLIER = 0x6ac690c5;
const MULTIPLIER_HIGH = MULTIPLIER >>> 16;
const MULTIPLIER_LOW = MULTIPLIER & 0xffff;
const TWO_32 = 2 ** 32;
// An odd stride visits all 2^32 seeds before coming back
const STRIDE = 0x9e3779b1;
// The enhanced defense stat (item_armor_percent)
const ENHANCED_DEFENSE = 16;

export class Rng {
  lo: number;
  hi = 666;

  constructor(seed: number) {
    this.lo = seed >>> 0;
  }

  step() {
    const a = this.lo >>> 16;
    const b = this.lo & 0xffff;
    const bd = b * MULTIPLIER_LOW;
    const ad = a * MULTIPLIER_LOW;
    const bc = b * MULTIPLIER_HIGH;
    const mid = (bd >>> 16) + (ad & 0xffff) + (bc & 0xffff);
    const low = (mid & 0xffff) * 0x10000 + (bd & 0xffff) + this.hi;
    const high =
      a * MULTIPLIER_HIGH +
      (ad >>> 16) +
      (bc >>> 16) +
      Math.floor(mid / 0x10000);
    this.lo = low % TWO_32;
    this.hi = high + Math.floor(low / TWO_32);
  }

  // A number below n, or 0 without a step when n is 0 or less
  roll(n: number) {
    if (n <= 0) {
      return 0;
    }
    this.step();
    return (n & (n - 1)) === 0 ? this.lo & (n - 1) : this.lo % n;
  }
}

export interface SeedRolled {
  quantity?: number;
  durability?: number;
  defense?: number;
  picture?: number;
}

/**
 * What the game rolls from the seed an item's save keeps, when it makes an
 * item of this base. Item init (0x43EF10) rolls in this order: a stack's
 * quantity and the durability, the base defense of armor, then the picture.
 */
export function seedRolls(base: SeedRolls, seed: number): SeedRolled {
  const rng = new Rng(seed);
  const rolled: SeedRolled = {};
  if (base.kind === "gold") {
    return rolled;
  }
  const { minStack, maxStack, spawnStack } = base;
  const half = base.durability >> 1;
  const durability = () => Math.min(rng.roll(half) + half, 0xff);
  if (base.kind === "quiver") {
    rolled.quantity = minStack + rng.roll(maxStack - minStack);
  } else if (base.kind === "armor") {
    rolled.durability = durability();
    const [min, max] = base.defense ?? [0, 0];
    rolled.defense = min + rng.roll(max - min + 1);
  } else if (base.kind === "weapon") {
    if (base.stackable) {
      rolled.quantity = minStack + rng.roll(maxStack - minStack);
    }
    rolled.durability = durability();
  } else if (base.stackable) {
    const top =
      spawnStack >= minStack && spawnStack !== 0
        ? spawnStack
        : Math.max(maxStack, minStack);
    rolled.quantity = minStack + rng.roll(top - minStack);
  }
  if (base.pictures) {
    rolled.picture = rng.roll(base.pictures);
  }
  return rolled;
}

function hasEnhancedDefense(item: Item) {
  return [item.modifiers ?? [], ...(item.setItemModifiers ?? [])].some((mods) =>
    mods.some(({ id }) => id === ENHANCED_DEFENSE)
  );
}

// The base defense the save keeps for a rolled one. Enhanced defense makes it
// the top plus one whatever was rolled (0x3D5AC0), an ethereal item has half as
// much again, a low quality one three quarters.
function keptDefense(base: SeedRolls, item: Item, rolled: number) {
  const top = base.defense?.[1] ?? 0;
  let defense = rolled;
  if (item.quality === ItemQuality.LOW) {
    defense = Math.max(1, Math.floor((defense * 75) / 100));
  } else if (hasEnhancedDefense(item) && top !== 0 && defense <= top) {
    defense = top + 1;
  }
  return item.ethereal ? Math.floor((defense * 3) / 2) : defense;
}

/**
 * The durability in the save when the game can have rolled it there: the
 * base's own max, not worn and not repaired beyond the roll.
 */
function rollableDurability(base: SeedRolls, item: Item) {
  if (item.ethereal || item.quality === ItemQuality.LOW || !item.durability) {
    return undefined;
  }
  const [current, max] = item.durability;
  const half = base.durability >> 1;
  return max === base.durability && current >= half && current < 2 * half
    ? current
    : undefined;
}

/**
 * Whether the seed rolls what the save keeps of the item: its base defense
 * and its picture. With `durability`, it must roll that durability too.
 * `item` must be freshly parsed (see parseAgain), so that its mods are the
 * save's own.
 */
export function seedFits(item: Item, seed: number, durability?: number) {
  const base = SEED_ROLLS[item.code];
  if (!base) {
    return true;
  }
  const rolled = seedRolls(base, seed);
  if (
    rolled.defense !== undefined &&
    item.defense !== undefined &&
    keptDefense(base, item, rolled.defense) !== item.defense
  ) {
    return false;
  }
  if (rolled.picture !== undefined && rolled.picture !== item.picture) {
    return false;
  }
  return durability === undefined || rolled.durability === durability;
}

/** Whether some seed rolls what the save keeps of the item. */
export function canBeRolled(item: Item) {
  const base = SEED_ROLLS[item.code];
  if (!base) {
    return true;
  }
  if (base.kind === "armor" && item.defense !== undefined && base.defense) {
    const [min, max] = base.defense;
    let found = false;
    for (let rolled = min; rolled <= max && !found; rolled++) {
      found = keptDefense(base, item, rolled) === item.defense;
    }
    if (!found) {
      return false;
    }
  }
  return (
    !base.pictures ||
    (item.picture !== undefined && item.picture < base.pictures)
  );
}

// Browsers and Node have a Web Crypto random source; Math.random is the fallback
const webCrypto = (
  globalThis as {
    crypto?: { getRandomValues?(array: Uint32Array): Uint32Array };
  }
).crypto;

/** A random 32-bit number. */
export function random32() {
  if (webCrypto?.getRandomValues) {
    return webCrypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * TWO_32);
}

/**
 * A seed that no item in `taken` has and that rolls what the save keeps of
 * the item (and its durability, when the game can have rolled it), the way
 * the game itself would have made the item. Walks the seeds from a random one.
 * Returns undefined when no seed rolls the item. `item` must be freshly
 * parsed (see parseAgain).
 */
export function fittingSeed(item: Item, taken: Set<number>) {
  if (!canBeRolled(item)) {
    return undefined;
  }
  const base = SEED_ROLLS[item.code];
  // Asking for the durability as well takes up to half the base's durability
  // times as many tries
  const durability = base ? rollableDurability(base, item) : undefined;
  let seed = random32();
  for (let tries = 0; tries < 2 ** 24; tries++) {
    seed = (seed + STRIDE) % TWO_32;
    if (!taken.has(seed) && seedFits(item, seed, durability)) {
      return seed;
    }
  }
  return undefined;
}

/** A seed no item in `taken` has, for an item no seed rolls. */
export function unusedSeed(taken: Set<number>) {
  let seed = random32();
  while (taken.has(seed)) {
    seed = (seed + STRIDE) % TWO_32;
  }
  return seed;
}
