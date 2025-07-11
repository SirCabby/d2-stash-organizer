import { grailProgress } from "../../scripts/grail/list/grailProgress";
import { useContext, useMemo, useState, useEffect, useRef } from "preact/hooks";
import { JSX } from "preact";
import "./GrailTracker.css";
import { CollectionContext } from "../store/CollectionContext";
import { GrailSummary } from "./GrailSummary";

const TIER_NAMES = ["Normal", "Exceptional", "Elite"];

const toClassName = (b: boolean) => (b ? "found" : "missing");

const GRAIL_FILTER_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "missing", label: "Missing" },
  { value: "found", label: "Found" },
] as const;

const GRAIL_CATEGORIES = [
  { key: "normal", label: "Normal" },
  { key: "perfect", label: "Perfect" },
  { key: "ethereal", label: "Ethereal" },
  { key: "eth-perfect", label: "Eth Perfect" },
] as const;

interface GrailFilters {
  normal: "any" | "missing" | "found";
  ethereal: "any" | "missing" | "found";
  perfect: "any" | "missing" | "found";
  "eth-perfect": "any" | "missing" | "found";
}

interface GrailFilterProps {
  value: GrailFilters;
  onChange: (value: GrailFilters) => void;
}

function GrailFilter({ value, onChange }: GrailFilterProps) {
  const handleCategoryChange = (category: keyof GrailFilters, newValue: "any" | "missing" | "found") => {
    onChange({
      ...value,
      [category]: newValue,
    });
  };

  return (
    <div style={{ display: "flex", gap: "1em", alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.9em", fontWeight: "bold" }}>Filters:</span>
      {GRAIL_CATEGORIES.map((category) => (
        <div key={category.key} style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
          <label style={{ fontSize: "0.85em" }}>{category.label}:</label>
          <select
            value={value[category.key]}
            onChange={(e) => handleCategoryChange(category.key, e.currentTarget.value as "any" | "missing" | "found")}
            style={{
              padding: "0.25em 0.5em",
              fontSize: "0.85em",
              border: "1px solid #ccc",
              borderRadius: "3px",
              backgroundColor: "#f8f8f8",
              cursor: "pointer",
            }}
          >
            {GRAIL_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function GrailTracker() {
  const { allItems } = useContext(CollectionContext);
  const [filters, setFilters] = useState<GrailFilters>({
    normal: "any",
    ethereal: "any",
    perfect: "any",
    "eth-perfect": "any",
  });

  const progress = useMemo(() => grailProgress(allItems), [allItems]);

  const tableRows = useMemo(() => {
    const rows: JSX.Element[] = [];
    for (const [section, tiers] of progress) {
      tiers.forEach((tier, i) => {
        const items: JSX.Element[] = [];
        for (const { item, normal, ethereal, perfect, perfectEth } of tier) {
          // Check if item should be shown based on filters
          const shouldShowNormal = filters.normal === "any" || 
            (filters.normal === "found" && normal) || 
            (filters.normal === "missing" && !normal);
          
          const shouldShowEthereal = filters.ethereal === "any" || 
            (filters.ethereal === "found" && ethereal === true) || 
            (filters.ethereal === "missing" && ethereal === false);
          
          const shouldShowPerfect = filters.perfect === "any" || 
            (filters.perfect === "found" && perfect) || 
            (filters.perfect === "missing" && !perfect);
          
          const shouldShowEthPerfect = filters["eth-perfect"] === "any" || 
            (filters["eth-perfect"] === "found" && perfectEth === true) || 
            (filters["eth-perfect"] === "missing" && perfectEth === false);

          // Only show item if all selected filters are satisfied
          if (!shouldShowNormal || !shouldShowEthereal || !shouldShowPerfect || !shouldShowEthPerfect) {
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
              <td class={ethereal === undefined ? "" : toClassName(ethereal)}>
                {ethereal === undefined ? null : (
                  <span style={{ display: "inline-block", verticalAlign: "top" }}>Ethereal</span>
                )}
              </td>
              <td class={perfectEth === undefined ? "" : toClassName(perfectEth)}>
                {perfectEth === undefined ? null : (
                  <span style={{ display: "inline-block", verticalAlign: "top" }}>Perfect Eth</span>
                )}
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
            <td colSpan={5}>{sectionName}</td>
          </tr>
        );
        rows.push(...items);
      });
    }
    return rows;
  }, [filters, progress]);

  return (
    <div>
      <div className="controls" style={{ padding: "0.5em 0" }}>
        <GrailSummary />
      </div>
      <div style={{ 
        marginBottom: "0.5em",
        borderBottom: "1px solid #666666",
        paddingBottom: "0.5em",
        paddingTop: "0.5em"
      }}>
        <GrailFilter value={filters} onChange={setFilters} />
      </div>
      <table id="grail-tracker">
        <tbody>{tableRows}</tbody>
      </table>
    </div>
  );
}
