import { Item } from "../types/Item";
import { ItemQuality } from "../types/ItemQuality";
import { FIRST_D2R, LAST_LEGACY } from "../../character/parsing/versions";
import { encodeHuffman } from "../parsing/huffman";
import { fromInt, fromString } from "../../save-file/binary";
import { MISC } from "../../../game-data";

// 16 less bits for the JM header, 7 less for the item version
export const D2R_OFFSET = -23;

// Indices in the raw string
const D2_ITEM_VERSION_START = 48;
const D2_ITEM_VERSION_END = D2_ITEM_VERSION_START + 10;
const D2R_ITEM_VERSION_START = D2_ITEM_VERSION_START - 16;
const D2R_ITEM_VERSION_END = D2R_ITEM_VERSION_START + 3;

const D2_ITEM_CODE_START = 76;
const D2_ITEM_CODE_END = D2_ITEM_CODE_START + 32;
const D2R_ITEM_CODE_START = D2_ITEM_CODE_START + D2R_OFFSET;
// D2R item code end is dynamic :(

const JM_HEADER = fromString("JM");

// Fixed fields between the item code and the quality-specific data
const REST_PREFIX_BITS = 3 + 32 + 7 + 4; // nbFilledSockets + id + level + quality

/**
 * Compute how many bits the quality-specific section occupies in the "rest"
 * data (everything after the item code). This includes the picture flag,
 * class-specific flag, quality-type data, runeword data, personalized name,
 * book bits, and realm data — everything up to (but not including) the
 * quantified data / d2rExtraBitIndex.
 *
 * Returns an object with the personalized name position and realm-data flag
 * position so callers can surgically adjust those sections.
 */
function computeQualityLayout(item: Item, charBits: number) {
  let offset = REST_PREFIX_BITS;

  // Multiple pictures flag
  offset += 1;
  if (item.picture != null) offset += 3;

  // Class-specific affix flag
  offset += 1;
  if (item.classSpecificAffix != null) offset += 11;

  // Quality-specific data
  switch (item.quality) {
    case ItemQuality.LOW:
    case ItemQuality.SUPERIOR:
      offset += 3;
      break;
    case ItemQuality.MAGIC:
      offset += 22; // prefix(11) + suffix(11)
      break;
    case ItemQuality.SET:
    case ItemQuality.UNIQUE:
      offset += 12;
      break;
    case ItemQuality.RARE:
    case ItemQuality.CRAFTED:
      offset += 16; // 2 × 8-bit rare names
      offset += 6; // 6 affix flags
      offset +=
        11 * ((item.prefixes?.length ?? 0) + (item.suffixes?.length ?? 0));
      break;
  }

  // Runeword data
  if (item.runeword) offset += 16; // runewordId(12) + skip(4)

  // Personalized name
  const personalizedNameOffset = offset;
  if (item.personalized && item.personalizedName) {
    offset += (item.personalizedName.length + 1) * charBits; // +1 for null terminator
  }

  // Book data
  if (MISC[item.code]?.type === "book") offset += 5;

  // Realm data flag
  const realmDataFlagOffset = offset;
  offset += 1; // the flag bit itself
  if (item.hasRealmData) {
    // Caller's charBits tells us the format: 7 = legacy (3×32), 8 = D2R (4×32)
    offset += charBits === 8 ? 128 : 96;
  }

  return {
    personalizedNameOffset,
    realmDataFlagOffset,
    totalQualityBits: offset,
  };
}

/**
 * Re-encode a personalized name between character widths (7↔8 bit).
 * Returns the modified raw and the bit-length delta.
 */
function reencodePersonalizedName(
  raw: string,
  nameStart: number,
  name: string,
  fromCharBits: number,
  toCharBits: number
): { raw: string; delta: number } {
  const oldLen = (name.length + 1) * fromCharBits;
  let encoded = "";
  for (const ch of name) {
    encoded += fromInt(ch.charCodeAt(0), toCharBits);
  }
  encoded += fromInt(0, toCharBits); // null terminator
  return {
    raw: raw.slice(0, nameStart) + encoded + raw.slice(nameStart + oldLen),
    delta: encoded.length - oldLen,
  };
}

