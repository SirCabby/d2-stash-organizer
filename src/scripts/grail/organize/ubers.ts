import { Item } from "../../items/types/Item";
import { layout } from "../layout";
import { makeIndex } from "../../plugy-stash/makeIndex";
import { sortAndGroupBy } from "./sortAndGroupBy";
import { addPage } from "../../plugy-stash/addPage";
import { moveItem } from "../../items/moving/safeMove";
import { Stash } from "../../save-file/ownership";

// Order to display them in
export const UBERS = [
  "pk1",
  "pk2",
  "pk3",
  "dhn",
  "bey",
  "mbr",
  "std",
  "xa1",
  "xa2",
  "xa3",
  "xa4",
  "xa5",
  "ua1",
  "ua2",
  "ua3",
  "ua4",
  "ua5",
  "um1",
  "um2",
  "um3",
  "um4",
  "um5",
  "um6",
  "cjw",
];

export function organizeUbers(stash: Stash, items: Item[]) {
  if (items.length === 0) return;

  const groups = sortAndGroupBy(items, (item) => UBERS.indexOf(item.code));
  const offset = stash.pages.length;
  const { nbPages, positions } = layout("lines", groups);
  for (let i = 0; i < nbPages; i++) {
    const page = addPage(stash, "Ubers");
    if (i === 0) {
      makeIndex(page, false);
    }
  }
  for (const [item, { page, rows, cols }] of positions.entries()) {
    moveItem(stash, item, offset + page, rows[0], cols[0]);
  }
}
