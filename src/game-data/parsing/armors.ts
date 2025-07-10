import { readGameFile, writeJson } from "./files";
import { Armor, EquipmentTier } from "..";
import { getString } from "../strings";
import { itemTypesToJson } from "./itemTypes";

export async function armorsToJson() {
  const table = await readGameFile("Armor");
  const classMappings = await itemTypesToJson();
  const armors: Record<string, Armor> = {};
  for (const line of table) {
    const code = line[18].trim();
    const tier =
      code === line[23].trim()
        ? EquipmentTier.NORMAL
        : code === line[24].trim()
        ? EquipmentTier.EXCEPTIONAL
        : EquipmentTier.ELITE;
    const itemType = line[51].trim();
    armors[code] = {
      name: getString(line[19].trim()),
      type: itemType,
      tier,
      def: [Number(line[5]), Number(line[6])],
      maxSockets: Number(line[30]),
      indestructible: line[12].trim() === "1",
      width: Number(line[27]),
      height: Number(line[28]),
      qlevel: Number(line[13]),
      levelReq: Number(line[15]),
      stackable: line[43] === "1",
      classRequirement: classMappings[itemType],
    };
  }
  await writeJson("Armor", armors);
  return armors;
}
