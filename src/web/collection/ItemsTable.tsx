import { Item as ItemType } from "../../scripts/items/types/Item";
import { useEffect, useMemo, useState } from "preact/hooks";
import { groupItems } from "../items/groupItems";
import { Pagination } from "../controls/Pagination";
import { SortField, SortDirection } from "./Collection";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";
import { getBase } from "../../scripts/items/getBase";
import { isSimpleItem } from "./utils/isSimpleItem";
import { isPlugyStash, ownerName } from "../../scripts/save-file/ownership";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import { CATEGORY_NAMES } from "../controls/CategoryFilter";
import { Item } from "../items/Item";

// Function to get the quality display name for an item
export function getItemQualityName(item: ItemType): string {
  if (item.runeword) {
    return "Rune word";
  }
  if (item.simple) {
    return "Non-equipment";
  }

  const quality = item.quality ?? 10;

  switch (quality) {
    case ItemQuality.LOW:
      return "Low";
    case ItemQuality.NORMAL:
      return "Non-magical";
    case ItemQuality.SUPERIOR:
      return "Superior";
    case ItemQuality.MAGIC:
      return "Magic";
    case ItemQuality.SET:
      return "Set";
    case ItemQuality.RARE:
      return "Rare";
    case ItemQuality.UNIQUE:
      return "Unique";
    case ItemQuality.CRAFTED:
      return "Crafted";
    default:
      return "Non-magical";
  }
}

// Function to get all possible categories for an item (for filtering)
export function getItemCategories(item: ItemType): string[] {
  const base = getBase(item);
  const itemType = base.type;
  const categories: string[] = [];

  // Explicit categories
  if (itemType.startsWith("gem") || itemType === "gemz") {
    categories.push("gem", "socket");
    return categories;
  }
  if (itemType === "jewl") {
    categories.push("jewel", "socket");
    return categories;
  }
  if (itemType === "rune") {
    categories.push("rune", "socket");
    return categories;
  }
  if (itemType === "sock") {
    categories.push("socket");
    return categories;
  }
  // All other types: only their explicit category
  const explicit = getItemCategoryKey(item);
  if (explicit !== "unknown") categories.push(explicit);
  return categories;
}

// Function to get the category key for an item (for filtering)
function getItemCategoryKey(item: ItemType): string {
  const base = getBase(item);
  const itemType = base.type;

  // Map item types to category keys
  if (itemType.startsWith("gem") || itemType === "gemz") {
    return "gem";
  }
  if (itemType === "jewl") return "jewel";
  if (itemType === "rune") return "rune";
  if (itemType === "sock") return "socket";
  if (itemType === "axe") return "axe";
  if (itemType === "swor" || itemType === "knif") return "sword";
  if (itemType === "mace") return "mace";
  if (itemType === "hamm") return "hammer";
  if (itemType === "club") return "club";
  if (itemType === "spea") return "spear";
  if (itemType === "pole") return "polearm";
  if (itemType === "bow") return "bow";
  if (itemType === "xbow") return "crossbow";
  if (itemType === "scep") return "scepter";
  if (itemType === "wand") return "wand";
  if (itemType === "staf") return "staff";
  if (itemType === "jave") return "javelin";
  if (itemType === "tkni") return "throwing-knife";
  if (itemType === "taxe") return "throwing-axe";
  if (itemType === "orb") return "orb";
  if (itemType === "h2h" || itemType === "h2h2") return "hand-to-hand";
  if (itemType === "abow") return "amazon-bow";
  if (itemType === "aspe") return "amazon-spear";
  if (itemType === "ajav") return "amazon-javelin";
  if (itemType === "head") return "voodoo-head";
  if (itemType === "ashd") return "auric-shield";
  if (itemType === "phlm") return "primal-helm";
  if (itemType === "pelt") return "pelt";
  if (itemType === "cloa") return "cloak";
  if (itemType === "helm" || itemType === "circ") return "helm";
  if (itemType === "tors") return "armor";
  if (itemType === "shie") return "shield";
  if (itemType === "boot") return "boots";
  if (itemType === "glov") return "gloves";
  if (itemType === "belt") return "belt";
  if (itemType === "ring") return "ring";
  if (itemType === "amul") return "amulet";
  if (itemType === "scha" || itemType === "mcha" || itemType === "lcha")
    return "charm";
  if (
    itemType === "poti" ||
    itemType === "hpot" ||
    itemType === "mpot" ||
    itemType === "rpot" ||
    itemType === "spot" ||
    itemType === "apot" ||
    itemType === "wpot"
  )
    return "potion";
  if (itemType === "elix") return "elixir";
  if (itemType === "scro") return "scroll";
  if (itemType === "book") return "book";
  if (itemType === "key") return "key";
  if (itemType === "torc") return "torch";
  if (itemType === "body") return "body-part";
  if (itemType === "ques") return "quest";
  if (itemType === "herb") return "herb";
  if (itemType === "gold") return "gold";
  return "unknown";
}

