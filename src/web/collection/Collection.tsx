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
import { Item as ItemType } from "../../scripts/items/types/Item";

export type SortField =
  | "name"
  | "level"
  | "category"
  | "characteristics"
  | "location"
  | "class"
  | "none";
export type SortDirection = "asc" | "desc";

function filterItemsByEthereal(items: ItemType[], ethereal: boolean): ItemType[] {
  if (!ethereal) return items;
  return items.filter(item => item.ethereal);
}

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
    collectionEthereal,
    setCollectionEthereal,
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

  const etherealFilteredItems = useMemo(
    () => filterItemsByEthereal(filteredItems, collectionEthereal),
    [filteredItems, collectionEthereal]
  );

  const classFilteredItems = useMemo(
    () => filterItemsByClass(etherealFilteredItems, collectionClass),
    [etherealFilteredItems, collectionClass]
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
        <CategoryFilter
          value={collectionCategory}
          onChange={setCollectionCategory}
        />
        <ClassFilter value={collectionClass} onChange={setCollectionClass} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <DuplicatesFilter
            value={collectionDuplicates}
            onChange={setCollectionDuplicates}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={collectionEthereal}
              onChange={e => setCollectionEthereal(e.currentTarget.checked)}
            />
            Ethereal
          </label>
        </div>
        <SelectAll items={filteredItems} />
      </div>

      <ItemsTable
        items={classFilteredItems}
        selectable={true}
        pageSize={-1}
        sortField={collectionSortField}
        sortDirection={collectionSortDirection}
        onSort={handleSort}
      />
    </>
  );
}
