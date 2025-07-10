import "./Collection.css";
import { useContext, useMemo } from "preact/hooks";
import { CollectionContext } from "../store/CollectionContext";
import { SettingsContext } from "../settings/SettingsContext";
import "../controls/Controls.css";
import { Search, searchItems } from "../controls/Search";
import { filterItemsByQuality, QualityFilter } from "../controls/QualityFilter";
import {
  filterItemsByDuplicates,
  DuplicatesFilter,
} from "../controls/DuplicatesFilter";
import { ItemsTable } from "./ItemsTable";
import { SelectAll } from "../controls/SelectAll";

export type SortField =
  | "name"
  | "level"
  | "characteristics"
  | "location"
  | "none";
export type SortDirection = "asc" | "desc";

export function Collection() {
  const { allItems } = useContext(CollectionContext);
  const {
    collectionSearch,
    setCollectionSearch,
    collectionQuality,
    setCollectionQuality,
    collectionDuplicates,
    setCollectionDuplicates,
    collectionPageSize,
    setCollectionPageSize,
    collectionSortField,
    setCollectionSortField,
    collectionSortDirection,
    setCollectionSortDirection,
  } = useContext(SettingsContext);

  const filteredItems = useMemo(
    () =>
      filterItemsByDuplicates(
        filterItemsByQuality(
          searchItems(allItems, collectionSearch),
          collectionQuality
        ),
        collectionDuplicates
      ),
    [allItems, collectionSearch, collectionQuality, collectionDuplicates]
  );

  const handleSort = (field: SortField) => {
    if (collectionSortField === field) {
      setCollectionSortDirection(
        collectionSortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setCollectionSortField(field);
      setCollectionSortDirection("asc");
    }
  };

  return (
    <>
      <div class="controls">
        <Search value={collectionSearch} onChange={setCollectionSearch}>
          Search for an item:
        </Search>
        <QualityFilter
          value={collectionQuality}
          onChange={setCollectionQuality}
        />
        <DuplicatesFilter
          value={collectionDuplicates}
          onChange={setCollectionDuplicates}
        />
        <div>
          <p>
            <label for="page-size-select">Items per page:</label>
          </p>
          <p>
            <select
              id="page-size-select"
              value={collectionPageSize}
              onChange={({ currentTarget }) =>
                setCollectionPageSize(Number(currentTarget.value))
              }
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All</option>
            </select>
          </p>
        </div>
        <SelectAll items={filteredItems} />
      </div>

      <ItemsTable
        items={filteredItems}
        selectable={true}
        pageSize={collectionPageSize}
        sortField={collectionSortField}
        sortDirection={collectionSortDirection}
        onSort={handleSort}
      />
    </>
  );
}
