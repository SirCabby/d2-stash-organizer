import { Position } from "./position";
import { getBase } from "../../items/getBase";
import { ALL_ROWS, PAGE_WIDTH } from "../../plugy-stash/dimensions";
import { LayoutItem, LayoutResult } from "./types";

export function singleLineLayout<T extends LayoutItem>(
  groups: T[][]
): LayoutResult<T> {
  const positions = new Map<T, Position>();

  let currentPage = 0;
  let col = 0;
  for (const group of groups) {
    for (const item of group) {
      const base = getBase(item);
      if (col + base.width > PAGE_WIDTH) {
        currentPage++;
        col = 0;
      }
      positions.set(item, { page: currentPage, rows: ALL_ROWS, cols: [col] });
      col += base.width;
    }
  }

  const hasItems = groups.some((g) => g.length > 0);
  return { nbPages: hasItems ? currentPage + 1 : 0, positions };
}
