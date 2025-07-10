import { Item } from "../../scripts/items/types/Item";
import { getItemCategories } from "../collection/ItemsTable";

export type CategoryFilterValue =
  | "all"
  // Weapon subcategories
  | "axe"
  | "sword"
  | "mace"
  | "hammer"
  | "club"
  | "knife"
  | "spear"
  | "polearm"
  | "bow"
  | "crossbow"
  | "scepter"
  | "wand"
  | "staff"
  | "javelin"
  | "throwing-knife"
  | "throwing-axe"
  | "orb"
  | "hand-to-hand"
  | "amazon-bow"
  | "amazon-spear"
  | "amazon-javelin"
  | "voodoo-head"
  | "auric-shield"
  | "primal-helm"
  | "pelt"
  | "cloak"
  // Armor subcategories
  | "helm"
  | "armor"
  | "shield"
  | "boots"
  | "gloves"
  | "belt"
  | "circlet"
  // Misc subcategories
  | "ring"
  | "amulet"
  | "charm"
  | "potion"
  | "elixir"
  | "scroll"
  | "book"
  | "key"
  | "torch"
  | "body-part"
  | "quest"
  | "herb"
  | "gold"
  | "jewel"
  | "rune"
  // Major categories (for gems and sockets)
  | "gem"
  | "socket";

export interface CategoryFilterProps {
  value: string;
  onChange: (value: CategoryFilterValue) => void;
}

// Human-readable names for categories
export const CATEGORY_NAMES: Record<CategoryFilterValue, string> = {
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

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div>
      <p>
        <label for="category-select">Filter by category:</label>
      </p>
      <p>
        <select
          id="category-select"
          value={value}
          onChange={({ currentTarget }) =>
            onChange(currentTarget.value as CategoryFilterValue)
          }
        >
          {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </p>
    </div>
  );
}

export function filterItemsByCategory(
  items: Item[],
  category: CategoryFilterValue
) {
  if (category === "all") {
    return items;
  }
  const categoryName = CATEGORY_NAMES[category];
  return items.filter((item) => {
    const categories = getItemCategories(item);
    return categories.includes(categoryName);
  });
}
