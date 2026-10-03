import { Item as ItemType } from "../../scripts/items/types/Item";
import { useEffect, useMemo, useState } from "preact/hooks";
import { groupItems, groupQuantity } from "../items/groupItems";
import { Pagination } from "../controls/Pagination";
import { SortField, SortDirection, ColumnWidths } from "./Collection";
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
import {
  getItemQualityName,
  getItemCategoryName,
  getRequiredLevel,
} from "./itemUtils";
import { ColumnResizer } from "./ColumnResizer";

export interface ItemsTableProps {
  items: ItemType[];
  selectable: boolean;
  pageSize: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  columnWidths: ColumnWidths;
  onColumnWidthsChange: (widths: ColumnWidths) => void;
}

interface Column {
  field: SortField;
  label: string;
  // What its sort button tells screen readers it sorts by
  sortName: string;
  // In pixels. The last column has none: it takes the rest of the table.
  width?: number;
}

const COLUMNS: Column[] = [
  { field: "name", label: "Item", sortName: "name", width: 380 },
  { field: "level", label: "Level", sortName: "level", width: 80 },
  {
    field: "requiredLevel",
    label: "Level to equip",
    sortName: "level to equip",
    width: 140,
  },
  { field: "quality", label: "Quality", sortName: "quality", width: 160 },
  { field: "category", label: "Category", sortName: "category", width: 190 },
  { field: "class", label: "Class", sortName: "class requirement", width: 80 },
  {
    field: "characteristics",
    label: "Characteristics",
    sortName: "characteristics",
    width: 280,
  },
  { field: "location", label: "Location", sortName: "location" },
];

// How narrow and how wide the columns can be resized, in pixels
const MIN_COLUMN_WIDTH = 50;
const MAX_COLUMN_WIDTH = 1000;
// The checkbox column's width, and the least the last column keeps
const SELECT_COLUMN_WIDTH = 30;
const MIN_LAST_COLUMN_WIDTH = 210;

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
    case "requiredLevel":
      return getRequiredLevel(representativeItem);
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
  columnWidths,
  onColumnWidthsChange,
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

  const widthOf = ({ field, width }: Column) => columnWidths[field] ?? width;

  const resizeColumn = (field: SortField, width?: number) => {
    const widths = { ...columnWidths };
    if (width === undefined) {
      delete widths[field];
    } else {
      widths[field] = width;
    }
    onColumnWidthsChange(widths);
  };

  // The table fills the page, unless its columns need more room
  const minTableWidth = COLUMNS.reduce(
    (total, column) => total + (widthOf(column) ?? MIN_LAST_COLUMN_WIDTH),
    SELECT_COLUMN_WIDTH
  );

  // The same elements as long as the items don't change, so that resizing a
  // column doesn't render all the rows again
  const rows = useMemo(() => {
    const currentPageItems = sortedGroupedItems.slice(
      firstItem,
      pageSize === -1 ? undefined : firstItem + pageSize
    );
    const currentPageFirstItems = currentPageItems.map((items) => items[0]);

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
          showRequiredLevel={true}
          allItems={currentPageFirstItems}
        />
      );
    });
  }, [sortedGroupedItems, firstItem, pageSize, selectable]);

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
      <table
        id="collection"
        class="resizable"
        style={{ minWidth: `${minTableWidth}px` }}
      >
        <thead>
          <tr class="sidenote">
            <th>
              <span class="sr-only">Select</span>
            </th>
            {COLUMNS.map((column) => {
              const width = widthOf(column);
              return (
                <th
                  key={column.field}
                  style={
                    width === undefined ? undefined : { width: `${width}px` }
                  }
                >
                  <button
                    class="sort-button"
                    onClick={() => onSort(column.field)}
                    aria-label={`Sort by ${column.sortName} ${
                      sortField === column.field && sortDirection === "asc"
                        ? "descending"
                        : "ascending"
                    }`}
                  >
                    <span class="sort-label">{column.label}</span>
                    {getSortIcon(column.field)}
                  </button>
                  {width !== undefined && (
                    <ColumnResizer
                      label={column.label}
                      width={width}
                      minWidth={MIN_COLUMN_WIDTH}
                      maxWidth={MAX_COLUMN_WIDTH}
                      onResize={(newWidth) =>
                        resizeColumn(column.field, newWidth)
                      }
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </>
  );
}
