import { readGameFile, writeJson } from "./files";
import { Armor, EquipmentTier } from "..";
import { getString } from "../strings";
import { itemTypesOf, itemTypesToJson } from "./itemTypes";

export async function armorsToJson() {
  const table = await readGameFile("Armor");
  const classMappings = await itemTypesToJson();
  const shieldTypes = await itemTypesOf("shld");
  const armors: Record<string, Armor> = {};
  for (const line of table) {
    const code = line[19].trim();
    const tier =
      code === line[24].trim()
        ? EquipmentTier.NORMAL
        : code === line[25].trim()
        ? EquipmentTier.EXCEPTIONAL
        : EquipmentTier.ELITE;
    const itemType = line[52].trim();
    armors[code] = {
      name: getString(line[20].trim()),
      type: itemType,
      tier,
      def: [Number(line[6]), Number(line[7])],
      // Some shields, like bucklers, block only with the class' chance
      block: shieldTypes.has(itemType) ? Number(line[11]) : undefined,
      maxSockets: Number(line[31]),
      indestructible: line[13].trim() === "1",
      width: Number(line[28]),
      height: Number(line[29]),
      qlevel: Number(line[14]),
      levelReq: Number(line[16]),
      strReq: Number(line[9]) || undefined,
      dexReq: Number(line[10]) || undefined,
      stackable: line[44] === "1",
      classRequirement: classMappings[itemType],
    };
  }
  await writeJson("Armor", armors);
  return armors;
}
