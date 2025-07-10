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
import {
  filterItemsByCategory,
  CategoryFilter,
} from "../controls/CategoryFilter";
import { ClassFilter, filterItemsByClass } from "../controls/ClassFilter";
import { ItemsTable } from "./ItemsTable";
import { SelectAll } from "../controls/SelectAll";

export type SortField =
  | "name"
  | "level"
  | "category"
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
    collectionCategory,
    setCollectionCategory,
    collectionPageSize,
    setCollectionPageSize,
    collectionSortField,
    setCollectionSortField,
    collectionSortDirection,
    setCollectionSortDirection,
    collectionClass,
    setCollectionClass,
  } = useContext(SettingsContext);

  const filteredItems = useMemo(
    () =>
      filterItemsByCategory(
        filterItemsByDuplicates(
          filterItemsByQuality(
            searchItems(allItems, collectionSearch),
            collectionQuality
          ),
          collectionDuplicates
        ),
        collectionCategory
      ),
    [
      allItems,
      collectionSearch,
      collectionQuality,
      collectionDuplicates,
      collectionCategory,
    ]
  );

  const classFilteredItems = useMemo(
    () => filterItemsByClass(filteredItems, collectionClass),
    [filteredItems, collectionClass]
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
        <CategoryFilter
          value={collectionCategory}
          onChange={setCollectionCategory}
        />
        <ClassFilter
          value={collectionClass}
          onChange={setCollectionClass}
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
        items={classFilteredItems}
        selectable={true}
        pageSize={collectionPageSize}
        sortField={collectionSortField}
        sortDirection={collectionSortDirection}
        onSort={handleSort}
      />
    </>
  );
}
