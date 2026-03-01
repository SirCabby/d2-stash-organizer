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
