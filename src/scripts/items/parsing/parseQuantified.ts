import { BinaryStream } from "../../save-file/binary";
import { Item } from "../types/Item";
import { ARMORS, MISC, WEAPONS } from "../../../game-data";

export function parseQuantified(
  { readInt, position }: BinaryStream,
  item: Item
) {
  const baseArmor = ARMORS[item.code];
  const baseWeapon = WEAPONS[item.code];
  const baseMisc = MISC[item.code];

  if (baseArmor) {
    // NOTE:
    // Any piece of armor that spawns with +% Enhanced Defense
    // has a base defense of maxac+1 (normal maximum base defense + 1).
    item.defense = readInt(11) - 10;
  }

  if (baseArmor || baseWeapon) {
    const maxDurability = readInt(8);
    // Indestructible items have max durability 0 and no current durability
    if (maxDurability) {
      // 9 bits, unlike the max (Save Bits in ItemStatCost.txt)
      item.durabilityIndex = position();
      item.durability = [readInt(9), maxDurability];
    }
  }

  if (baseArmor?.stackable || baseWeapon?.stackable || baseMisc?.stackable) {
    item.quantity = readInt(9);
  }

  if (item.socketed) {
    item.sockets = readInt(4);
  }
}
