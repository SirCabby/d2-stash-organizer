import { createContext, RenderableProps } from "preact";
import { useCallback, useMemo, useRef, useState } from "preact/hooks";
import { Item } from "../../scripts/items/types/Item";

interface SelectionContext {
  selectedItems: Set<Item>;
  toggleItem(item: Item): void;
  selectAll(items: Item[]): void;
  unselectAll(items: Item[]): void;
  shiftSelect(item: Item, allItems: Item[]): void;
  setAnchor(item: Item): void;
  resetSelection(): void;
}

export const SelectionContext = createContext<SelectionContext>({
  selectedItems: new Set(),
  toggleItem: () => undefined,
  selectAll: () => undefined,
  unselectAll: () => undefined,
  shiftSelect: () => undefined,
  setAnchor: () => undefined,
  resetSelection: () => undefined,
});

export function SelectionProvider({ children }: RenderableProps<unknown>) {
  const [selectedItems, setSelectedItems] = useState(new Set<Item>());
  const lastSelectedRef = useRef<Item | null>(null);

  const toggleItem = useCallback((item: Item) => {
    setSelectedItems((previous) => {
      const newSelection = new Set(previous);
      if (newSelection.has(item)) {
        newSelection.delete(item);
      } else {
        newSelection.add(item);
      }
      return newSelection;
    });
    lastSelectedRef.current = item;
  }, []);

  const toggleAll = useCallback(
    (selected: boolean) => (items: Item[]) => {
      setSelectedItems((previous) => {
        const newSelection = new Set(previous);
        for (const item of items) {
          newSelection[selected ? "add" : "delete"](item);
        }
        return newSelection;
      });
    },
    []
  );

  const shiftSelect = useCallback(
    (item: Item, allItems: Item[]) => {
      const anchor = lastSelectedRef.current;
      if (!anchor) {
        toggleItem(item);
        return;
      }

      const fromIndex = allItems.indexOf(anchor);
      const toIndex = allItems.indexOf(item);

      if (fromIndex === -1 || toIndex === -1) {
        toggleItem(item);
        return;
      }

      const startIndex = Math.min(fromIndex, toIndex);
      const endIndex = Math.max(fromIndex, toIndex);
      const rangeItems = allItems.slice(startIndex, endIndex + 1);

      setSelectedItems((previous) => {
        const newSelection = new Set(previous);
        rangeItems.forEach((i) => newSelection.add(i));
        return newSelection;
      });
      lastSelectedRef.current = item;
    },
    [toggleItem]
  );

  const setAnchor = useCallback((item: Item) => {
    lastSelectedRef.current = item;
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedItems(new Set());
    lastSelectedRef.current = null;
  }, []);

  const value = useMemo(
    () => ({
      selectedItems,
      toggleItem,
      selectAll: toggleAll(true),
      unselectAll: toggleAll(false),
      shiftSelect,
      setAnchor,
      resetSelection,
    }),
    [
      selectedItems,
      toggleItem,
      toggleAll,
      shiftSelect,
      setAnchor,
      resetSelection,
    ]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}
