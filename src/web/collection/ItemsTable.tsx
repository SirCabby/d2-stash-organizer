import { Item as ItemType } from "../../scripts/items/types/Item";
import { useEffect, useMemo, useState } from "preact/hooks";
import { groupItems } from "../items/groupItems";
import { Pagination } from "../controls/Pagination";
import { Item } from "../items/Item";
import { SortField, SortDirection } from "./Collection";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";
import { getBase } from "../../scripts/items/getBase";
import { isSimpleItem } from "./utils/isSimpleItem";
import { isPlugyStash, ownerName } from "../../scripts/save-file/ownership";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";

export interface ItemsTableProps {
  items: ItemType[];
  pageSize: number;
  selectable: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function getGroupedItemSortValue(
  itemGroup: ItemType[],
  field: SortField
): string | number {
  const representativeItem = itemGroup[0];

  switch (field) {
    case "name":
      return representativeItem.name || "";
    case "characteristics": {
      const characteristics = [];
      if (isSimpleItem(representativeItem)) {
        // Include quantity for simple items
        characteristics.push(`simple (${itemGroup.length})`);
      }
      if (
        representativeItem.runeword ||
        representativeItem.quality === ItemQuality.UNIQUE ||
        representativeItem.quality === ItemQuality.SET
      ) {
        characteristics.push("special");
      }
      if (representativeItem.ethereal) {
        characteristics.push("ethereal");
      }
      if (representativeItem.runeword) {
        characteristics.push(getBase(representativeItem).name);
      }
      if (
        (representativeItem.quality ?? 10) <= ItemQuality.SUPERIOR &&
        !representativeItem.runeword &&
        !!representativeItem.sockets
      ) {
        characteristics.push("sockets");
      }
      return characteristics.join(", ");
    }
    case "location": {
      if (!representativeItem.owner) {
        return "Unknown location";
      }
      const name = ownerName(representativeItem.owner);
      switch (representativeItem.location) {
        case ItemLocation.STORED:
          switch (representativeItem.stored) {
            case ItemStorageType.STASH:
              if (!isPlugyStash(representativeItem.owner)) {
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
          if (representativeItem.mercenary) {
            return `Worn by ${representativeItem.mercenary}'s mercenary`;
          } else if (representativeItem.corpse) {
            return `On ${representativeItem.corpse}'s corpse`;
          } else {
            return `Worn by ${name}`;
          }
        default:
          return "Unknown location";
      }
    }
    default:
      return "";
  }
}

function sortGroupedItems(
  itemGroups: ItemType[][],
  field: SortField,
  direction: SortDirection
): ItemType[][] {
  if (field === "none") {
    return itemGroups;
  }

  return [...itemGroups].sort((a, b) => {
    const aValue = getGroupedItemSortValue(a, field);
    const bValue = getGroupedItemSortValue(b, field);

    let comparison = 0;
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    }

    return direction === "asc" ? comparison : -comparison;
  });
}

export function ItemsTable({
  items,
  pageSize,
  selectable,
  sortField,
  sortDirection,
  onSort,
}: ItemsTableProps) {
  const [firstItem, setFirstItem] = useState(0);

  // Group items first, then sort the groups
  const groupedItems = useMemo(() => groupItems(items), [items]);
  const sortedGroupedItems = useMemo(
    () => sortGroupedItems(groupedItems, sortField, sortDirection),
    [groupedItems, sortField, sortDirection]
  );

  // Reset to the first page when the list of items changes
  useEffect(() => {
    setFirstItem(0);
  }, [items]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return "↕";
    }
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <>
      <Pagination
        nbEntries={sortedGroupedItems.length}
        pageSize={pageSize}
        currentEntry={firstItem}
        onChange={setFirstItem}
        text={(first, last) => (
          <>
            Items {first} - {last} out of {sortedGroupedItems.length}{" "}
            <span class="sidenote">({items.length} with duplicates)</span>
          </>
        )}
      />
      <table id="collection">
        <thead>
          <tr class="sidenote">
            <th>
              <span class="sr-only">Select</span>
            </th>
            <th>
              <button
                class="sort-button"
                onClick={() => onSort("name")}
                aria-label={`Sort by name ${
                  sortField === "name"
                    ? sortDirection === "asc"
                      ? "descending"
                      : "ascending"
                    : "ascending"
                }`}
              >
                Item {getSortIcon("name")}
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                onClick={() => onSort("characteristics")}
                aria-label={`Sort by characteristics ${
                  sortField === "characteristics"
                    ? sortDirection === "asc"
                      ? "descending"
                      : "ascending"
                    : "ascending"
                }`}
              >
                Characteristics {getSortIcon("characteristics")}
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                onClick={() => onSort("location")}
                aria-label={`Sort by location ${
                  sortField === "location"
                    ? sortDirection === "asc"
                      ? "descending"
                      : "ascending"
                    : "ascending"
                }`}
              >
                Location {getSortIcon("location")}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedGroupedItems
            .slice(firstItem, firstItem + pageSize)
            .map((items, index) => (
              <Item
                key={items[0].id ?? index}
                item={items[0]}
                duplicates={items}
                selectable={selectable}
                withLocation={true}
              />
            ))}
        </tbody>
      </table>
    </>
  );
}
