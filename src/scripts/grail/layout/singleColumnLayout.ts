import { Position } from "./position";
import { getBase } from "../../items/getBase";
import { ALL_COLUMNS, PAGE_HEIGHT } from "../../plugy-stash/dimensions";
import { LayoutItem, LayoutResult } from "./types";

export function singleColumnLayout<T extends LayoutItem>(
  groups: T[][]
): LayoutResult<T> {
  const positions = new Map<T, Position>();

  let currentPage = 0;
  let row = 0;
  for (const group of groups) {
    for (const item of group) {
      const base = getBase(item);
      if (row + base.height > PAGE_HEIGHT) {
        // Move to next page
        currentPage++;
        row = 0;
      }
      positions.set(item, { page: currentPage, rows: [row], cols: ALL_COLUMNS });
      row += base.height;
    }
  }

  return { nbPages: currentPage + 1, positions };
}
