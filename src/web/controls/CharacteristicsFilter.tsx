import { Item } from "../../scripts/items/types/Item";
import { useState, useEffect, useRef } from "preact/hooks";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";

export type CharacteristicsFilterValue = string[];

export interface CharacteristicsFilterProps {
  value: CharacteristicsFilterValue;
  onChange: (value: CharacteristicsFilterValue) => void;
}

// Define the possible characteristics values
const CHARACTERISTICS_OPTIONS = [
  { value: "ethereal", label: "Ethereal" },
  { value: "sockets", label: "Sockets" },
  { value: "quantity", label: "Quantity" },
  { value: "perfect", label: "Perfect" },
  { value: "runeword_base", label: "Runeword Base Items" },
];

export function CharacteristicsFilter({
  value,
  onChange,
}: CharacteristicsFilterProps) {
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

  const handleToggle = (characteristicValue: string) => {
    const newValue = value.includes(characteristicValue)
      ? value.filter((v) => v !== characteristicValue)
      : [...value, characteristicValue];
    onChange(newValue);
  };

  const selectAll = () => {
    onChange(CHARACTERISTICS_OPTIONS.map((option) => option.value));
  };

  const selectNone = () => {
    onChange([]);
  };

  const getSelectedLabels = () => {
    if (value.length === 0) return "None";
    if (value.length === CHARACTERISTICS_OPTIONS.length) return "All";
    if (value.length === 1) {
      return (
        CHARACTERISTICS_OPTIONS.find((opt) => opt.value === value[0])?.label ||
        ""
      );
    }
    return `${value.length} selected`;
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <p style={{ margin: "0.25em 0" }}>
        <label style={{ fontSize: "0.9em" }}>Filter by characteristics:</label>
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
            {CHARACTERISTICS_OPTIONS.map((option, index) => (
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

export function filterItemsByCharacteristics(
  items: Item[],
  characteristics: CharacteristicsFilterValue
) {
  if (characteristics.length === 0) return items;

  return items.filter((item) => {
    // Check if item has any of the selected characteristics
    return characteristics.some((characteristic) => {
      switch (characteristic) {
        case "ethereal":
          return item.ethereal;
        case "sockets":
          return (
            !!item.sockets &&
            (item.quality ?? 10) <= ItemQuality.SUPERIOR &&
            !item.runeword
          );
        case "quantity":
          return isSimpleItem(item);
        case "perfect":
          return (
            (item.runeword ||
              item.quality === ItemQuality.UNIQUE ||
              item.quality === ItemQuality.SET) &&
            item.perfectionScore === 100
          );
        case "runeword_base":
          return item.runeword;
        default:
          return false;
      }
    });
  });
}
