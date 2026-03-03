import { Item } from "../../scripts/items/types/Item";
import { ItemQuality } from "../../scripts/items/types/ItemQuality";
import { getBase } from "../../scripts/items/getBase";

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

// Function to get the quality display name for an item
export function getItemQualityName(item: Item): string {
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
export function getItemCategories(item: Item): string[] {
  const base = getBase(item);
  const itemType = base.type;
  const categories: string[] = [];

  // Explicit categories
  if (itemType.startsWith("gem") || itemType === "gemz") {
    categories.push("gem", "socket");
    return categories;
  }
  if (itemType === "jewl") {
    categories.push("jewel", "socket");
    return categories;
  }
  if (itemType === "rune") {
    categories.push("rune", "socket");
    return categories;
  }
  if (itemType === "sock") {
    categories.push("socket");
    return categories;
  }
  // All other types: only their explicit category
  const explicit = getItemCategoryKey(item);
  if (explicit !== "unknown") categories.push(explicit);
  return categories;
}

// Function to get the category key for an item (for filtering)
function getItemCategoryKey(item: Item): string {
  const base = getBase(item);
  const itemType = base.type;

  // Map item types to category keys
  if (itemType.startsWith("gem") || itemType === "gemz") {
    return "gem";
  }
  if (itemType === "jewl") return "jewel";
  if (itemType === "rune") return "rune";
  if (itemType === "sock") return "socket";
  if (itemType === "axe") return "axe";
  if (itemType === "swor" || itemType === "knif") return "sword";
  if (itemType === "mace") return "mace";
  if (itemType === "hamm") return "hammer";
  if (itemType === "club") return "club";
  if (itemType === "spea") return "spear";
  if (itemType === "pole") return "polearm";
  if (itemType === "bow") return "bow";
  if (itemType === "xbow") return "crossbow";
  if (itemType === "scep") return "scepter";
  if (itemType === "wand") return "wand";
  if (itemType === "staf") return "staff";
  if (itemType === "jave") return "javelin";
  if (itemType === "tkni") return "throwing-knife";
  if (itemType === "taxe") return "throwing-axe";
  if (itemType === "orb") return "orb";
  if (itemType === "h2h" || itemType === "h2h2") return "hand-to-hand";
  if (itemType === "abow") return "amazon-bow";
  if (itemType === "aspe") return "amazon-spear";
  if (itemType === "ajav") return "amazon-javelin";
  if (itemType === "head") return "voodoo-head";
  if (itemType === "ashd") return "auric-shield";
  if (itemType === "phlm") return "primal-helm";
  if (itemType === "pelt") return "pelt";
  if (itemType === "cloa") return "cloak";
  if (itemType === "helm" || itemType === "circ") return "helm";
  if (itemType === "tors") return "armor";
  if (itemType === "shie") return "shield";
  if (itemType === "boot") return "boots";
  if (itemType === "glov") return "gloves";
  if (itemType === "belt") return "belt";
  if (itemType === "ring") return "ring";
  if (itemType === "amul") return "amulet";
  if (itemType === "scha" || itemType === "mcha" || itemType === "lcha")
    return "charm";
  if (
    itemType === "poti" ||
    itemType === "hpot" ||
    itemType === "mpot" ||
    itemType === "rpot" ||
    itemType === "spot" ||
    itemType === "apot" ||
    itemType === "wpot"
  )
    return "potion";
  if (itemType === "elix") return "elixir";
  if (itemType === "scro") return "scroll";
  if (itemType === "book") return "book";
  if (itemType === "key") return "key";
  if (itemType === "torc") return "torch";
  if (itemType === "body") return "body-part";
  if (itemType === "ques") return "quest";
  if (itemType === "herb") return "herb";
  if (itemType === "gold") return "gold";
  return "unknown";
}

// Function to get the explicit category name for an item (for display)
export function getItemCategoryName(item: Item): string {
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
