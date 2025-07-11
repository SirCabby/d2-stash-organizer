import { Item } from "../../scripts/items/types/Item";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";
import { getBase } from "../../scripts/items/getBase";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import { QuantityControls } from "./QuantityControls";

export interface CustomAdditionalInfoProps {
  item: Item;
  quantity?: number;
  duplicates?: Item[];
}

export function CustomAdditionalInfo({
  item,
  quantity,
  duplicates,
}: CustomAdditionalInfoProps) {
  // For simple items with quantities, show quantity controls
  if (isSimpleItem(item) && duplicates && duplicates.length > 1) {
    return <QuantityControls item={item} duplicates={duplicates} />;
  }

  // For other items, show regular additional info
  const relevant = [];

  if (isSimpleItem(item)) {
    relevant.push(`quantity: ${quantity}`);
  }

  if (
    item.runeword ||
    item.quality === ItemQuality.UNIQUE ||
    item.quality === ItemQuality.SET
  ) {
    if (item.perfectionScore === 100) {
      relevant.push("Perfect");
    } else {
      relevant.push(`${item.perfectionScore}% perfect`);
    }
  }

  if (item.ethereal) {
    relevant.push("Ethereal");
  }

  if (item.runeword) {
    relevant.push(getBase(item).name);
  }

  if (
    (item.quality ?? 10) <= ItemQuality.SUPERIOR &&
    !item.runeword &&
    !!item.sockets
  ) {
    relevant.push(`${item.sockets} sockets`);
  }

  return <>{relevant.join(", ")}</>;
}
