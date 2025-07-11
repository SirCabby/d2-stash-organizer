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
import { CharacteristicsFilter, filterItemsByCharacteristics } from "../controls/CharacteristicsFilter";
import { ItemsTable } from "./ItemsTable";
import { SelectAll } from "../controls/SelectAll";
import { Item as ItemType } from "../../scripts/items/types/Item";

export type SortField =
  | "name"
  | "level"
  | "quality"
  | "category"
  | "characteristics"
  | "location"
  | "class"
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
    collectionSortField,
    setCollectionSortField,
    collectionSortDirection,
    setCollectionSortDirection,
    collectionClass,
    setCollectionClass,
    collectionCharacteristics,
    setCollectionCharacteristics,
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

  const characteristicsFilteredItems = useMemo(
    () => filterItemsByCharacteristics(classFilteredItems, collectionCharacteristics),
    [classFilteredItems, collectionCharacteristics]
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
        <CharacteristicsFilter 
          value={collectionCharacteristics} 
          onChange={setCollectionCharacteristics}
          items={allItems}
        />
        <DuplicatesFilter
          value={collectionDuplicates}
          onChange={setCollectionDuplicates}
        />
        <SelectAll items={characteristicsFilteredItems} />
      </div>

      <ItemsTable
        items={characteristicsFilteredItems}
        selectable={true}
        pageSize={-1}
        sortField={collectionSortField}
        sortDirection={collectionSortDirection}
        onSort={handleSort}
      />
    </>
  );
}
