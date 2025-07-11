import { UniqueItem, SetItem } from "../../game-data";
import "./ItemTooltip.css";
import { getBase } from "../../scripts/items/getBase";
import { useState, useRef, useEffect } from "preact/hooks";
import { JSX } from "preact";

let UNIQUE_ID = 0;

function Range({ range }: { range?: [number, number] }) {
  if (!range) {
    return null;
  }
  return <span class="sidenote"> [{range.join(" - ")}]</span>;
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
    reqline = <div>Level Required: {reqLevel}</div>;
  }

  // Calculate ethereal strength requirement reduction
  let strengthReq = null;
  if (base.levelReq > 0) {
    const strengthRequirement = base.levelReq;
    const etherealStrengthReq = isEthereal
      ? Math.max(0, strengthRequirement - 10)
      : strengthRequirement;
    strengthReq = (
      <div>
        Required Strength:{" "}
        <span class={isEthereal ? "magic" : ""}>
          {etherealStrengthReq}
          {isEthereal && strengthRequirement > 10 && (
            <span class="sidenote"> (was {strengthRequirement})</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <span class="tooltip-container" ref={containerRef}>
      <span
        class={`tooltip-trigger ${className}`}
        tabIndex={0}
        aria-describedby={tooltipId}
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
        {reqline}
        {strengthReq}
        {"def" in base && Array.isArray(base.def) && base.def.length >= 2 && (
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
        {isEthereal && "twoHanded" in base && (
          <div class="magic">+50% Enhanced Damage (Ethereal)</div>
        )}
        {isEthereal && <div class="magic">Ethereal</div>}
        {isPerfect && <div class="magic">Perfect</div>}
        {modifierElements}
      </div>
    </span>
  );
}