// Function to get the explicit category name for an item (for display)
export function getItemCategoryName(item: ItemType): string {
  const base = getBase(item);
  const itemType = base.type;

  // Map item types to category names (explicit only)
  if (itemType.startsWith("gem") || itemType === "gemz") {
    return CATEGORY_NAMES.gem;
  }
  if (itemType === "jewl") return CATEGORY_NAMES.jewel;
  if (itemType === "rune") return CATEGORY_NAMES.rune;
  if (itemType === "sock") return CATEGORY_NAMES.socket;
  if (itemType === "axe") return CATEGORY_NAMES.axe;
  if (itemType === "swor" || itemType === "knif") return CATEGORY_NAMES.sword;
  if (itemType === "mace") return CATEGORY_NAMES.mace;
  if (itemType === "hamm") return CATEGORY_NAMES.hammer;
  if (itemType === "club") return CATEGORY_NAMES.club;
  if (itemType === "spea") return CATEGORY_NAMES.spear;
  if (itemType === "pole") return CATEGORY_NAMES.polearm;
  if (itemType === "bow") return CATEGORY_NAMES.bow;
  if (itemType === "xbow") return CATEGORY_NAMES.crossbow;
  if (itemType === "scep") return CATEGORY_NAMES.scepter;
  if (itemType === "wand") return CATEGORY_NAMES.wand;
  if (itemType === "staf") return CATEGORY_NAMES.staff;
  if (itemType === "jave") return CATEGORY_NAMES.javelin;
  if (itemType === "tkni") return CATEGORY_NAMES["throwing-knife"];
  if (itemType === "taxe") return CATEGORY_NAMES["throwing-axe"];
  if (itemType === "orb") return CATEGORY_NAMES.orb;
  if (itemType === "h2h" || itemType === "h2h2")
    return CATEGORY_NAMES["hand-to-hand"];
  if (itemType === "abow") return CATEGORY_NAMES["amazon-bow"];
  if (itemType === "aspe") return CATEGORY_NAMES["amazon-spear"];
  if (itemType === "ajav") return CATEGORY_NAMES["amazon-javelin"];
  if (itemType === "head") return CATEGORY_NAMES["voodoo-head"];
  if (itemType === "ashd") return CATEGORY_NAMES["auric-shield"];
  if (itemType === "phlm") return CATEGORY_NAMES["primal-helm"];
  if (itemType === "pelt") return CATEGORY_NAMES.pelt;
  if (itemType === "cloa") return CATEGORY_NAMES.cloak;
  if (itemType === "helm" || itemType === "circ") return CATEGORY_NAMES.helm;
  if (itemType === "tors") return CATEGORY_NAMES.armor;
  if (itemType === "shie") return CATEGORY_NAMES.shield;
  if (itemType === "boot") return CATEGORY_NAMES.boots;
  if (itemType === "glov") return CATEGORY_NAMES.gloves;
  if (itemType === "belt") return CATEGORY_NAMES.belt;
  if (itemType === "ring") return CATEGORY_NAMES.ring;
  if (itemType === "amul") return CATEGORY_NAMES.amulet;
  if (itemType === "scha" || itemType === "mcha" || itemType === "lcha")
    return CATEGORY_NAMES.charm;
  if (
    itemType === "poti" ||
    itemType === "hpot" ||
    itemType === "mpot" ||
    itemType === "rpot" ||
    itemType === "spot" ||
    itemType === "apot" ||
    itemType === "wpot"
  )
    return CATEGORY_NAMES.potion;
  if (itemType === "elix") return CATEGORY_NAMES.elixir;
  if (itemType === "scro") return CATEGORY_NAMES.scroll;
  if (itemType === "book") return CATEGORY_NAMES.book;
  if (itemType === "key") return CATEGORY_NAMES.key;
  if (itemType === "torc") return CATEGORY_NAMES.torch;
  if (itemType === "body") return CATEGORY_NAMES["body-part"];
  if (itemType === "ques") return CATEGORY_NAMES.quest;
  if (itemType === "herb") return CATEGORY_NAMES.herb;
  if (itemType === "gold") return CATEGORY_NAMES.gold;
  return "Unknown";
}

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
        // Include quantity for simple items
        characteristics.push(`quantity: ${itemGroup.length}`);
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
          {sortedGroupedItems
            .slice(
              firstItem,
              pageSize === -1 ? undefined : firstItem + pageSize
            )
            .map((items, index) => {
              const item = items[0];
              return (
                <Item
                  key={item.id ?? index}
                  item={item}
                  duplicates={items}
                  selectable={selectable}
                  withLocation={true}
                  showClassRequirement={true}
                />
              );
            })}
        </tbody>
      </table>
    </>
  );
}
