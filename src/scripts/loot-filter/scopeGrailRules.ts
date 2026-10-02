import { SetItem, UniqueItem } from "../../game-data";
import { GrailStatus } from "../grail/list/grailProgress";
import { LootFilterProfile, LootFilterRule } from "./types";

// A grail item still to find perfect, or only its ethereal copy
export interface MissingGrailItem {
  item: UniqueItem | SetItem;
  ethereal: boolean;
}

export interface GrailRuleUpdate {
  before: LootFilterRule;
  after: LootFilterRule;
  missing: MissingGrailItem[];
  // Grail items of the bases the rule no longer shows, all found perfect since
  found: (UniqueItem | SetItem)[];
  addedCodes: string[];
  removedCodes: string[];
}

export interface SkippedGrailRule {
  rule: LootFilterRule;
  reason: string;
}

// Rules the user named after the grail, like "Show Missing Unique Grails"
export function isGrailRule({ name }: LootFilterRule) {
  return /grail/i.test(name);
}

// The grail items of a rule's rarities, and the copies of them still missing
// a perfect roll. The loot filter can't tell ethereal items apart, so a unique
// rule is for both the normal and the eth grail. Sets aren't part of the eth
// grail.
function grailItemsOf(rule: LootFilterRule, statuses: GrailStatus[]) {
  const rarities = rule.equipmentRarity ?? [];
  return statuses
    .filter(({ item }) => rarities.includes("set" in item ? "set" : "unique"))
    .map(({ item, perfect, perfectEth }) => {
      const missing: MissingGrailItem[] = [];
      if (!perfect) {
        missing.push({ item, ethereal: false });
      }
      if (perfectEth === false) {
        missing.push({ item, ethereal: true });
      }
      return { item, missing };
    });
}

/**
 * Limits the grail rules of a loot filter profile to the grail items still
 * missing a perfect copy. The loot filter only knows base items, so a rule
 * shows every unique (or set item) of a base as long as one of that base's is
 * missing.
 * The rules' other settings stay as they are.
 */
export function scopeGrailRules(
  profile: LootFilterProfile,
  statuses: GrailStatus[]
) {
  const updates: GrailRuleUpdate[] = [];
  const skipped: SkippedGrailRule[] = [];

  const rules = profile.rules.map((rule) => {
    if (!isGrailRule(rule)) {
      return rule;
    }
    if (rule.ruleType !== "show") {
      skipped.push({ rule, reason: "only a Show rule can be scoped" });
      return rule;
    }
    const grailItems = grailItemsOf(rule, statuses);
    if (grailItems.length === 0) {
      skipped.push({
        rule,
        reason: "it has neither the Unique nor the Set rarity",
      });
      return rule;
    }

    const missing = grailItems.flatMap(({ missing }) => missing);
    const codes = new Set(missing.map(({ item }) => item.code));
    const current = rule.equipmentItemCode ?? [];
    const addedCodes = [...codes].filter((code) => !current.includes(code));
    const removedCodes = current.filter((code) => !codes.has(code));

    const after = { ...rule };
    // A category would show all of its items, found or not
    delete after.equipmentCategory;
    if (codes.size > 0) {
      // Keeping the order the game wrote them in keeps the file's changes small
      after.equipmentItemCode = [
        ...current.filter((code) => codes.has(code)),
        ...addedCodes,
      ];
    } else {
      // Without item codes, the rule would show all uniques or set items
      delete after.equipmentItemCode;
      after.enabled = false;
    }

    updates.push({
      before: rule,
      after,
      missing,
      found: grailItems
        .filter(({ item }) => removedCodes.includes(item.code))
        .map(({ item }) => item),
      addedCodes,
      removedCodes,
    });
    return after;
  });

  return { profile: { ...profile, rules }, updates, skipped };
}
