import { SetItem, UniqueItem } from "../../../game-data";
import { Item } from "../../items/types/Item";
import { getGrailItem } from "./getGrailItem";
import { getBase } from "../../items/getBase";

// Uniques with the ethereal property, like Ethereal Edge, never drop without it
export function isAlwaysEthereal(item: UniqueItem | SetItem) {
  return (
    !("set" in item) && item.modifiers.some(({ prop }) => prop === "ethereal")
  );
}

export function canBeEthereal(item: Item | UniqueItem) {
  if (!("enabled" in item)) {
    item = getGrailItem(item) as UniqueItem;
  }
  if (!item) {
    return false;
  }
  return (
    !getBase(item).indestructible &&
    item.modifiers.every(
      ({ prop }) => prop !== "indestruct" && prop !== "ethereal"
    )
  );
}
