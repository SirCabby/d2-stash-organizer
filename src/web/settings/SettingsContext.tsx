import { createContext, RenderableProps } from "preact";
import { useCallback, useMemo, useState } from "preact/hooks";
import { QualityFilterValue } from "../controls/QualityFilter";
import { DuplicatesFilterValue } from "../controls/DuplicatesFilter";
import { SortField, SortDirection } from "../collection/Collection";

interface SettingsContext {
  accessibleFont: boolean;
  toggleAccessibleFont: () => void;
  collectionSearch: string;
  setCollectionSearch: (search: string) => void;
  collectionQuality: QualityFilterValue;
  setCollectionQuality: (quality: QualityFilterValue) => void;
  collectionDuplicates: DuplicatesFilterValue;
  setCollectionDuplicates: (duplicates: DuplicatesFilterValue) => void;
  collectionPageSize: number;
  setCollectionPageSize: (pageSize: number) => void;
  collectionSortField: SortField;
  setCollectionSortField: (field: SortField) => void;
  collectionSortDirection: SortDirection;
  setCollectionSortDirection: (dir: SortDirection) => void;
}

export const SettingsContext = createContext<SettingsContext>({
  accessibleFont: false,
  toggleAccessibleFont: () => undefined,
  collectionSearch: "",
  setCollectionSearch: () => undefined,
  collectionQuality: "all",
  setCollectionQuality: () => undefined,
  collectionDuplicates: "all",
  setCollectionDuplicates: () => undefined,
  collectionPageSize: 20,
  setCollectionPageSize: () => undefined,
  collectionSortField: "none",
  setCollectionSortField: () => undefined,
  collectionSortDirection: "asc",
  setCollectionSortDirection: () => undefined,
});

export function SettingsProvider({ children }: RenderableProps<unknown>) {
  const [accessibleFont, setAccessibleFont] = useState(
    () => localStorage.getItem("accessibleFont") === "true"
  );

  const [collectionSearch, setCollectionSearchState] = useState(
    () => localStorage.getItem("collectionSearch") || ""
  );

  const [collectionQuality, setCollectionQualityState] =
    useState<QualityFilterValue>(
      () =>
        (localStorage.getItem("collectionQuality") as QualityFilterValue) ||
        "all"
    );

  const [collectionDuplicates, setCollectionDuplicatesState] =
    useState<DuplicatesFilterValue>(
      () =>
        (localStorage.getItem(
          "collectionDuplicates"
        ) as DuplicatesFilterValue) || "all"
    );

  const [collectionPageSize, setCollectionPageSizeState] = useState(
    () => Number(localStorage.getItem("collectionPageSize")) || 20
  );

  const [collectionSortField, setCollectionSortFieldState] =
    useState<SortField>(
      () => (localStorage.getItem("collectionSortField") as SortField) || "none"
    );

  const [collectionSortDirection, setCollectionSortDirectionState] =
    useState<SortDirection>(
      () =>
        (localStorage.getItem("collectionSortDirection") as SortDirection) ||
        "asc"
    );

  const toggleAccessibleFont = useCallback(() => {
    setAccessibleFont((previous) => {
      localStorage.setItem("accessibleFont", `${!previous}`);
      return !previous;
    });
  }, []);

  const setCollectionSearch = useCallback((search: string) => {
    setCollectionSearchState(search);
    localStorage.setItem("collectionSearch", search);
  }, []);

  const setCollectionQuality = useCallback((quality: QualityFilterValue) => {
    setCollectionQualityState(quality);
    localStorage.setItem("collectionQuality", quality);
  }, []);

  const setCollectionDuplicates = useCallback(
    (duplicates: DuplicatesFilterValue) => {
      setCollectionDuplicatesState(duplicates);
      localStorage.setItem("collectionDuplicates", duplicates);
    },
    []
  );

  const setCollectionPageSize = useCallback((pageSize: number) => {
    setCollectionPageSizeState(pageSize);
    localStorage.setItem("collectionPageSize", pageSize.toString());
  }, []);

  const setCollectionSortField = useCallback((field: SortField) => {
    setCollectionSortFieldState(field);
    localStorage.setItem("collectionSortField", field);
  }, []);

  const setCollectionSortDirection = useCallback((dir: SortDirection) => {
    setCollectionSortDirectionState(dir);
    localStorage.setItem("collectionSortDirection", dir);
  }, []);

  const value = useMemo(
    () => ({
      accessibleFont,
      toggleAccessibleFont,
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
    }),
    [
      accessibleFont,
      toggleAccessibleFont,
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
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
