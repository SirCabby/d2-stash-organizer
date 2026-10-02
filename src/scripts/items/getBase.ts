import { Armor, ARMORS, Misc, MISC, Weapon, WEAPONS } from "../../game-data";

export function getBase(item: {
  code: string;
  name?: string;
}): Armor | Weapon | Misc {
  const base = ARMORS[item.code] || WEAPONS[item.code] || MISC[item.code];
  if (!base) {
    throw new Error(
      `Could not find base ${item.code} for ${item.name ?? "unknown item"}`
    );
  }
  return base;
}
