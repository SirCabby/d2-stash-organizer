import { createContext, RenderableProps } from "preact";
import { useCallback, useMemo, useState } from "preact/hooks";
import { QualityFilterValue } from "../controls/QualityFilter";
import { DuplicatesFilterValue } from "../controls/DuplicatesFilter";
import { CategoryFilterValue } from "../controls/CategoryFilter";
import { SortField, SortDirection } from "../collection/Collection";
import { ClassFilterValue } from "../controls/ClassFilter";
import { CharacteristicsFilterValue } from "../controls/CharacteristicsFilter";
import { LocationFilterValue } from "../controls/LocationFilter";

export type GrailFilterValue = "any" | "missing" | "found";

export interface GrailFilters {
  normal: GrailFilterValue;
  ethereal: GrailFilterValue;
  perfect: GrailFilterValue;
  "eth-perfect": GrailFilterValue;
}

const DEFAULT_QUALITY: QualityFilterValue = [
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

const DEFAULT_GRAIL_FILTERS: GrailFilters = {
  normal: "any",
  ethereal: "any",
  perfect: "any",
  "eth-perfect": "any",
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "true";
}

function readNumber(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function readJsonArray<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed as T;
    } catch {
      /* fallback */
    }
  }
  return fallback;
}

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored) as T;
    } catch {
      /* fallback */
    }
  }
  return fallback;
}

interface SettingsContext {
  accessibleFont: boolean;
  toggleAccessibleFont: () => void;

  // Collection tab
  collectionSearch: string;
  setCollectionSearch: (search: string) => void;
  collectionQuality: QualityFilterValue;
  setCollectionQuality: (quality: QualityFilterValue) => void;
  collectionDuplicates: DuplicatesFilterValue;
  setCollectionDuplicates: (duplicates: DuplicatesFilterValue) => void;
  collectionCategory: CategoryFilterValue;
  setCollectionCategory: (category: CategoryFilterValue) => void;
  collectionSortField: SortField;
  setCollectionSortField: (field: SortField) => void;
  collectionSortDirection: SortDirection;
  setCollectionSortDirection: (dir: SortDirection) => void;
  collectionClass: ClassFilterValue;
  setCollectionClass: (classValue: ClassFilterValue) => void;
  collectionCharacteristics: CharacteristicsFilterValue;
  setCollectionCharacteristics: (
    characteristics: CharacteristicsFilterValue
  ) => void;
  collectionLocation: LocationFilterValue;
  setCollectionLocation: (location: LocationFilterValue) => void;

  // Characters tab
  charactersSearch: string;
  setCharactersSearch: (search: string) => void;
  charactersQuality: QualityFilterValue;
  setCharactersQuality: (quality: QualityFilterValue) => void;

  // Transfer tab
  transferWithOrganize: boolean;
  setTransferWithOrganize: (value: boolean) => void;
  transferSkipPages: number;
  setTransferSkipPages: (value: number) => void;

  // Grail tracker
  grailFilters: GrailFilters;
  setGrailFilters: (filters: GrailFilters) => void;

  // Organizer
  organizerSkipPages: number;
  setOrganizerSkipPages: (value: number) => void;
  organizerEmptyPages: number;
  setOrganizerEmptyPages: (value: number) => void;
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
  collectionSortField: "none",
  setCollectionSortField: () => undefined,
  collectionSortDirection: "asc",
  setCollectionSortDirection: () => undefined,
  collectionClass: [],
  setCollectionClass: () => undefined,
  collectionCharacteristics: [],
  setCollectionCharacteristics: () => undefined,
  collectionLocation: [],
  setCollectionLocation: () => undefined,

  charactersSearch: "",
  setCharactersSearch: () => undefined,
  charactersQuality: [],
  setCharactersQuality: () => undefined,

  transferWithOrganize: false,
  setTransferWithOrganize: () => undefined,
  transferSkipPages: 0,
  setTransferSkipPages: () => undefined,

  grailFilters: DEFAULT_GRAIL_FILTERS,
  setGrailFilters: () => undefined,

  organizerSkipPages: 1,
  setOrganizerSkipPages: () => undefined,
  organizerEmptyPages: 0,
  setOrganizerEmptyPages: () => undefined,
});

