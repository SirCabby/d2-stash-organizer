import { grailProgress } from "../../scripts/grail/list/grailProgress";
import { useContext, useMemo, useState, useEffect, useRef } from "preact/hooks";
import { JSX } from "preact";
import "./GrailTracker.css";
import { CollectionContext } from "../store/CollectionContext";
import { GrailSummary } from "./GrailSummary";

const TIER_NAMES = ["Normal", "Exceptional", "Elite"];

const toClassName = (b: boolean) => (b ? "found" : "missing");

const GRAIL_FILTER_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "perfect", label: "Perfect" },
  { value: "ethereal", label: "Ethereal" },
  { value: "eth-perfect", label: "Eth Perfect" },
] as const;

interface GrailFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

function GrailFilter({ value, onChange }: GrailFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState<string[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update temp selection when value changes
  useEffect(() => {
    setTempSelection(value);
  }, [value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setTempSelection(value); // Reset to original value
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, value]);

  const handleToggle = (filterValue: string) => {
    const newValue = tempSelection.includes(filterValue)
      ? tempSelection.filter((v) => v !== filterValue)
      : [...tempSelection, filterValue];
    setTempSelection(newValue);
  };

  const selectAll = () => {
    setTempSelection(GRAIL_FILTER_OPTIONS.map((option) => option.value));
  };

  const selectNone = () => {
    setTempSelection([]);
  };

  const applySelection = () => {
    onChange(tempSelection);
    setIsOpen(false);
  };

  const cancelSelection = () => {
    setTempSelection(value);
    setIsOpen(false);
  };

  const getSelectedLabels = () => {
    if (tempSelection.length === 0) return "None";
    if (tempSelection.length === GRAIL_FILTER_OPTIONS.length) return "All";
    if (tempSelection.length === 1) {
      return (
        GRAIL_FILTER_OPTIONS.find((opt) => opt.value === tempSelection[0])
          ?.label || ""
      );
    }
    return `${tempSelection.length} selected`;
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <p style={{ margin: "0.25em 0" }}>
        <label style={{ fontSize: "0.9em" }}>Show Missing:</label>
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
              marginBottom: "0.5em",
            }}
          >
            {GRAIL_FILTER_OPTIONS.map((option, index) => (
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
                  checked={tempSelection.includes(option.value)}
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

          <div style={{ textAlign: "right" }}>
            <button
              type="button"
              onClick={cancelSelection}
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
              Cancel
            </button>
            <button
              type="button"
              onClick={applySelection}
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
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GrailTracker() {
  const { allItems } = useContext(CollectionContext);
  const [filters, setFilters] = useState<string[]>([
    "normal",
    "perfect",
    "ethereal",
    "eth-perfect",
  ]);

  const progress = useMemo(() => grailProgress(allItems), [allItems]);

  const tableRows = useMemo(() => {
    const rows: JSX.Element[] = [];
    for (const [section, tiers] of progress) {
      tiers.forEach((tier, i) => {
        const items = [];
        for (const { item, normal, ethereal, perfect, perfectEth } of tier) {
          if (
            (normal && filters.includes("normal")) ||
            (perfect && filters.includes("perfect")) ||
            ((typeof ethereal === "undefined" || ethereal) &&
              filters.includes("ethereal")) ||
            ((typeof perfectEth === "undefined" || perfectEth) &&
              filters.includes("eth-perfect"))
          ) {
            continue;
          }
                      items.push(
            <tr class="grail-item">
              <th scope="row" class={"set" in item ? "set" : "unique"}>
                {item.name.trim()}
              </th>
              <td class={toClassName(normal)}>
                <span style={{ display: "inline-block", verticalAlign: "top" }}>Normal</span>
              </td>
              <td class={toClassName(perfect)}>
                <span style={{ display: "inline-block", verticalAlign: "top" }}>Perfect</span>
              </td>
              <td class={toClassName(ethereal || false)}>
                <span style={{ display: "inline-block", verticalAlign: "top" }}>{ethereal === undefined ? "N/A" : "Ethereal"}</span>
              </td>
              <td class={toClassName(perfectEth || false)}>
                <span style={{ display: "inline-block", verticalAlign: "top" }}>{perfectEth === undefined ? "N/A" : "Perfect Eth"}</span>
              </td>
            </tr>
          );
        }
        if (items.length === 0) {
          return;
        }
        const sectionName =
          tiers.length > 1 ? `${TIER_NAMES[i]} ${section.name}` : section.name;
        rows.push(
          <tr class="grail-header">
            <td colSpan="5">{sectionName}</td>
          </tr>
        );
        rows.push(...items);
      });
    }
    return rows;
  }, [filters, progress]);

  return (
    <>
      <div class="controls" style={{ padding: "0.5em 0" }}>
        <GrailSummary />
      </div>
      <div style={{ 
        marginBottom: "0.5em",
        borderBottom: "1px solid #666666",
        paddingBottom: "0.5em"
      }}>
        <GrailFilter value={filters} onChange={setFilters} />
      </div>
      <table id="grail-tracker">
        <tbody>{tableRows}</tbody>
      </table>
    </>
  );
}
