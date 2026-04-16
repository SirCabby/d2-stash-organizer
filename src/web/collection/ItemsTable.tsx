import { Item as ItemType } from "../../scripts/items/types/Item";
import { useEffect, useMemo, useState } from "preact/hooks";
import { groupItems, groupQuantity } from "../items/groupItems";
import { Pagination } from "../controls/Pagination";
import { SortField, SortDirection } from "./Collection";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";
import { getBase } from "../../scripts/items/getBase";
import { isSimpleItem } from "./utils/isSimpleItem";
import {
  isPlugyStash,
  isD2rStash,
  ownerName,
} from "../../scripts/save-file/ownership";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import { Item } from "../items/Item";
import { dedicatedTabName } from "../../scripts/d2r-stash/dedicatedTab";
import { getItemQualityName, getItemCategoryName } from "./itemUtils";

export interface ItemsTableProps {
  items: ItemType[];
  selectable: boolean;
  pageSize: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function getGroupedItemSortValue(
  itemGroup: ItemType[],
  field: SortField | "class"
): string | number {
  const representativeItem = itemGroup[0];

  switch (field) {
    case "name":
      return representativeItem.name || "";
    case "characteristics": {
      const characteristics = [];
      if (isSimpleItem(representativeItem)) {
        characteristics.push(`quantity: ${groupQuantity(itemGroup)}`);
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
            return `Worn by ${name}'s mercenary`;
          } else if (representativeItem.corpse) {
            return `On ${name}'s corpse`;
          } else {
            return `Worn by ${name}`;
          }
        case ItemLocation.CURSOR:
          if (
            isD2rStash(representativeItem.owner) &&
            representativeItem.stored === ItemStorageType.STASH
          ) {
            return `In ${name} ${dedicatedTabName(representativeItem)} tab`;
          }
          return "Unknown location";
        default:
          return "Unknown location";
      }
    }
    case "level":
      return representativeItem.level ?? 0;
    case "quality":
      return getItemQualityName(representativeItem);
    case "category":
      return getItemCategoryName(representativeItem);
    case "class":
      return representativeItem.classRequirement || "All";
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
  selectable,
  pageSize,
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
        pageSize={pageSize === -1 ? sortedGroupedItems.length : pageSize}
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
                onClick={() => onSort("level")}
                aria-label={`Sort by level ${
                  sortField === "level"
                    ? sortDirection === "asc"
                      ? "descending"
                      : "ascending"
                    : "ascending"
                }`}
              >
                Level {getSortIcon("level")}
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                onClick={() => onSort("quality")}
                aria-label={`Sort by quality ${
                  sortField === "quality"
                    ? sortDirection === "asc"
                      ? "descending"
                      : "ascending"
                    : "ascending"
                }`}
              >
                Quality {getSortIcon("quality")}
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                onClick={() => onSort("category")}
                aria-label={`Sort by category ${
                  sortField === "category"
                    ? sortDirection === "asc"
                      ? "descending"
                      : "ascending"
                    : "ascending"
                }`}
              >
                Category {getSortIcon("category")}
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                onClick={() => onSort("class")}
                aria-label={`Sort by class requirement ${
                  sortField === "class"
                    ? sortDirection === "asc"
                      ? "descending"
                      : "ascending"
                    : "ascending"
                }`}
              >
                Class {getSortIcon("class")}
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
          {(() => {
            const currentPageItems = sortedGroupedItems.slice(
              firstItem,
              pageSize === -1 ? undefined : firstItem + pageSize
            );
            const currentPageFirstItems = currentPageItems.map(
              (items) => items[0]
            );

            return currentPageItems.map((items, index) => {
              const item = items[0];
              return (
                <Item
                  key={item.id ?? index}
                  item={item}
                  duplicates={items}
                  selectable={selectable}
                  withLocation={true}
                  showClassRequirement={true}
                  allItems={currentPageFirstItems}
                />
              );
            });
          })()}
        </tbody>
      </table>
    </>
  );
}
