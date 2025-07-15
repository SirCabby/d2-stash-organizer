import { Item } from "../../scripts/items/types/Item";
import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import {
  ownerName,
  isCharacter,
  isPlugyStash,
} from "../../scripts/save-file/ownership";

export type LocationFilterValue = string[];

export interface LocationFilterProps {
  value: LocationFilterValue;
  onChange: (value: LocationFilterValue) => void;
  items: Item[];
}

// Generate location options based on available owners in the items
function generateLocationOptions(items: Item[]) {
  // Map from ownerName to { type, ownerName }
  const owners = new Map<string, { type: string; name: string }>();

  for (const item of items) {
    if (item.owner) {
      const name = ownerName(item.owner);
      if (!owners.has(name)) {
        let type = "Characters";
        if (isPlugyStash(item.owner)) {
          type = item.owner.personal ? "Characters" : "Stashes";
        } else if (!isCharacter(item.owner)) {
          type = "Stashes";
        }
        owners.set(name, { type, name });
      }
    }
  }

  // Group by type
  const groups: Record<
    string,
    Array<{ value: string; label: string; group: string }>
  > = {
    Characters: [],
    Stashes: [],
  };

  for (const { type, name } of owners.values()) {
    groups[type].push({ value: name, label: name, group: type });
  }

  return groups;
}

export function LocationFilter({
  value,
  onChange,
  items,
}: LocationFilterProps) {
  const locationGroups = useMemo(() => generateLocationOptions(items), [items]);
  const allOptions = useMemo(
    () => Object.values(locationGroups).flat(),
    [locationGroups]
  );
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

  const handleToggle = (location: string) => {
    const newValue = value.includes(location)
      ? value.filter((v) => v !== location)
      : [...value, location];
    onChange(newValue);
  };

  const selectAll = () => {
    onChange(allOptions.map((option) => option.value));
  };

  const selectNone = () => {
    onChange([]);
  };

  const getSelectedLabels = () => {
    if (value.length === 0) return "None";
    if (value.length === allOptions.length) return "All";
    if (value.length === 1) {
      return allOptions.find((opt) => opt.value === value[0])?.label || "";
    }
    return `${value.length} selected`;
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <p style={{ margin: "0.25em 0" }}>
        <label style={{ fontSize: "0.9em" }}>Filter by location:</label>
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
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {Object.entries(locationGroups).map(([groupName, options]) => (
              <div key={groupName}>
                <div
                  style={{
                    fontWeight: "bold",
                    padding: "0.3em 0.2em",
                    backgroundColor: "#e0e0e0",
                    fontSize: "0.8em",
                    marginTop: "0.5em",
                  }}
                >
                  {groupName}
                </div>
                {options.map((option, index) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function filterItemsByLocation(
  items: Item[],
  locations: LocationFilterValue
) {
  if (locations.length === 0) {
    return items;
  }

  return items.filter((item) => {
    if (!item.owner) {
      return false;
    }

    const ownerKey = ownerName(item.owner);
    return locations.includes(ownerKey);
  });
}
