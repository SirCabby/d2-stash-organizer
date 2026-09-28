import { readGameFile, writeJson } from "./files";

export interface ItemTypeClassMapping {
  [itemType: string]: string | undefined; // itemType -> class code (ama, bar, nec, pal, sor, dru, ass) or undefined
}

export async function itemTypesToJson() {
  const table = await readGameFile("ItemTypes");
  const classMappings: ItemTypeClassMapping = {};

  for (const line of table) {
    const typeCode = line[1].trim();
    const classCode = line[25].trim();

    if (typeCode && classCode && classCode !== "") {
      classMappings[typeCode] = classCode;
    }
  }

  await writeJson("ItemTypeClassMappings", classMappings);
  return classMappings;
}

// The category each item type has in the loot filter and the Chronicle (helms, axes, rings...).
// Types without one, like crafted sunder charms, get their parent type's.
export async function itemTypeCategoriesToJson() {
  const table = await readGameFile("ItemTypes");
  const lines = new Map(
    table.map((line): [string, string[]] => [line[1].trim(), line])
  );

  function categoryOf(typeCode: string): string | undefined {
    const line = typeCode ? lines.get(typeCode) : undefined;
    if (!line) {
      return undefined;
    }
    // The crafted sunder charm's line stops before the category column
    return (
      line[36]?.trim() ||
      categoryOf(line[2].trim()) ||
      categoryOf(line[3].trim())
    );
  }

  const categories: Record<string, string> = {};
  for (const typeCode of lines.keys()) {
    const category = categoryOf(typeCode);
    if (category) {
      categories[typeCode] = category;
    }
  }

  await writeJson("ItemTypeCategories", categories);
  return categories;
}
