import { Item } from "../../scripts/items/types/Item";
import "./ItemTooltip.css";
import { getBase } from "../../scripts/items/getBase";
import { fullDurability } from "../../scripts/items/repairItem";
import {
  blockChance,
  formatRange,
  maxQuantity,
  showsDurability,
  statRequirements,
  statTotals,
  weaponDamage,
} from "../../scripts/items/tooltipStats";
import { CHAR_CLASSES } from "../../game-data";
import { colorClass } from "../collection/utils/colorClass";
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

export function ItemTooltip({
  item,
  children,
  useDefaultColor = true,
}: {
  item: Item;
  children?: JSX.Element;
  useDefaultColor?: boolean;
}) {
  const [tooltipId] = useState(() => `item-tooltip-${item.id ?? UNIQUE_ID++}`);
  const [showBelow, setShowBelow] = useState(false);
  const [keyboardFocus, focusHandlers] = useKeyboardFocus();
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const className = useDefaultColor ? colorClass(item) : "";

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

  if (item.simple) {
    return <span class={className}>{item.name}</span>;
  }

  const base = getBase(item);

  const magicMods =
    item.modifiers?.map(
      ({ description, range }) =>
        description && (
          <div class="magic">
            {description}
            <Range range={range} />
          </div>
        )
    ) ?? [];
  if (item.ethereal || item.sockets) {
    const toDisplay = [
      item.ethereal && "Ethereal",
      item.sockets && `Socketed (${item.sockets})`,
    ].filter((m) => !!m);
    magicMods?.push(
      <div class="magic">
        {toDisplay.join(", ")}
        <Range range={item.socketsRange} />
      </div>
    );
  }

  const setItemMods = item.setItemModifiers?.flatMap((mods) =>
    mods.map(
      ({ description, range }) =>
        description && (
          <div class="set">
            {description} <Range range={range} />
          </div>
        )
    )
  );

  const setGlobalMods = item.setGlobalModifiers?.flatMap((mods) =>
    mods.map(
      ({ description }) =>
        description && <div class="unique">{description}</div>
    )
  );
  setGlobalMods?.unshift(<br />);

  let reqline = null;
  if (item.reqlevel && item.reqlevel > 1)
    reqline = <div>Required Level: {item.reqlevel || 1}</div>;

  const total = statTotals(item);
  const block = blockChance(item, total);
  const { strength, dexterity } = statRequirements(item, total);
  const classOnly = CHAR_CLASSES.find(
    ({ code }) => code === item.classRequirement
  )?.classOnly;
  // Like 'JahIthBer'
  const runes =
    item.runeword &&
    item.filledSockets?.map(({ name }) => name?.replace(/ Rune$/, "")).join("");

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
        {runes && <div class="unique">'{runes}'</div>}
        <div>Item Level: {item.level}</div>
        {"def" in base && (
          <div>
            Defense:{" "}
            <span class={item.enhancedDefense ? "magic" : ""}>
              {item.defense}
              <Range range={item.defenseRange} />
            </span>
          </div>
        )}
        {block && (
          <div>
            Chance to Block:{" "}
            <span class={total("toblock") > 0 ? "magic" : ""}>
              {formatRange(block)}%
            </span>
            {block[0] !== block[1] && <span class="sidenote"> (by class)</span>}
          </div>
        )}
        {weaponDamage(item, total).map(({ label, min, max, enhanced }) => (
          <div>
            {label}:{" "}
            <span class={enhanced ? "magic" : ""}>
              {min} to {max}
            </span>
          </div>
        ))}
        {item.quantity !== undefined && (
          <div>
            Quantity: {item.quantity} of {maxQuantity(item, total)}
          </div>
        )}
        {item.durability && showsDurability(item, total) && (
          <div>
            Durability: {item.durability[0]} of {fullDurability(item)}
          </div>
        )}
        {classOnly && <div>{classOnly}</div>}
        {dexterity > 0 && <div>Required Dexterity: {dexterity}</div>}
        {strength > 0 && <div>Required Strength: {strength}</div>}
        {reqline}
        {!item.identified && <div class="danger">Unidentified</div>}
        {magicMods}
        {setItemMods}
        {setGlobalMods}
      </div>
    </span>
  );
}
