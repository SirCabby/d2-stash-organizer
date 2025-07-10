import "./Collection.css";
import { useContext, useMemo, useState } from "preact/hooks";
import { CollectionContext } from "../store/CollectionContext";
import "../controls/Controls.css";
import { Search, searchItems } from "../controls/Search";
import {
  filterItemsByQuality,
  QualityFilter,
  QualityFilterValue,
} from "../controls/QualityFilter";
import { ItemsTable } from "./ItemsTable";
import { SelectAll } from "../controls/SelectAll";

export type SortField = "name" | "characteristics" | "location" | "none";
export type SortDirection = "asc" | "desc";

export function Collection() {
  const { allItems } = useContext(CollectionContext);
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState<QualityFilterValue>("all");
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredItems = useMemo(
    () => filterItemsByQuality(searchItems(allItems, search), quality),
    [allItems, search, quality]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <>
      <div class="controls">
        <Search value={search} onChange={setSearch}>
          Search for an item:
        </Search>
        <QualityFilter value={quality} onChange={setQuality} />
        <div>
          <p>
            <label for="page-size-select">Items per page:</label>
          </p>
          <p>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={({ currentTarget }) =>
                setPageSize(Number(currentTarget.value))
              }
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </p>
        </div>
        <SelectAll items={filteredItems} />
      </div>

      <ItemsTable
        items={filteredItems}
        selectable={true}
        pageSize={pageSize}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </>
  );
}
