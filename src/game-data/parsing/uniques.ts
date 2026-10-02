import { readGameFile, writeJson } from "./files";
import { Skill, UniqueItem } from "../types";
import { getString } from "../strings";
import { readModifierRange } from "./modifierRange";

const ELEMENTS: Record<string, string> = {
  "dmg-ltng": "Lightning",
  "dmg-cold": "Cold",
  "dmg-fire": "Fire",
  "dmg-pois": "Poison",
};

const TRIGGERS: Record<string, string> = {
  "death-skill": "Death",
  "levelup-skill": "Level-up",
};

// The 8 Rainbow Facets share their name: their element and what casts their
// skill tell them apart, like "Rainbow Facet (Cold, Level-up)"
function variantName({ name, modifiers }: UniqueItem) {
  const element = modifiers.find(({ prop }) => ELEMENTS[prop]);
  const trigger = modifiers.find(({ prop }) => TRIGGERS[prop]);
  return element && trigger
    ? `${name} (${ELEMENTS[element.prop]}, ${TRIGGERS[trigger.prop]})`
    : name;
}

export async function uniquesToJson(skills: Skill[]) {
  const table = await readGameFile("UniqueItems");
  const uniques: UniqueItem[] = [];
  for (const line of table) {
    const item: UniqueItem = {
      name: getString(line[0].trim()),
      enabled: line[3].trim() !== "1",
      inChronicle: line[5].trim() !== "1",
      code: line[13].trim(),
      qlevel: Number(line[11]),
      reqlevel: Number(line[12]),
      modifiers: [],
    };
    for (let i = 0; i < 12; i++) {
      const modifier = readModifierRange(line, 25 + 4 * i, skills);
      if (modifier) {
        item.modifiers.push(modifier);
      }
    }
    uniques.push(item);
  }
  const names = uniques.map(({ name }) => name);
  for (const item of uniques) {
    if (names.indexOf(item.name) !== names.lastIndexOf(item.name)) {
      item.name = variantName(item);
    }
  }
  await writeJson("UniqueItems", uniques);
  return uniques;
}
