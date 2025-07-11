import { Set, SET_ITEMS, SetItem, UniqueItem } from "../../../game-data";
import { Item } from "../../items/types/Item";
import { getGrailItem } from "./getGrailItem";
import { UniqueSection } from "./uniquesOrder";
import { listGrailUniques } from "./listGrailUniques";
import { groupBySet } from "./groupSets";
import { canBeEthereal } from "./canBeEthereal";

export interface GrailStatus {
  item: UniqueItem | SetItem;
  normal: boolean;
  // Undefined means not applicable
  ethereal?: boolean;
  perfect: boolean;
  perfectEth?: boolean;
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

export function grailProgress(items: Item[]) {
  const found = new Map<UniqueItem | SetItem, Item[]>();

  for (const item of items) {
    addToGrail(found, item);
    if (item.filledSockets) {
      for (const socketed of item.filledSockets) {
        addToGrail(found, socketed);
      }
    }
  }

  const progress = new Map<UniqueSection | Set, GrailStatus[][]>();

  for (const [section, uniques] of listGrailUniques()) {
    progress.set(
      section,
      uniques.map((tier) =>
        tier.map((item) => {
          return {
            item,
            normal: !!found.get(item)?.some(({ ethereal }) => !ethereal),
            ethereal: canBeEthereal(item)
              ? !!found.get(item)?.some(({ ethereal }) => ethereal)
              : undefined,
            perfect: !!found
              .get(item)
              ?.some(
                ({ perfectionScore, ethereal }) =>
                  perfectionScore === 100 && !ethereal
              ),
            perfectEth: canBeEthereal(item)
              ? !!found
                  .get(item)
                  ?.some(
                    ({ perfectionScore, ethereal }) =>
                      perfectionScore === 100 && ethereal
                  )
              : undefined,
          };
        })
      )
    );
  }

  for (const [set, setItems] of groupBySet(SET_ITEMS)) {
    progress.set(set, [
      setItems.map((item) => ({
        item,
        normal: !!found.get(item)?.some(({ ethereal }) => !ethereal),
        ethereal: undefined,
        perfect: !!found
          .get(item)
          ?.some(
            ({ perfectionScore, ethereal }) =>
              perfectionScore === 100 && !ethereal
          ),
        perfectEth: undefined,
      })),
    ]);
  }

  return progress;
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
  for (const tiers of grailProgress(items).values()) {
    for (const tier of tiers) {
      for (const { normal, ethereal, perfect, perfectEth } of tier) {
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
    }
  }
  return summary;
}

export function printGrailProgress(items: Item[]) {
  for (const [section, tiers] of grailProgress(items)) {
    console.log(`\x1b[35m${section.name}\x1b[39m`);
    for (const tier of tiers) {
      for (const { item, normal, ethereal, perfect, perfectEth } of tier) {
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
