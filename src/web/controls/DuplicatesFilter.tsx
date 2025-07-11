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
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={value}
          onChange={({ currentTarget }) => onChange(currentTarget.checked)}
        />
        Duplicates
      </label>
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

  // Create a map to count occurrences of each item by name and ethereal status
  const itemCounts = new Map<string, number>();

  items.forEach((item) => {
    // Only consider unique and set items
    if (
      item.quality !== ItemQuality.UNIQUE &&
      item.quality !== ItemQuality.SET
    ) {
      return;
    }

    // Use item name + ethereal status as the key for duplicate detection
    const etherealSuffix = item.ethereal ? "_ethereal" : "_normal";
    const key = (item.name || "Unknown") + etherealSuffix;
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

    // Use item name + ethereal status as the key
    const etherealSuffix = item.ethereal ? "_ethereal" : "_normal";
    const key = (item.name || "Unknown") + etherealSuffix;
    return itemCounts.get(key)! > 1;
  });
}
