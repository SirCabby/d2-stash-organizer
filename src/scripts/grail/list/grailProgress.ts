import { SetItem, UniqueItem } from "../../../game-data";
import { Item } from "../../items/types/Item";
import { getGrailItem } from "./getGrailItem";
import { canBeEthereal, isAlwaysEthereal } from "./canBeEthereal";
import { GrailCategory, listGrailItems, TIER_NAMES } from "./listGrailItems";

export interface GrailStatus {
  item: UniqueItem | SetItem;
  normal: boolean;
  // Undefined means not applicable
  ethereal?: boolean;
  perfect: boolean;
  perfectEth?: boolean;
  // Add the actual items found for this grail item
  foundItems: Item[];
}

function addToGrail(found: Map<UniqueItem | SetItem, Item[]>, item: Item) {
  const grailItem = getGrailItem(item);
  if (grailItem) {
    let existing = found.get(grailItem);
    if (!existing) {
      existing = [];
      found.set(grailItem, existing);
    }
    existing.push(item);
  }
}

export function grailProgress(items: Item[]): GrailCategory<GrailStatus>[] {
  const found = new Map<UniqueItem | SetItem, Item[]>();

  for (const item of items) {
    addToGrail(found, item);
    if (item.filledSockets) {
      for (const socketed of item.filledSockets) {
        addToGrail(found, socketed);
      }
    }
  }

  const toStatus = (item: UniqueItem | SetItem): GrailStatus => {
    const foundItems = found.get(item) || [];
    // Sets are not part of the eth grail
    const eth = !("set" in item) && canBeEthereal(item);
    // Uniques like Ethereal Edge only exist ethereal, so that copy is the normal one
    const normalItems = isAlwaysEthereal(item)
      ? foundItems
      : foundItems.filter(({ ethereal }) => !ethereal);
    return {
      item,
      normal: normalItems.length > 0,
      ethereal: eth ? foundItems.some(({ ethereal }) => ethereal) : undefined,
      perfect: normalItems.some(
        ({ perfectionScore }) => perfectionScore === 100
      ),
      perfectEth: eth
        ? foundItems.some(
            ({ perfectionScore, ethereal }) =>
              perfectionScore === 100 && ethereal
          )
        : undefined,
      foundItems,
    };
  };

  return listGrailItems().map(({ name, sections }) => ({
    name,
    sections: sections.map(({ name, tiers }) => ({
      name,
      tiers: tiers.map(({ tier, items }) => ({
        tier,
        items: items.map(toStatus),
      })),
    })),
  }));
}

export function allStatuses(progress: GrailCategory<GrailStatus>[]) {
  return progress.flatMap(({ sections }) =>
    sections.flatMap(({ tiers }) => tiers.flatMap(({ items }) => items))
  );
}

export function grailSummary(items: Item[]) {
  const summary = {
    nbNormal: 0,
    totalNormal: 0,
    nbEth: 0,
    totalEth: 0,
    nbPerfect: 0,
    nbPerfectEth: 0,
  };
  for (const { normal, ethereal, perfect, perfectEth } of allStatuses(
    grailProgress(items)
  )) {
    summary.totalNormal++;
    if (normal) {
      summary.nbNormal++;
    }
    if (perfect) {
      summary.nbPerfect++;
    }
    if (typeof ethereal !== "undefined") {
      summary.totalEth++;
      if (ethereal) {
        summary.nbEth++;
      }
    }
    if (typeof perfectEth !== "undefined") {
      if (perfectEth) {
        summary.nbPerfectEth++;
      }
    }
  }
  return summary;
}

export function printGrailProgress(items: Item[]) {
  for (const { name, sections } of grailProgress(items)) {
    console.log(`\x1b[1m${name.toUpperCase()}\x1b[22m`);
    for (const section of sections) {
      console.log(`\x1b[35m${section.name}\x1b[39m`);
      for (const { tier, items: tierItems } of section.tiers) {
        if (typeof tier !== "undefined") {
          console.log(`\x1b[36m${TIER_NAMES[tier]}\x1b[39m`);
        }
        for (const {
          item,
          normal,
          ethereal,
          perfect,
          perfectEth,
        } of tierItems) {
          let line = item.name;
          line += normal
            ? ` \x1b[32mnormal ✔\x1b[39m`
            : ` \x1b[31mnormal ✘\x1b[39m`;
          if (typeof ethereal !== "undefined") {
            line += ethereal
              ? ` \x1b[32meth ✔\x1b[39m`
              : ` \x1b[31meth ✘\x1b[39m`;
          }
          line += perfect
            ? ` \x1b[32mperfect ✔\x1b[39m`
            : ` \x1b[31mperfect ✘\x1b[39m`;
          if (typeof perfectEth !== "undefined") {
            line += perfectEth
              ? ` \x1b[32mperfectEth ✔\x1b[39m`
              : ` \x1b[31mperfectEth ✘\x1b[39m`;
          }
          console.log(line);
        }
        console.log("");
      }
    }
  }
}
