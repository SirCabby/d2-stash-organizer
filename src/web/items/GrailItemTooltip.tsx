import {
  UniqueItem,
  SetItem,
  ModifierRange,
  PROPERTIES,
  CHAR_CLASSES,
} from "../../game-data";
import "./ItemTooltip.css";
import { getBase } from "../../scripts/items/getBase";
import {
  blockChance,
  formatRange,
  StatTotal,
  statRequirements,
  weaponDamage,
} from "../../scripts/items/tooltipStats";
import { useState, useRef, useEffect } from "preact/hooks";
import { JSX } from "preact";
import { useKeyboardFocus } from "./useKeyboardFocus";

let UNIQUE_ID = 0;

function Range({ range }: { range?: [number, number] }) {
  if (!range) {
    return null;
  }
  return <span class="sidenote"> [{range.join(" - ")}]</span>;
}

// The game adds flat damage to each way the weapon deals damage
const FLAT_DAMAGE: Record<string, string | undefined> = {
  secondary_mindamage: "mindamage",
  item_throw_mindamage: "mindamage",
  secondary_maxdamage: "maxdamage",
  item_throw_maxdamage: "maxdamage",
};

// The item's stats when all its mods roll their lowest, or highest
function rolledStats(
  modifiers: ModifierRange[],
  roll: "min" | "max"
): StatTotal {
  return (stat) => {
    const target = FLAT_DAMAGE[stat] ?? stat;
    let total = 0;
    for (const { prop, min = 0, max = 0 } of modifiers) {
      for (const { stat: modStat, type } of PROPERTIES[prop]?.stats ?? []) {
        if (modStat !== target) {
          continue;
        }
        // Like "Adds 30-100 damage", which doesn't roll
        if (type === "min" || type === "max") {
          total += type === "min" ? min : max;
        } else if (type === "other" || type === "all") {
          total += roll === "min" ? Math.min(min, max) : Math.max(min, max);
        }
      }
    }
    return total;
  };
}

function rolledRange(low: number, high: number) {
  return formatRange([Math.min(low, high), Math.max(low, high)]);
}