export function toD2R(item: Item) {
  if (item.owner.version >= FIRST_D2R) {
    return;
  }

  const huffmanCode = encodeHuffman(item.code.padEnd(4, " "));
  const codeDelta = huffmanCode.length - 32;

  // Build the raw without JM header, with D2R version and Huffman code
  let raw =
    item.raw.slice(16, D2_ITEM_VERSION_START) +
    item.version +
    item.raw.slice(D2_ITEM_VERSION_END, D2_ITEM_CODE_START) +
    huffmanCode +
    item.raw.slice(D2_ITEM_CODE_END);

  if (!item.simple) {
    const restStart = D2R_ITEM_CODE_START + huffmanCode.length;

    // Re-encode personalized name from 7-bit (legacy) to 8-bit (D2R)
    let nameDelta = 0;
    if (item.personalized && item.personalizedName) {
      const layout = computeQualityLayout(item, 7);
      const namePos = restStart + layout.personalizedNameOffset;
      const result = reencodePersonalizedName(
        raw,
        namePos,
        item.personalizedName,
        7,
        8
      );
      raw = result.raw;
      nameDelta = result.delta;
    }

    // Insert 32 bits of realm data (legacy has 3×uint32, D2R needs 4×uint32)
    let realmDelta = 0;
    if (item.hasRealmData) {
      const layout = computeQualityLayout(item, 7);
      const realmFlagPos = restStart + layout.realmDataFlagOffset + nameDelta;
      // Insert 32 zero bits after the existing 3×32 = 96 bits of realm data
      const insertPos = realmFlagPos + 1 + 96;
      raw = raw.slice(0, insertPos) + "0".repeat(32) + raw.slice(insertPos);
      realmDelta = 32;
    }

    // Insert the D2R extra bit. In D2R format this bit sits right before the
    // sockets field (for socketed items) or at the end of quantified data (for
    // non-socketed items). The parser reads it as part of the sockets value,
    // which is why D2R-parsed sockets appear doubled.
    if (item.d2rExtraBitIndex != null && !item.hasD2rExtraBit) {
      const socketShift = item.socketed ? 4 : 0;
      const newIdx =
        item.d2rExtraBitIndex -
        16 -
        7 +
        codeDelta +
        nameDelta +
        realmDelta -
        socketShift;
      raw = raw.slice(0, newIdx) + "0" + raw.slice(newIdx);
      item.d2rExtraBitIndex = newIdx + socketShift;
      item.hasD2rExtraBit = true;
    }
  } else {
    // D2R simple items carry a realm-data flag after the socket/quest fields.
    // When set, 8 bits of data follow (stack quantity on dedicated tabs,
    // opaque realm data on regular tabs). Legacy items lack this entirely.
    // Always emit flag=1 + 8 data bits so the byte size matches what the
    // game writes for D2R items.
    raw += "1" + fromInt(item.quantity ?? 0, 8);
  }

  item.raw = raw;

  if (item.filledSockets) {
    for (const socket of item.filledSockets) {
      toD2R(socket);
    }
  }
}

export function toD2(item: Item) {
  if (item.owner.version <= LAST_LEGACY) {
    return;
  }

  const huffmanCode = encodeHuffman(item.code.padEnd(4, " "));
  const codeDelta = huffmanCode.length - 32;

  let rawWithoutExtra = item.raw;
  if (!item.simple) {
    // Strip the D2R extra bit. For socketed items the bit sits before the
    // sockets field (4 positions before d2rExtraBitIndex); for non-socketed
    // items it sits right at d2rExtraBitIndex.
    if (item.d2rExtraBitIndex != null && item.hasD2rExtraBit) {
      const socketShift = item.socketed ? 4 : 0;
      const idx = item.d2rExtraBitIndex - socketShift;
      rawWithoutExtra = item.raw.slice(0, idx) + item.raw.slice(idx + 1);
      item.hasD2rExtraBit = false;
    }

    const restStart = D2R_ITEM_CODE_START + huffmanCode.length;

    // Strip 32 bits of realm data (D2R has 4×uint32, legacy needs 3×uint32)
    let realmDelta = 0;
    if (item.hasRealmData) {
      const layout = computeQualityLayout(item, 8);
      const realmFlagPos = restStart + layout.realmDataFlagOffset;
      // Remove the 4th uint32 (32 bits) after the flag + first 96 bits
      const removeStart = realmFlagPos + 1 + 96;
      rawWithoutExtra =
        rawWithoutExtra.slice(0, removeStart) +
        rawWithoutExtra.slice(removeStart + 32);
      realmDelta = -32;
    }

    // Re-encode personalized name from 8-bit (D2R) to 7-bit (legacy)
    let nameDelta = 0;
    if (item.personalized && item.personalizedName) {
      const layout = computeQualityLayout(item, 8);
      const namePos = restStart + layout.personalizedNameOffset + realmDelta;
      const result = reencodePersonalizedName(
        rawWithoutExtra,
        namePos,
        item.personalizedName,
        8,
        7
      );
      rawWithoutExtra = result.raw;
      nameDelta = result.delta;
    }

    // Update d2rExtraBitIndex to reflect the legacy format position so that
    // a subsequent toD2R() call computes the correct insertion point.
    if (item.d2rExtraBitIndex != null) {
      item.d2rExtraBitIndex =
        item.d2rExtraBitIndex + 16 + 7 - codeDelta + nameDelta + realmDelta;
    }
  } else {
    // Strip the D2R realm-data flag + data from simple items since legacy
    // format lacks this field. Flag=1 means 9 bits total, flag=0 means 1 bit.
    const lastBit = rawWithoutExtra.length - 1;
    if (lastBit >= 8 && rawWithoutExtra[lastBit - 8] === "1") {
      rawWithoutExtra = rawWithoutExtra.slice(0, lastBit - 8);
    } else {
      rawWithoutExtra = rawWithoutExtra.slice(0, lastBit);
    }
  }

  item.raw =
    JM_HEADER +
    rawWithoutExtra.slice(0, D2R_ITEM_VERSION_START) +
    fromInt(Number(item.version), 10) +
    rawWithoutExtra.slice(D2R_ITEM_VERSION_END, D2R_ITEM_CODE_START) +
    fromString(item.code.padEnd(4, " ")) +
    rawWithoutExtra.slice(D2R_ITEM_CODE_START + huffmanCode.length);

  if (item.filledSockets) {
    for (const socket of item.filledSockets) {
      toD2(socket);
    }
  }
}
