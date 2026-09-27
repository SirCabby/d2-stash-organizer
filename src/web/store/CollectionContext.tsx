import { createContext, RenderableProps } from "preact";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "preact/hooks";
import { getSavedStashes, readSaveLocation } from "./store";
import { NO_SAVE_LOCATION, SaveLocation } from "./saveLocation";
import { Item } from "../../scripts/items/types/Item";
import { getAllItems } from "../../scripts/plugy-stash/getAllItems";
import {
  isCharacter,
  isD2rStash,
  isPlugyStash,
  ItemsOwner,
  ownerName,
} from "../../scripts/save-file/ownership";
import { Character } from "../../scripts/character/types";
import { PlugyStash } from "../../scripts/plugy-stash/types";
import { findDuplicates } from "./plugyDuplicates";
import { ItemStorageType } from "../../scripts/items/types/ItemLocation";
import { SelectionContext } from "../transfer/SelectionContext";

interface Collection {
  owners: ItemsOwner[];
  allItems: Item[];
  hasPlugY: boolean;
  hasD2rStash: boolean;
  /*
   * PlugY copies the last active stash page to the .d2s file on save, which results in duplicates for us.
   * If we find a PlugY stash for a character, we ignore the character's stash items.
   */
  lastActivePlugyStashPage?: Map<Character, [PlugyStash, number]>;
}

export interface CollectionContextValue extends Collection {
  /** Where the owners' save files came from, and so where saving puts them. */
  saveLocation: SaveLocation;
  setCollection: (owners: ItemsOwner[]) => void;
  setSingleFile: (owner: ItemsOwner) => void;
  setSaveLocation: (location: SaveLocation) => void;
}

export const CollectionContext = createContext<CollectionContextValue>({
  owners: [],
  allItems: [],
  hasPlugY: false,
  hasD2rStash: false,
  saveLocation: NO_SAVE_LOCATION,
  setCollection: () => undefined,
  setSingleFile: () => undefined,
  setSaveLocation: () => undefined,
});

function formatCollection(owners: ItemsOwner[]): Collection {
  owners.sort((a, b) => ownerName(a).localeCompare(ownerName(b)));
  const hasPlugY = owners.some(
    (owner) => isPlugyStash(owner) && !owner.nonPlugY
  );
  const hasD2rStash = owners.some((owner) => isD2rStash(owner));
  const lastActivePlugyStashPage = hasPlugY
    ? findDuplicates(owners)
    : undefined;
  const allItems = owners.flatMap((owner) => {
    let items = getAllItems(owner);
    if (isCharacter(owner) && lastActivePlugyStashPage?.has(owner)) {
      items = items.filter((item) => item.stored !== ItemStorageType.STASH);
    }
    return items;
  });
  return { owners, allItems, hasPlugY, hasD2rStash, lastActivePlugyStashPage };
}

export function CollectionProvider({ children }: RenderableProps<unknown>) {
  const { resetSelection } = useContext(SelectionContext);
  const [collection, setInternalCollection] = useState<Collection>({
    owners: [],
    allItems: [],
    hasPlugY: false,
    hasD2rStash: false,
  });
  const [saveLocation, setSaveLocation] = useState(NO_SAVE_LOCATION);

  const setCollection = useCallback(
    (owners: ItemsOwner[]) => {
      setInternalCollection(formatCollection(owners));
      resetSelection();
    },
    [resetSelection]
  );

  const setSingleFile = useCallback(
    (owner: ItemsOwner) => {
      setInternalCollection((previous) => {
        const newOwners = [...previous.owners];
        const existing = newOwners.findIndex(
          (o) => o.filename === owner.filename
        );
        if (existing >= 0) {
          newOwners.splice(existing, 1, owner);
        } else {
          newOwners.push(owner);
        }
        return formatCollection(newOwners);
      });
      resetSelection();
    },
    [resetSelection]
  );

  const value = useMemo(
    () => ({
      ...collection,
      saveLocation,
      setCollection,
      setSingleFile,
      setSaveLocation,
    }),
    [collection, saveLocation, setCollection, setSingleFile]
  );

  // Initialize with the stash found in storage
  useEffect(() => {
    void Promise.all([getSavedStashes(), readSaveLocation()]).then(
      ([owners, storedLocation]) => {
        setCollection(owners);
        setSaveLocation(storedLocation);
        if (!window.location.hash && owners.length > 0) {
          window.location.hash = "#saves";
        }
      }
    );
  }, [setCollection]);

  return (
    <CollectionContext.Provider value={value}>
      {children}
    </CollectionContext.Provider>
  );
}