export function SettingsProvider({ children }: RenderableProps<unknown>) {
  // -- Global --
  const [accessibleFont, setAccessibleFont] = useState(() =>
    readBoolean("accessibleFont", false)
  );

  // -- Collection tab --
  const [collectionSearch, setCollectionSearchState] = useState(() =>
    readString("collectionSearch", "")
  );
  const [collectionQuality, setCollectionQualityState] =
    useState<QualityFilterValue>(() =>
      readJsonArray("collectionQuality", DEFAULT_QUALITY)
    );
  const [collectionDuplicates, setCollectionDuplicatesState] =
    useState<DuplicatesFilterValue>(() =>
      readBoolean("collectionDuplicates", false)
    );
  const [collectionCategory, setCollectionCategoryState] =
    useState<CategoryFilterValue>(() =>
      readJsonArray("collectionCategory", [])
    );
  const [collectionSortField, setCollectionSortFieldState] =
    useState<SortField>(
      () => readString("collectionSortField", "none") as SortField
    );
  const [collectionSortDirection, setCollectionSortDirectionState] =
    useState<SortDirection>(
      () => readString("collectionSortDirection", "asc") as SortDirection
    );
  const [collectionClass, setCollectionClassState] = useState<ClassFilterValue>(
    () => readJsonArray("collectionClass", [])
  );
  const [collectionCharacteristics, setCollectionCharacteristicsState] =
    useState<CharacteristicsFilterValue>(() =>
      readJsonArray("collectionCharacteristics", [])
    );
  const [collectionLocation, setCollectionLocationState] =
    useState<LocationFilterValue>(() =>
      readJsonArray("collectionLocation", [])
    );

  // -- Characters tab --
  const [charactersSearch, setCharactersSearchState] = useState(() =>
    readString("charactersSearch", "")
  );
  const [charactersQuality, setCharactersQualityState] =
    useState<QualityFilterValue>(() =>
      readJsonArray("charactersQuality", DEFAULT_QUALITY)
    );

  // -- Transfer tab --
  const [transferWithOrganize, setTransferWithOrganizeState] = useState(() =>
    readBoolean("transferWithOrganize", false)
  );
  const [transferSkipPages, setTransferSkipPagesState] = useState(() =>
    readNumber("transferSkipPages", 0)
  );

  // -- Grail tracker --
  const [grailFilters, setGrailFiltersState] = useState<GrailFilters>(() =>
    readJson("grailFilters", DEFAULT_GRAIL_FILTERS)
  );

  // -- Organizer --
  const [organizerSkipPages, setOrganizerSkipPagesState] = useState(() =>
    readNumber("organizerSkipPages", 1)
  );
  const [organizerEmptyPages, setOrganizerEmptyPagesState] = useState(() =>
    readNumber("organizerEmptyPages", 0)
  );

  // ---- Setters ----

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

  const setCollectionCharacteristics = useCallback(
    (characteristics: CharacteristicsFilterValue) => {
      setCollectionCharacteristicsState(characteristics);
      localStorage.setItem(
        "collectionCharacteristics",
        JSON.stringify(characteristics)
      );
    },
    []
  );

  const setCollectionLocation = useCallback((location: LocationFilterValue) => {
    setCollectionLocationState(location);
    localStorage.setItem("collectionLocation", JSON.stringify(location));
  }, []);

  const setCharactersSearch = useCallback((search: string) => {
    setCharactersSearchState(search);
    localStorage.setItem("charactersSearch", search);
  }, []);

  const setCharactersQuality = useCallback((quality: QualityFilterValue) => {
    setCharactersQualityState(quality);
    localStorage.setItem("charactersQuality", JSON.stringify(quality));
  }, []);

  const setTransferWithOrganize = useCallback((value: boolean) => {
    setTransferWithOrganizeState(value);
    localStorage.setItem("transferWithOrganize", value.toString());
  }, []);

  const setTransferSkipPages = useCallback((value: number) => {
    setTransferSkipPagesState(value);
    localStorage.setItem("transferSkipPages", value.toString());
  }, []);

  const setGrailFilters = useCallback((filters: GrailFilters) => {
    setGrailFiltersState(filters);
    localStorage.setItem("grailFilters", JSON.stringify(filters));
  }, []);

  const setOrganizerSkipPages = useCallback((value: number) => {
    setOrganizerSkipPagesState(value);
    localStorage.setItem("organizerSkipPages", value.toString());
  }, []);

  const setOrganizerEmptyPages = useCallback((value: number) => {
    setOrganizerEmptyPagesState(value);
    localStorage.setItem("organizerEmptyPages", value.toString());
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

      charactersSearch,
      setCharactersSearch,
      charactersQuality,
      setCharactersQuality,

      transferWithOrganize,
      setTransferWithOrganize,
      transferSkipPages,
      setTransferSkipPages,

      grailFilters,
      setGrailFilters,

      organizerSkipPages,
      setOrganizerSkipPages,
      organizerEmptyPages,
      setOrganizerEmptyPages,
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

      charactersSearch,
      setCharactersSearch,
      charactersQuality,
      setCharactersQuality,

      transferWithOrganize,
      setTransferWithOrganize,
      transferSkipPages,
      setTransferSkipPages,

      grailFilters,
      setGrailFilters,

      organizerSkipPages,
      setOrganizerSkipPages,
      organizerEmptyPages,
      setOrganizerEmptyPages,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
