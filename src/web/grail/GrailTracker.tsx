import {
  grailProgress,
  GrailStatus,
} from "../../scripts/grail/list/grailProgress";
import { TIER_NAMES } from "../../scripts/grail/list/listGrailItems";
import { useContext, useMemo } from "preact/hooks";
import { JSX } from "preact";
import "./GrailTracker.css";
import { CollectionContext } from "../store/CollectionContext";
import {
  SettingsContext,
  GrailFilters,
  GrailFilterValue,
} from "../settings/SettingsContext";
import { GrailSummary } from "./GrailSummary";
import { ItemTooltip } from "../items/ItemTooltip";
import { GrailItemTooltip } from "../items/GrailItemTooltip";

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

interface GrailFilterProps {
  value: GrailFilters;
  onChange: (value: GrailFilters) => void;
}

function GrailFilter({ value, onChange }: GrailFilterProps) {
  const handleCategoryChange = (
    category: keyof GrailFilters,
    newValue: "any" | "missing" | "found"
  ) => {
    onChange({
      ...value,
      [category]: newValue,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "1em",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "0.9em", fontWeight: "bold" }}>Filters:</span>
      {GRAIL_CATEGORIES.map((category) => (
        <div
          key={category.key}
          style={{ display: "flex", alignItems: "center", gap: "0.5em" }}
        >
          <label style={{ fontSize: "0.85em" }}>{category.label}:</label>
          <select
            value={value[category.key]}
            onChange={(e) =>
              handleCategoryChange(
                category.key,
                e.currentTarget.value as "any" | "missing" | "found"
              )
            }
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

function isShown(
  { normal, ethereal, perfect, perfectEth }: GrailStatus,
  filters: GrailFilters
) {
  // Items without an ethereal version only show when the eth filters are "any"
  const matches = (filter: GrailFilterValue, found?: boolean) =>
    filter === "any" ||
    (filter === "found" && found === true) ||
    (filter === "missing" && found === false);
  return (
    matches(filters.normal, normal) &&
    matches(filters.ethereal, ethereal) &&
    matches(filters.perfect, perfect) &&
    matches(filters["eth-perfect"], perfectEth)
  );
}

function grailItemRow(
  { item, normal, ethereal, perfect, perfectEth, foundItems }: GrailStatus,
  key: string
) {
  // Find the best representative item for tooltip
  const tooltipItem = foundItems.length > 0 ? foundItems[0] : null;

  // Find ethereal item for tooltip
  const etherealItem = foundItems.find((item) => item.ethereal);

  return (
    <tr key={key} class="grail-item">
      <th scope="row" class={"set" in item ? "set" : "unique"}>
        {tooltipItem ? (
          <ItemTooltip item={tooltipItem} />
        ) : (
          <GrailItemTooltip
            item={item}
            isEthereal={ethereal === true}
            isPerfect={perfect}
          />
        )}
      </th>
      <td class={toClassName(normal)}>
        <span style={{ display: "inline-block", verticalAlign: "top" }}>
          Normal
        </span>
      </td>
      <td class={toClassName(perfect)}>
        <span style={{ display: "inline-block", verticalAlign: "top" }}>
          Perfect
        </span>
      </td>
      <td class={ethereal === undefined ? "" : toClassName(ethereal)}>
        {ethereal === undefined ? null : (
          <span style={{ display: "inline-block", verticalAlign: "top" }}>
            {etherealItem ? (
              <ItemTooltip item={etherealItem} useDefaultColor={false}>
                <span>Ethereal</span>
              </ItemTooltip>
            ) : (
              <GrailItemTooltip
                item={item}
                isEthereal={true}
                isPerfect={false}
                useDefaultColor={false}
              >
                <span>Ethereal</span>
              </GrailItemTooltip>
            )}
          </span>
        )}
      </td>
      <td class={perfectEth === undefined ? "" : toClassName(perfectEth)}>
        {perfectEth === undefined ? null : (
          <span style={{ display: "inline-block", verticalAlign: "top" }}>
            Perfect Eth
          </span>
        )}
      </td>
    </tr>
  );
}

function headerRow(key: string, className: string, title: string) {
  return (
    <tr key={key} class={className}>
      <td colSpan={5}>{title}</td>
    </tr>
  );
}

export function GrailTracker() {
  const { allItems } = useContext(CollectionContext);
  const { grailFilters: filters, setGrailFilters: setFilters } =
    useContext(SettingsContext);

  const progress = useMemo(() => grailProgress(allItems), [allItems]);

  // Headers only show when the filters leave items under them
  const tableRows = useMemo(() => {
    const rows: JSX.Element[] = [];
    for (const category of progress) {
      const categoryRows: JSX.Element[] = [];
      for (const section of category.sections) {
        const sectionKey = `${category.name}/${section.name}`;
        const sectionRows: JSX.Element[] = [];
        for (const { tier, items } of section.tiers) {
          const tierKey = `${sectionKey}/${tier ?? ""}`;
          const itemRows = items.flatMap((status, i) =>
            isShown(status, filters)
              ? [grailItemRow(status, `${tierKey}/${i}`)]
              : []
          );
          if (itemRows.length === 0) {
            continue;
          }
          if (typeof tier !== "undefined") {
            sectionRows.push(
              headerRow(`tier-${tierKey}`, "grail-tier", TIER_NAMES[tier])
            );
          }
          sectionRows.push(...itemRows);
        }
        if (sectionRows.length > 0) {
          categoryRows.push(
            headerRow(`section-${sectionKey}`, "grail-section", section.name),
            ...sectionRows
          );
        }
      }
      if (categoryRows.length > 0) {
        rows.push(
          headerRow(
            `category-${category.name}`,
            "grail-category",
            category.name
          ),
          ...categoryRows
        );
      }
    }
    return rows;
  }, [filters, progress]);

  return (
    <div>
      <div className="controls" style={{ padding: "0.5em 0" }}>
        <GrailSummary />
      </div>
      <div
        style={{
          marginBottom: "0.5em",
          borderBottom: "1px solid #666666",
          paddingBottom: "0.5em",
          paddingTop: "0.5em",
        }}
      >
        <GrailFilter value={filters} onChange={setFilters} />
      </div>
      <table id="grail-tracker">
        <tbody>{tableRows}</tbody>
      </table>
    </div>
  );
}
