import { Item } from "../../scripts/items/types/Item";
import { useState, useEffect, useRef } from "preact/hooks";

export type ClassFilterValue = string[];

export interface ClassFilterProps {
  value: ClassFilterValue;
  onChange: (value: ClassFilterValue) => void;
}

export const CLASS_NAMES: Record<string, string> = {
  all: "All Classes",
  ama: "Amazon",
  bar: "Barbarian",
  nec: "Necromancer",
  pal: "Paladin",
  sor: "Sorceress",
  dru: "Druid",
  ass: "Assassin",
};

const CLASS_OPTIONS = [
  { value: "all", label: "All Classes" },
  { value: "ama", label: "Amazon" },
  { value: "bar", label: "Barbarian" },
  { value: "nec", label: "Necromancer" },
  { value: "pal", label: "Paladin" },
  { value: "sor", label: "Sorceress" },
  { value: "dru", label: "Druid" },
  { value: "ass", label: "Assassin" },
];

export function ClassFilter({ value, onChange }: ClassFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (classValue: string) => {
    const newValue = value.includes(classValue)
      ? value.filter((v) => v !== classValue)
      : [...value, classValue];
    onChange(newValue);
  };

  const selectAll = () => {
    onChange(CLASS_OPTIONS.map((option) => option.value));
  };

  const selectNone = () => {
    onChange([]);
  };

  const getSelectedLabels = () => {
    if (value.length === 0) return "None";
    if (value.length === CLASS_OPTIONS.length) return "All";
    if (value.length === 1) {
      return CLASS_OPTIONS.find((opt) => opt.value === value[0])?.label || "";
    }
    return `${value.length} selected`;
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <p style={{ margin: "0.25em 0" }}>
        <label style={{ fontSize: "0.9em" }}>Filter by class:</label>
      </p>
      <p style={{ margin: "0.25em 0" }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "100%",
            maxWidth: "150px",
            textAlign: "left",
            padding: "0.25em 0.5em",
            fontSize: "0.9em",
            border: "1px solid #ccc",
            borderRadius: "3px",
            backgroundColor: "#f8f8f8",
            cursor: "pointer",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getSelectedLabels()}
        </button>
      </p>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            backgroundColor: "#f8f8f8",
            border: "1px solid #ccc",
            borderRadius: "3px",
            padding: "0.5em",
            zIndex: 1000,
            minWidth: "200px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            fontSize: "0.85em",
            color: "#000",
          }}
        >
          <div style={{ marginBottom: "0.5em" }}>
            <button
              type="button"
              onClick={selectAll}
              style={{
                marginRight: "0.25em",
                padding: "0.2em 0.4em",
                fontSize: "0.8em",
                border: "1px solid #ccc",
                borderRadius: "2px",
                backgroundColor: "#fff",
                cursor: "pointer",
                color: "#000",
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={selectNone}
              style={{
                padding: "0.2em 0.4em",
                fontSize: "0.8em",
                border: "1px solid #ccc",
                borderRadius: "2px",
                backgroundColor: "#fff",
                cursor: "pointer",
                color: "#000",
              }}
            >
              None
            </button>
          </div>

          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {CLASS_OPTIONS.map((option, index) => (
              <div
                key={option.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0.2em 0.3em",
                  marginBottom: "0",
                  backgroundColor: index % 2 === 0 ? "#f0f0f0" : "#f8f8f8",
                  fontSize: "0.85em",
                  color: "#000",
                }}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                  style={{
                    marginRight: "0.5em",
                    margin: "0 0.5em 0 0",
                  }}
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function filterItemsByClass(
  items: Item[],
  classValues: ClassFilterValue
) {
  if (classValues.length === 0) return items;
  return items.filter((item) => {
    const itemClass = item.classRequirement || "";

    // If "all" is selected, include items with no class requirement
    if (classValues.includes("all") && itemClass === "") {
      return true;
    }

    // Include items that match any of the selected classes
    return classValues.includes(itemClass);
  });
}
