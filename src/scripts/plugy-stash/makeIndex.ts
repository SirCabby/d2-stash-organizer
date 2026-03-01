import { PlugyPage, PageFlags } from "./types";
import { D2rPage } from "../d2r-stash/types";

export function makeIndex(page: PlugyPage | D2rPage, main?: boolean) {
  if (!("flags" in page) || typeof page.flags === "undefined") {
    return;
  }
  page.flags += PageFlags.INDEX;
  if (main) {
    page.flags += PageFlags.MAIN_INDEX;
  }
}
