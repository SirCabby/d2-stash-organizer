import { Item } from "../../scripts/items/types/Item";
import { getItemCategories } from "../collection/ItemsTable";
import { useState, useEffect, useRef } from "preact/hooks";

export type CategoryFilterValue = string[];

export interface CategoryFilterProps {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
}

// Human-readable names for categories
export const CATEGORY_NAMES: Record<string, string> = {
  all: "All Categories",
  // Weapons
  axe: "Axes",
  sword: "Swords",
  mace: "Maces",
  hammer: "Hammers",
  club: "Clubs",
  knife: "Knives",
  spear: "Spears",
  polearm: "Polearms",
  bow: "Bows",
  crossbow: "Crossbows",
  scepter: "Scepters",
  wand: "Wands",
  staff: "Staves",
  javelin: "Javelins",
  "throwing-knife": "Throwing Knives",
  "throwing-axe": "Throwing Axes",
  orb: "Orbs",
  "hand-to-hand": "Hand to Hand",
  "amazon-bow": "Amazon Bows",
  "amazon-spear": "Amazon Spears",
  "amazon-javelin": "Amazon Javelins",
  "voodoo-head": "Voodoo Heads",
  "auric-shield": "Auric Shields",
  "primal-helm": "Primal Helms",
  pelt: "Pelts",
  cloak: "Cloaks",
  // Armor
  helm: "Helms",
  armor: "Body Armor",
  shield: "Shields",
  boots: "Boots",
  gloves: "Gloves",
  belt: "Belts",
  circlet: "Circlets",
  // Misc
  ring: "Rings",
  amulet: "Amulets",
  charm: "Charms",
  potion: "Potions",
  elixir: "Elixirs",
  scroll: "Scrolls",
  book: "Books",
  key: "Keys",
  torch: "Torches",
  "body-part": "Body Parts",
  quest: "Quest Items",
  herb: "Herbs",
  gold: "Gold",
  jewel: "Jewels",
  rune: "Runes",
  // Major categories
  gem: "Gems",
  socket: "Socket Fillers",
};

// Category groupings for optgroups
const CATEGORY_GROUPS = {
  Weapons: [
    "amazon-bow",
    "amazon-javelin",
    "amazon-spear",
    "auric-shield",
    "axe",
    "bow",
    "club",
    "crossbow",
    "hand-to-hand",
    "hammer",
    "javelin",
    "knife",
    "mace",
    "orb",
    "pelt",
    "polearm",
    "primal-helm",
    "scepter",
    "spear",
    "staff",
    "sword",
    "throwing-axe",
    "throwing-knife",
    "voodoo-head",
    "wand",
  ],
  Armor: ["armor", "belt", "boots", "circlet", "gloves", "helm", "shield"],
  Jewelry: ["amulet", "ring"],
  Miscellaneous: [
    "book",
    "body-part",
    "charm",
    "elixir",
    "gem",
    "gold",
    "herb",
    "jewel",
    "key",
    "potion",
    "quest",
    "rune",
    "scroll",
    "socket",
    "torch",
  ],
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_GROUPS).flatMap(
  ([groupName, categories]) =>
    categories.map((category) => ({
      value: category,
      label: CATEGORY_NAMES[category],
      group: groupName,
    }))
);

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
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

  const handleToggle = (category: string) => {
    const newValue = value.includes(category)
      ? value.filter((v) => v !== category)
      : [...value, category];
    onChange(newValue);
  };

  const selectAll = () => {
    onChange(CATEGORY_OPTIONS.map((option) => option.value));
  };

  const selectNone = () => {
    onChange([]);
  };

  const getSelectedLabels = () => {
    if (value.length === 0) return "None";
    if (value.length === CATEGORY_OPTIONS.length) return "All";
    if (value.length === 1) {
      return (
        CATEGORY_OPTIONS.find((opt) => opt.value === value[0])?.label || ""
      );
    }
    return `${value.length} selected`;
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <p style={{ margin: "0.25em 0" }}>
        <label style={{ fontSize: "0.9em" }}>Filter by category:</label>
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
            {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
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
                {categories.map((category, index) => (
                  <div
                    key={category}
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
                      checked={value.includes(category)}
                      onChange={() => handleToggle(category)}
                      style={{
                        marginRight: "0.5em",
                        margin: "0 0.5em 0 0",
                      }}
                    />
                    <span>{CATEGORY_NAMES[category]}</span>
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

export function filterItemsByCategory(
  items: Item[],
  categories: CategoryFilterValue
) {
  if (categories.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const itemCategories = getItemCategories(item);
    return categories.some((category) => itemCategories.includes(category));
  });
}
