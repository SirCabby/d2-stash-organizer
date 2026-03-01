import { Item } from "../../scripts/items/types/Item";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import {
  isPlugyStash,
  isD2rStash,
  ownerName,
} from "../../scripts/save-file/ownership";
import { dedicatedTabName } from "../../scripts/d2r-stash/dedicatedTab";

export interface ItemLocationDescProps {
  item: Item;
}

function locationString(item: Item) {
  if (!item.owner) {
    return "Unknown location";
  }
  const name = ownerName(item.owner);
  switch (item.location) {
    case ItemLocation.STORED:
      switch (item.stored) {
        case ItemStorageType.STASH:
          if (!isPlugyStash(item.owner)) {
            return `In ${name}'s stash`;
          }
          return name;
        case ItemStorageType.INVENTORY:
          return `In ${name}'s inventory`;
        case ItemStorageType.CUBE:
          return `In ${name}'s cube`;
        default:
          return "Unknown location";
      }
    case ItemLocation.BELT:
      return `In ${name}'s belt`;
    case ItemLocation.EQUIPPED:
      if (item.mercenary) {
        return `Worn by ${name}'s mercenary`;
      } else if (item.corpse) {
        return `On ${name}'s corpse`;
      } else {
        return `Worn by ${name}`;
      }
    case ItemLocation.CURSOR:
      if (isD2rStash(item.owner) && item.stored === ItemStorageType.STASH) {
        return `In ${name} ${dedicatedTabName(item)} tab`;
      }
      return "Unknown location";
    default:
      return "Unknown location";
  }
}

export function ItemLocationDesc({ item }: ItemLocationDescProps) {
  let positionedItem = item;
  let socket = "";
  if (item.location === ItemLocation.SOCKET) {
    positionedItem = item.socketedIn!;
    socket = `, socketed in ${positionedItem.name}`;
  }

  const location = locationString(positionedItem);
  const page =
    typeof item.page !== "undefined" ? `, page ${item.page + 1}` : "";
  return (
    <>
      {location}
      {page}
      {socket}
    </>
  );
}
