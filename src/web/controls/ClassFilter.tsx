import { Item } from "../../scripts/items/types/Item";

export type ClassFilterValue = "all" | "ama" | "bar" | "nec" | "pal" | "sor" | "dru" | "ass";

export interface ClassFilterProps {
  value: ClassFilterValue;
  onChange: (value: ClassFilterValue) => void;
}

export const CLASS_NAMES: Record<ClassFilterValue, string> = {
  all: "All Classes",
  ama: "Amazon",
  bar: "Barbarian",
  nec: "Necromancer",
  pal: "Paladin",
  sor: "Sorceress",
  dru: "Druid",
  ass: "Assassin",
};

export function ClassFilter({ value, onChange }: ClassFilterProps) {
  return (
    <div>
      <p>
        <label htmlFor="class-select">Filter by class:</label>
      </p>
      <p>
        <select
          id="class-select"
          value={value}
          onChange={({ currentTarget }) =>
            onChange(currentTarget.value as ClassFilterValue)
          }
        >
          {Object.entries(CLASS_NAMES)
            .sort(([, a], [, b]) => a.localeCompare(b))
            .map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
        </select>
      </p>
    </div>
  );
}

export function filterItemsByClass(items: Item[], classValue: ClassFilterValue) {
  if (classValue === "all") return items;
  return items.filter((item) => item.classRequirement === classValue);
} 