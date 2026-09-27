import { Modifier } from "../types/Modifier";
import {
  CHAR_CLASSES,
  ITEM_STATS,
  MOD_LOCA,
  MONSTERS,
  SKILL_TABS,
  SKILLS,
  StatDescription,
} from "../../../game-data";

const FORMAT_SPECIFIER = /%(%|\d|\+?[diu]|s)/g;
const VALUE_SPECIFIER = /%(\d|\+?[diu])/;

// How each descfunc shows the value, for strings that don't include it
const VALUE_FORMATS: Record<number, string> = {
  1: "%+d",
  2: "%d%%",
  3: "%d",
  4: "%+d%%",
  5: "%d%%",
  6: "%+d",
  7: "%d%%",
  8: "%+d%%",
  9: "%d",
  10: "%d%%",
  12: "%+d",
  20: "%d%%",
  21: "%d",
};

// Strings for the time of day a by-time mod peaks at: day, dusk, night, dawn
const PEAK_TIMES = ["ModStre9e", "ModStre9g", "ModStre9d", "ModStre9f"];

/**
 * Fills a game string in like the game's sprintf: `%d` and `%+d` take a number,
 * `%s` takes text, `%0`, `%1`... take the argument at that position,
 * and `%%` is a percent sign.
 */
function formatGameString(template: string, ...args: (number | string)[]) {
  let nextArg = 0;
  return template.replace(FORMAT_SPECIFIER, (_, specifier: string) => {
    if (specifier === "%") {
      return "%";
    }
    const arg = /\d/.test(specifier)
      ? args[Number(specifier)]
      : args[nextArg++];
    return specifier.startsWith("+") && typeof arg === "number" && arg >= 0
      ? `+${arg}`
      : `${arg}`;
  });
}

function localize(key: string) {
  return MOD_LOCA[key]?.enUS ?? key;
}

function skillName(id?: number) {
  return SKILLS[id!]?.name ?? `skill ${id}`;
}

/**
 * Describes the mods that are a single number, shown as is or as a percentage
 */
function describeValue(
  { descFunc, descVal }: StatDescription,
  template: string,
  value: number
) {
  switch (descFunc) {
    case 5:
    case 10:
      value = Math.floor((value * 100) / 128);
      break;
    case 20:
    case 21:
      value = -value;
      break;
    case 29:
      // The negative string already says the damage is increased
      value = Math.abs(value);
      break;
  }
  if (VALUE_SPECIFIER.test(template)) {
    return formatGameString(template, value);
  }
  // Strings without the value rely on descval to place it.
  // Blinding and freezing only show it when it's more than 1.
  if (!descVal || (descFunc === 12 && value <= 1)) {
    return template;
  }
  const valueDesc = formatGameString(VALUE_FORMATS[descFunc] ?? "%d", value);
  return descVal === 1
    ? `${valueDesc} ${template}`
    : `${template} ${valueDesc}`;
}

/**
 * Generates the human-friendly description for an item modifier
 */
export function describeSingleMod(
  modifier: Modifier,
  modInfo: StatDescription | null = ITEM_STATS[modifier.id]
) {
  if (!modInfo?.descFunc) return;

  let modValue = modifier.value ?? 0;
  if (modInfo.stat.endsWith("perlevel")) {
    // Per-level mod, we show it for character level 99 for the flair
    if (modInfo.stat.includes("tohit")) {
      modValue = modValue / 2;
    } else {
      modValue = modValue / 8;
    }
    modValue = Math.floor(99 * modValue);
  }

  const modDesc = localize(modValue < 0 ? modInfo.descNeg : modInfo.descPos);

  let description: string;
  switch (modInfo.descFunc) {
    case 11:
      // The value is the durability repaired every 100 seconds
      description =
        modValue >= 100
          ? formatGameString(modDesc, Math.floor(modValue / 100))
          : formatGameString(
              localize("ModStre9u"),
              1,
              Math.floor(100 / modValue)
            );
      break;
    case 13:
      description = formatGameString(
        CHAR_CLASSES[modifier.param!]?.skillsMod ??
          `%+d to class ${modifier.param} skills`,
        modValue
      );
      break;
    case 14: {
      const skillTab = SKILL_TABS.find(({ id }) => id === modifier.param);
      description = skillTab
        ? `${formatGameString(skillTab.skillsMod, modValue)} ${
            CHAR_CLASSES[skillTab.charClass]?.classOnly ?? ""
          }`.trim()
        : formatGameString(`%+d to skill tab ${modifier.param}`, modValue);
      break;
    }
    case 15:
      description = formatGameString(
        modDesc,
        modifier.chance!,
        modifier.level!,
        skillName(modifier.spell)
      );
      break;
    case 16:
      description = formatGameString(
        modDesc,
        modValue,
        skillName(modifier.param)
      );
      break;
    case 17:
    case 18: {
      // The value changes with the time of day, we show it at its peak
      const peakValue = ((modValue >> 12) & 0x3ff) - 0x100;
      description = formatGameString(
        localize(PEAK_TIMES[modValue & 3]),
        describeValue(modInfo, modDesc, peakValue)
      );
      break;
    }
    case 22:
      // We need to do the monster type, but I can't find a single item with this.
      description = `${formatGameString(modDesc, modValue)} monster type ${
        modifier.param
      }`;
      break;
    case 23:
      description = formatGameString(
        modDesc,
        modValue,
        MONSTERS[modifier.param!] ?? `monster ${modifier.param}`
      );
      break;
    case 24:
      description = formatGameString(
        modDesc,
        modifier.level!,
        skillName(modifier.spell),
        modifier.charges!,
        modifier.maxCharges!
      );
      break;
    case 27: {
      const skill = SKILLS[modifier.param!];
      description = formatGameString(
        modDesc,
        modValue,
        skillName(modifier.param),
        CHAR_CLASSES[skill?.charClass ?? -1]?.classOnly ?? ""
      ).trim();
      break;
    }
    case 28:
      description = formatGameString(
        modDesc,
        modValue,
        skillName(modifier.param)
      );
      break;
    // Custom describe functions to handle groups
    case 100: {
      // Non-poison elemental or magic damage.
      // descPos describes a single value, descNeg a range.
      const [min, max] = modifier.values!;
      description =
        min === max
          ? formatGameString(modInfo.descPos, min)
          : formatGameString(modInfo.descNeg, min, max);
      break;
    }
    case 101: {
      // Poison damage
      const [min, max, length] = modifier.values!;
      const seconds = Math.round(length / 25);
      description =
        min === max
          ? formatGameString(
              modInfo.descPos,
              Math.round((min * length) / 256),
              seconds
            )
          : formatGameString(
              modInfo.descNeg,
              Math.round((min * length) / 256),
              Math.round((max * length) / 256),
              seconds
            );
      break;
    }
    default:
      description = describeValue(modInfo, modDesc, modValue);
  }

  if (modInfo.descAdditional) {
    description += ` ${modInfo.descAdditional}`;
  }
  return description;
}
