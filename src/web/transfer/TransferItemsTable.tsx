import { Item as ItemType } from "../../scripts/items/types/Item";
import { useMemo } from "preact/hooks";
import { groupItems, groupQuantity } from "../items/groupItems";
import { SortField, SortDirection } from "../collection/Collection";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";
import { getBase } from "../../scripts/items/getBase";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import {
  isPlugyStash,
  isD2rStash,
  ownerName,
} from "../../scripts/save-file/ownership";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import {
  getItemCategoryName,
  getItemQualityName,
} from "../collection/itemUtils";
import { ItemTooltip } from "../items/ItemTooltip";
import { AdditionalInfo } from "../items/AdditionalInfo";
import { dedicatedTabName } from "../../scripts/d2r-stash/dedicatedTab";

import { QuantityControls } from "./QuantityControls";

export interface TransferItemsTableProps {
  items: ItemType[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  // Receives exactly the items of the removed row. Matching by code instead
  // would also drop every other selected item of that base type, like all the
  // amulets on the same stash page.
  onRemoveItems?: (items: ItemType[]) => void;
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

export function TransferItemsTable({
  items,
  sortField,
  sortDirection,
  onSort,
  onRemoveItems,
}: TransferItemsTableProps) {
  // Group items first, then sort the groups
  const groupedItems = useMemo(() => groupItems(items), [items]);
  const sortedGroupedItems = useMemo(
    () => sortGroupedItems(groupedItems, sortField, sortDirection),
    [groupedItems, sortField, sortDirection]
  );

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return "↕";
    }
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <div>
      <div class="sidenote">
        Showing {sortedGroupedItems.length} items{" "}
        <span class="sidenote">({items.length} with duplicates)</span>
      </div>
      <table id="collection" class="transfer-table">
        <thead>
          <tr class="sidenote">
            <th>
              <span class="sr-only">Remove</span>
            </th>
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
              <div style="text-align: left; padding: 0; margin: 0;">
                Transfer Quantity
              </div>
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
          {sortedGroupedItems.map((items, index) => {
            const item = items[0];
            return (
              <tr class="item" key={item.id ?? index}>
                <td>
                  {onRemoveItems && (
                    <button
                      class="remove-btn"
                      onClick={() => onRemoveItems(items)}
                      aria-label={`Remove ${item.name} from transfer list`}
                      title="Remove from transfer list"
                    >
                      ×
                    </button>
                  )}
                </td>
                <td>
                  <span class="sr-only">Select</span>
                </td>
                <td aria-label={item.name}>
                  <ItemTooltip item={item} />
                </td>
                <td>{item.level ?? "—"}</td>
                <td>{getItemQualityName(item)}</td>
                <td>{getItemCategoryName(item)}</td>
                <td>{item.classRequirement ? item.classRequirement : "All"}</td>
                <td>
                  <AdditionalInfo item={item} quantity={groupQuantity(items)} />
                </td>
                <td>
                  {isSimpleItem(item) && groupQuantity(items) > 1 ? (
                    <QuantityControls item={item} duplicates={items} />
                  ) : (
                    <span>—</span>
                  )}
                </td>
                <td>
                  <div>
                    {item.owner ? (
                      <span>
                        {(() => {
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
                              if (
                                isD2rStash(item.owner) &&
                                item.stored === ItemStorageType.STASH
                              ) {
                                return `In ${name} ${dedicatedTabName(
                                  item
                                )} tab`;
                              }
                              return "Unknown location";
                            default:
                              return "Unknown location";
                          }
                        })()}
                      </span>
                    ) : (
                      "Unknown location"
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
