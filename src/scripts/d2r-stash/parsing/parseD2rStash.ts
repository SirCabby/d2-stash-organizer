import { SaveFileReader } from "../../save-file/SaveFileReader";
import { D2rStash, D2rVariant } from "../types";
import { parsePage } from "./parsePage";
import { postProcessStash } from "./postProcessStash";
import { parseItemList } from "../../items/parsing/parseItemList";

const STASH_HEADER = 0xaa55aa55;
const EXPANSION_PAGE_COUNT = 3;
const ROTW_TOTAL_PAGE_COUNT = 7;
const ROTW_ITEM_PAGE_COUNT = 5;

const TAB_TYPE_STACKABLE = 1;

function findPageOffsets(raw: Uint8Array): number[] {
  const offsets: number[] = [];
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  for (let i = 0; i <= raw.length - 4; i++) {
    if (view.getUint32(i, true) === STASH_HEADER) {
      offsets.push(i);
    }
  }
  return offsets;
}

function readPageTabType(raw: Uint8Array, pageOffset: number): number {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  // Tab type is at offset +20 within the page header (after header, format,
  // version, gold, and page-length fields).
  return view.getUint32(pageOffset + 20, true);
}

// Can't use Node's Buffer because this needs to run in the browser
export function parseD2rStash(
  raw: Uint8Array,
  file?: { name: string; lastModified?: number }
) {
  const reader = new SaveFileReader(raw);
  reader.peek = true;
  const header = reader.readInt32LE().toString(16);
  if (header !== "aa55aa55") {
    throw new Error(
      "This does not look like a Diablo 2 shared stash save (.d2i)"
    );
  }

  const pageOffsets = findPageOffsets(raw);
  let variant: D2rVariant;
  let itemPageCount: number;
  if (pageOffsets.length >= ROTW_TOTAL_PAGE_COUNT) {
    variant = "rotw";
    itemPageCount = ROTW_ITEM_PAGE_COUNT;
  } else if (pageOffsets.length === EXPANSION_PAGE_COUNT) {
    variant = "expansion";
    itemPageCount = EXPANSION_PAGE_COUNT;
  } else {
    variant = "expansion";
    itemPageCount = pageOffsets.length;
  }

  const stash: D2rStash = {
    filename: file?.name ?? "",
    lastModified: file?.lastModified ?? 0,
    variant,
    version: reader.readInt32LE(8),
    pages: [],
  };
  reader.peek = false;

  for (let i = 0; i < itemPageCount; i++) {
    reader.nextIndex = pageOffsets[i];
    stash.pages.push(parsePage(reader, stash));
  }

  // Parse remaining pages: dedicated stackable tabs and raw tail data
  let tailStartIndex = pageOffsets.length;
  for (let i = itemPageCount; i < pageOffsets.length; i++) {
    const tabType = readPageTabType(raw, pageOffsets[i]);
    if (tabType === TAB_TYPE_STACKABLE) {
      reader.nextIndex = pageOffsets[i] + 64; // skip page header + padding
      const items = parseItemList(reader, stash, { dedicatedTab: true });
      stash.dedicatedTab = items.map((item) => ({
        item,
        quantity: item.quantity ?? 1,
      }));
      tailStartIndex = Math.max(tailStartIndex, i + 1);
    } else {
      // First non-stackable page marks the start of opaque tail data
      if (!stash.tailData) {
        stash.tailData = raw.slice(pageOffsets[i]);
        tailStartIndex = pageOffsets.length; // consumed the rest
      }
      break;
    }
  }

  postProcessStash(stash);
  return stash;
}
