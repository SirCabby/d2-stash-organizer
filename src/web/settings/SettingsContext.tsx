import { createContext, RenderableProps } from "preact";
import { useCallback, useMemo, useState } from "preact/hooks";
import { QualityFilterValue } from "../controls/QualityFilter";
import { DuplicatesFilterValue } from "../controls/DuplicatesFilter";
import { CategoryFilterValue } from "../controls/CategoryFilter";
import { SortField, SortDirection } from "../collection/Collection";
import { ClassFilterValue } from "../controls/ClassFilter";

interface SettingsContext {
  accessibleFont: boolean;
  toggleAccessibleFont: () => void;
  collectionSearch: string;
  setCollectionSearch: (search: string) => void;
  collectionQuality: QualityFilterValue;
  setCollectionQuality: (quality: QualityFilterValue) => void;
  collectionDuplicates: DuplicatesFilterValue;
  setCollectionDuplicates: (duplicates: DuplicatesFilterValue) => void;
  collectionCategory: CategoryFilterValue;
  setCollectionCategory: (category: CategoryFilterValue) => void;
  collectionPageSize: number;
  setCollectionPageSize: (pageSize: number) => void;
  collectionSortField: SortField;
  setCollectionSortField: (field: SortField) => void;
  collectionSortDirection: SortDirection;
  setCollectionSortDirection: (dir: SortDirection) => void;
  collectionClass: ClassFilterValue;
  setCollectionClass: (classValue: ClassFilterValue) => void;
}

export const SettingsContext = createContext<SettingsContext>({
  accessibleFont: false,
  toggleAccessibleFont: () => undefined,
  collectionSearch: "",
  setCollectionSearch: () => undefined,
  collectionQuality: [],
  setCollectionQuality: () => undefined,
  collectionDuplicates: false,
  setCollectionDuplicates: () => undefined,
  collectionCategory: [],
  setCollectionCategory: () => undefined,
  collectionPageSize: 20,
  setCollectionPageSize: () => undefined,
  collectionSortField: "none",
  setCollectionSortField: () => undefined,
  collectionSortDirection: "asc",
  setCollectionSortDirection: () => undefined,
  collectionClass: [],
  setCollectionClass: () => undefined,
});

export function SettingsProvider({ children }: RenderableProps<unknown>) {
  const [accessibleFont, setAccessibleFont] = useState(
    () => localStorage.getItem("accessibleFont") === "true"
  );

  const [collectionSearch, setCollectionSearchState] = useState(
    () => localStorage.getItem("collectionSearch") || ""
  );

  const [collectionQuality, setCollectionQualityState] =
    useState<QualityFilterValue>(() => {
      const stored = localStorage.getItem("collectionQuality");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed as QualityFilterValue;
          }
        } catch {
          // Fallback to default if parsing fails
        }
      }
      return [
        "normal",
        "superior",
        "magic",
        "rare",
        "unique",
        "set",
        "runeword",
        "crafted",
        "misc",
      ];
    });

  const [collectionDuplicates, setCollectionDuplicatesState] =
    useState<DuplicatesFilterValue>(
      () => localStorage.getItem("collectionDuplicates") === "true"
    );

  const [collectionCategory, setCollectionCategoryState] =
    useState<CategoryFilterValue>(() => {
      const stored = localStorage.getItem("collectionCategory");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed as CategoryFilterValue;
          }
        } catch {
          // Fallback to default if parsing fails
        }
      }
      return [];
    });

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

  const [collectionClass, setCollectionClassState] = useState<ClassFilterValue>(
    () => {
      const stored = localStorage.getItem("collectionClass");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed as ClassFilterValue;
          }
        } catch {
          // Fallback to default if parsing fails
        }
      }
      return [];
    }
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
    localStorage.setItem("collectionQuality", JSON.stringify(quality));
  }, []);

  const setCollectionDuplicates = useCallback(
    (duplicates: DuplicatesFilterValue) => {
      setCollectionDuplicatesState(duplicates);
      localStorage.setItem("collectionDuplicates", duplicates.toString());
    },
    []
  );

  const setCollectionCategory = useCallback((category: CategoryFilterValue) => {
    setCollectionCategoryState(category);
    localStorage.setItem("collectionCategory", JSON.stringify(category));
  }, []);

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

  const setCollectionClass = useCallback((classValue: ClassFilterValue) => {
    setCollectionClassState(classValue);
    localStorage.setItem("collectionClass", JSON.stringify(classValue));
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
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
