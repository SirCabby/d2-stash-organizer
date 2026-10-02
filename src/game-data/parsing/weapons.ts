import { readGameFile, writeJson } from "./files";
import { EquipmentTier, Weapon } from "../types";
import { getString } from "../strings";
import { itemTypesToJson } from "./itemTypes";

// The damage columns are empty for the ways a weapon doesn't deal damage
function damage(min: string, max: string): [number, number] | undefined {
  return Number(max) ? [Number(min), Number(max)] : undefined;
}

export async function weaponsToJson() {
  const table = await readGameFile("Weapons");
  const classMappings = await itemTypesToJson();
  const weapons: Record<string, Weapon> = {};
  for (const line of table) {
    const code = line[3].trim();
    const tier =
      code === line[38].trim()
        ? EquipmentTier.NORMAL
        : code === line[39].trim()
        ? EquipmentTier.EXCEPTIONAL
        : EquipmentTier.ELITE;
    const itemType = line[1].trim();
    weapons[code] = {
      name: getString(line[5].trim()),
      type: itemType,
      tier,
      maxSockets: Number(line[56]) || 0,
      indestructible: line[30].trim() === "1",
      stackable: line[47] === "1",
      twoHanded: line[18] === "1",
      oneHandDamage: damage(line[15], line[16]),
      twoHandDamage: damage(line[19], line[20]),
      throwDamage: damage(line[21], line[22]),
      width: Number(line[45]),
      height: Number(line[46]),
      qlevel: Number(line[31]),
      levelReq: Number(line[33]),
      strReq: Number(line[27]) || undefined,
      dexReq: Number(line[28]) || undefined,
      maxStack: Number(line[49]) || undefined,
      trackQuestDifficulty: line[70] === "1" || undefined,
      classRequirement: classMappings[itemType],
    };
  }
  await writeJson("Weapons", weapons);
  return weapons;
}
