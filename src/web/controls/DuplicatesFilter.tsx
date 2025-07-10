import { Item } from "../../scripts/items/types/Item";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";

export type DuplicatesFilterValue = boolean;

export interface DuplicatesFilterProps {
  value: boolean;
  onChange: (value: DuplicatesFilterValue) => void;
}

export function DuplicatesFilter({ value, onChange }: DuplicatesFilterProps) {
  return (
    <div>
      <p>
        <label htmlFor="duplicates-checkbox">Show only duplicates:</label>
      </p>
      <p>
        <input
          id="duplicates-checkbox"
          type="checkbox"
          checked={value}
          onChange={({ currentTarget }) => onChange(currentTarget.checked)}
        />
      </p>
    </div>
  );
}

export function filterItemsByDuplicates(
  items: Item[],
  duplicatesFilter: DuplicatesFilterValue
) {
  if (!duplicatesFilter) {
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
