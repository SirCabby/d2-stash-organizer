import "./Collection.css";
import { useContext, useMemo, useEffect } from "preact/hooks";
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
import {
  CharacteristicsFilter,
  filterItemsByCharacteristics,
} from "../controls/CharacteristicsFilter";
import {
  LocationFilter,
  filterItemsByLocation,
} from "../controls/LocationFilter";
import { ItemsTable } from "./ItemsTable";
import { SelectAll } from "../controls/SelectAll";
import { ownerName } from "../../scripts/save-file/ownership";

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
    collectionLocation,
    setCollectionLocation,
  } = useContext(SettingsContext);

  // Clean up location filter when locations no longer exist
  useEffect(() => {
    if (collectionLocation.length > 0) {
      // Get all available location names from current items
      const availableLocations = new Set<string>();
      for (const item of allItems) {
        if (item.owner) {
          availableLocations.add(ownerName(item.owner));
        }
      }

      // Filter out locations that no longer exist
      const validLocations = collectionLocation.filter((location) =>
        availableLocations.has(location)
      );

      // Update the filter if any locations were removed
      if (validLocations.length !== collectionLocation.length) {
        setCollectionLocation(validLocations);
      }
    }
  }, [allItems, collectionLocation, setCollectionLocation]);

  const filteredItems = useMemo(
    () =>
      filterItemsByCategory(
        filterItemsByQuality(
          searchItems(allItems, collectionSearch),
          collectionQuality
        ),
        collectionCategory
      ),
    [allItems, collectionSearch, collectionQuality, collectionCategory]
  );

  const classFilteredItems = useMemo(
    () => filterItemsByClass(filteredItems, collectionClass),
    [filteredItems, collectionClass]
  );

  const characteristicsFilteredItems = useMemo(
    () =>
      filterItemsByCharacteristics(
        classFilteredItems,
        collectionCharacteristics
      ),
    [classFilteredItems, collectionCharacteristics]
  );

  const locationFilteredItems = useMemo(
    () =>
      filterItemsByLocation(characteristicsFilteredItems, collectionLocation),
    [characteristicsFilteredItems, collectionLocation]
  );

  // Duplicates filter should be applied last, so it only considers currently visible items
  const duplicatesFilteredItems = useMemo(
    () => filterItemsByDuplicates(locationFilteredItems, collectionDuplicates),
    [locationFilteredItems, collectionDuplicates]
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
        />
        <LocationFilter
          value={collectionLocation}
          onChange={setCollectionLocation}
          items={allItems}
        />
        <DuplicatesFilter
          value={collectionDuplicates}
          onChange={setCollectionDuplicates}
        />
        <SelectAll items={duplicatesFilteredItems} />
      </div>

      <ItemsTable
        items={duplicatesFilteredItems}
        selectable={true}
        pageSize={-1}
        sortField={collectionSortField}
        sortDirection={collectionSortDirection}
        onSort={handleSort}
      />
    </>
  );
}
