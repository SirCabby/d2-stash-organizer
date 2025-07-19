import { Item as ItemType } from "../../scripts/items/types/Item";
import { useMemo } from "preact/hooks";
import { groupItems } from "../items/groupItems";
import { SortField, SortDirection } from "../collection/Collection";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";
import { getBase } from "../../scripts/items/getBase";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import { isPlugyStash, ownerName } from "../../scripts/save-file/ownership";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import { CATEGORY_NAMES } from "../controls/CategoryFilter";
import { ItemTooltip } from "../items/ItemTooltip";
import { AdditionalInfo } from "../items/AdditionalInfo";

import { QuantityControls } from "./QuantityControls";

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
    categories.push(CATEGORY_NAMES.gem, CATEGORY_NAMES.socket);
    return categories;
  }
  if (itemType === "jewl") {
    categories.push(CATEGORY_NAMES.jewel, CATEGORY_NAMES.socket);
    return categories;
  }
  if (itemType === "rune") {
    categories.push(CATEGORY_NAMES.rune, CATEGORY_NAMES.socket);
    return categories;
  }
  if (itemType === "sock") {
    categories.push(CATEGORY_NAMES.socket);
    return categories;
  }
  // All other types: only their explicit category
  const explicit = getItemCategoryName(item);
  if (explicit !== "Unknown") categories.push(explicit);
  return categories;
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

export interface TransferItemsTableProps {
  items: ItemType[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onRemoveItem?: (item: ItemType) => void;
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

export function TransferItemsTable({
  items,
  sortField,
  sortDirection,
  onSort,
  onRemoveItem,
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
                  {onRemoveItem && (
                    <button
                      class="remove-btn"
                      onClick={() => onRemoveItem(item)}
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
                  <AdditionalInfo item={item} quantity={items.length} />
                </td>
                <td>
                  {isSimpleItem(item) && items.length > 1 ? (
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
                                return `Worn by ${item.mercenary}'s mercenary`;
                              } else if (item.corpse) {
                                return `On ${item.corpse}'s corpse`;
                              } else {
                                return `Worn by ${name}`;
                              }
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
