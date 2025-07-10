import { readGameFile, writeJson } from "./files";

export interface ItemTypeClassMapping {
  [itemType: string]: string | undefined; // itemType -> class code (ama, bar, nec, pal, sor, dru, ass) or undefined
}

export async function itemTypesToJson() {
  const table = await readGameFile("ItemTypes");
  const classMappings: ItemTypeClassMapping = {};

  for (const line of table) {
    const itemType = line[0].trim();
    const classCode = line[25].trim(); // Class column (index 25)

    // Only add mappings where there's actually a class restriction
    if (classCode && classCode !== "") {
      // Store both the original case and lowercase versions for flexible lookup
      classMappings[itemType] = classCode;
      classMappings[itemType.toLowerCase()] = classCode;
    }
  }

  await writeJson("ItemTypeClassMappings", classMappings);
  return classMappings;
}
