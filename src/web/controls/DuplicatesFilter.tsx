import { Item } from "../../scripts/items/types/Item";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";

export type DuplicatesFilterValue = "all" | "duplicates";

export interface DuplicatesFilterProps {
  value: string;
  onChange: (value: DuplicatesFilterValue) => void;
}

export function DuplicatesFilter({ value, onChange }: DuplicatesFilterProps) {
  return (
    <div>
      <p>
        <label for="duplicates-select">Filter by duplicates:</label>
      </p>
      <p>
        <select
          id="duplicates-select"
          value={value}
          onChange={({ currentTarget }) =>
            onChange(currentTarget.value as DuplicatesFilterValue)
          }
        >
          <option value="all">All</option>
          <option value="duplicates">Duplicates</option>
        </select>
      </p>
    </div>
  );
}

export function filterItemsByDuplicates(
  items: Item[],
  duplicatesFilter: DuplicatesFilterValue
) {
  if (duplicatesFilter === "all") {
    return items;
  }

  // Create a map to count occurrences of each item by name
  const itemCounts = new Map<string, number>();

  items.forEach((item) => {
    // Only consider unique and set items
    if (
      item.quality !== ItemQuality.UNIQUE &&
      item.quality !== ItemQuality.SET
    ) {
      return;
    }

    // Use item name as the key for duplicate detection
    const key = item.name || "Unknown";
    itemCounts.set(key, (itemCounts.get(key) || 0) + 1);
  });

  // Filter to only include unique and set items that appear more than once
  return items.filter((item) => {
    // Only include unique and set items
    if (
      item.quality !== ItemQuality.UNIQUE &&
      item.quality !== ItemQuality.SET
    ) {
      return false;
    }

    // Use item name as the key
    const key = item.name || "Unknown";
    return itemCounts.get(key)! > 1;
  });
}