export function GrailItemTooltip({
  item,
  isEthereal = false,
  isPerfect = false,
  children,
  useDefaultColor = true,
}: {
  item: UniqueItem | SetItem;
  isEthereal?: boolean;
  isPerfect?: boolean;
  children?: JSX.Element;
  useDefaultColor?: boolean;
}) {
  const [tooltipId] = useState(
    () => `grail-tooltip-${item.name}-${UNIQUE_ID++}`
  );
  const [showBelow, setShowBelow] = useState(false);
  const [keyboardFocus, focusHandlers] = useKeyboardFocus();
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const tooltip = tooltipRef.current;

    if (!container || !tooltip) return;

    const updatePosition = () => {
      // Create a temporary clone to measure dimensions without affecting the real tooltip
      const clone = tooltip.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.visibility = "hidden";
      clone.style.display = "block";
      clone.style.height = "auto";
      clone.style.width = "auto";
      clone.style.bottom = "calc(100% + 0.4em)";
      clone.style.top = "auto";
      clone.style.left = "0";
      clone.style.border = "2px solid white";
      clone.style.padding = "0.4em 0.8em";
      clone.style.background = "rgba(0, 0, 0, 0.9)";
      clone.style.zIndex = "-1000";

      // Add clone to DOM temporarily
      document.body.appendChild(clone);

      const containerRect = container.getBoundingClientRect();
      const cloneRect = clone.getBoundingClientRect();

      // Check if tooltip would go above the viewport
      const wouldGoAbove = containerRect.top - cloneRect.height - 10 < 0;

      setShowBelow(wouldGoAbove);

      // Remove clone from DOM
      document.body.removeChild(clone);
    };

    // Update position on hover
    container.addEventListener("mouseenter", updatePosition);

    return () => {
      container.removeEventListener("mouseenter", updatePosition);
    };
  }, []);

  const base = getBase(item);
  const isSetItem = "set" in item;
  const className = useDefaultColor ? (isSetItem ? "set" : "unique") : "";

  // Helper function to get color class for grail items (matching ItemTooltip logic)
  const getColorClass = () => {
    if (isSetItem) {
      return "set";
    }
    return "unique";
  };

  // Get modifiers based on item type
  const modifiers = isSetItem
    ? [...item.baseModifiers, ...item.setModifiers.flat()]
    : item.modifiers;

  const modifierElements = modifiers.map(({ prop, min, max }) => {
    // Convert property codes to readable descriptions
    let description = prop;
    if (prop === "def") description = "Defense";
    else if (prop === "dmg") description = "Damage";
    else if (prop === "sock") description = "Sockets";
    else if (prop === "indestruct") description = "Indestructible";
    else if (prop === "ethereal") description = "Ethereal";

    return (
      <div class={getColorClass()}>
        {description}
        <Range
          range={
            min !== undefined && max !== undefined ? [min, max] : undefined
          }
        />
      </div>
    );
  });

  let reqline = null;
  const reqLevel = "reqlevel" in item ? item.reqlevel : item.levelReq;
  if (reqLevel && reqLevel > 1) {
    reqline = <div>Required Level: {reqLevel}</div>;
  }

  // From the item's own mods, not its set bonuses
  const ownModifiers = isSetItem ? item.baseModifiers : item.modifiers;
  const rolls = [
    rolledStats(ownModifiers, "min"),
    rolledStats(ownModifiers, "max"),
  ];
  const summary = { code: item.code, ethereal: isEthereal };
  const [lowDamage, highDamage] = rolls.map((total) =>
    weaponDamage(summary, total)
  );
  const [lowBlock, highBlock] = rolls.map((total) =>
    blockChance(summary, total)
  );
  const [lowReq, highReq] = rolls.map((total) =>
    statRequirements(summary, total)
  );
  const classOnly = CHAR_CLASSES.find(
    ({ code }) => code === base.classRequirement
  )?.classOnly;

  return (
    <span
      class={`tooltip-container ${keyboardFocus ? "keyboard-focus" : ""}`}
      ref={containerRef}
    >
      <span
        class={`tooltip-trigger ${className}`}
        tabIndex={0}
        aria-describedby={tooltipId}
        {...focusHandlers}
      >
        {children || item.name}
      </span>
      <div
        id={tooltipId}
        class={`tooltip-content ${showBelow ? "tooltip-below" : ""}`}
        role="tooltip"
        ref={tooltipRef}
      >
        <div class={className}>{item.name}</div>
        <div class={className}>{base?.name}</div>
        <div>Item Level: {item.qlevel}</div>
        {"def" in base &&
          Array.isArray(base.def) &&
          (base.def as number[]).length >= 2 && (
            <div>
              Defense:{" "}
              <span class="magic">
                {isEthereal
                  ? `${Math.floor(
                      (base.def as [number, number])[0] * 1.5
                    )}-${Math.floor((base.def as [number, number])[1] * 1.5)}`
                  : `${(base.def as [number, number])[0]}-${
                      (base.def as [number, number])[1]
                    }`}
              </span>
            </div>
          )}
        {lowBlock && highBlock && (
          <div>
            Chance to Block: {formatRange([lowBlock[0], highBlock[1]])}%
          </div>
        )}
        {lowDamage.map(({ label, min, max }, i) => (
          <div>
            {label}:{" "}
            <span class={highDamage[i].enhanced ? "magic" : ""}>
              {rolledRange(min, highDamage[i].min)} to{" "}
              {rolledRange(max, highDamage[i].max)}
            </span>
          </div>
        ))}
        {classOnly && <div>{classOnly}</div>}
        {(lowReq.dexterity > 0 || highReq.dexterity > 0) && (
          <div>
            Required Dexterity:{" "}
            {rolledRange(lowReq.dexterity, highReq.dexterity)}
          </div>
        )}
        {(lowReq.strength > 0 || highReq.strength > 0) && (
          <div>
            Required Strength: {rolledRange(lowReq.strength, highReq.strength)}
          </div>
        )}
        {reqline}
        {isEthereal && <div class="magic">Ethereal</div>}
        {isPerfect && <div class="magic">Perfect</div>}
        {modifierElements}
      </div>
    </span>
  );
}
