import { PageFlags, PlugyPage } from "./types";
import { D2rPage } from "../d2r-stash/types";
import { isPlugyStash, Stash } from "../save-file/ownership";

export function addPage(
  stash: Stash,
  pageName: string,
  index?: number
): PlugyPage | D2rPage {
  if (isPlugyStash(stash)) {
    const page: PlugyPage = {
      name: `# ${pageName}`,
      items: [],
      flags: stash.personal ? PageFlags.NONE : PageFlags.SHARED,
    };
    if (typeof index === "undefined") {
      stash.pages.push(page);
    } else {
      stash.pages.splice(index, 0, page);
    }
    return page;
  } else {
    const page: D2rPage = { gold: 0, items: [] };
    if (typeof index === "undefined") {
      stash.pages.push(page);
    } else {
      stash.pages.splice(index, 0, page);
    }
    return page;
  }
}
