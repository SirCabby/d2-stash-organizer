import { Item } from "../../scripts/items/types/Item";
import { AdditionalInfo } from "./AdditionalInfo";
import "./Item.css";
import { ItemTooltip } from "./ItemTooltip";
import { ItemLocationDesc } from "./ItemLocationDesc";
import { useCallback, useContext } from "preact/hooks";
import { SelectionContext } from "../transfer/SelectionContext";
import { groupQuantity } from "./groupItems";

import {
  getItemCategoryName,
  getItemQualityName,
} from "../collection/itemUtils";

export interface ItemProps {
  item: Item;
  duplicates?: Item[];
  selectable: boolean;
  withLocation: boolean;
  showClassRequirement?: boolean;
  allItems?: Item[];
}

export function Item({
  item,
  duplicates,
  selectable,
  withLocation,
  showClassRequirement,
  allItems = [],
}: ItemProps) {
  const {
    selectedItems,
    toggleItem,
    selectAll,
    unselectAll,
    shiftSelect,
    setAnchor,
  } = useContext(SelectionContext);

  const handleSelect = useCallback(() => {
    if (!duplicates) {
      toggleItem(item);
    } else {
      if (selectedItems.has(item)) {
        unselectAll(duplicates);
      } else {
        selectAll(duplicates);
      }
    }
  }, [duplicates, item, selectAll, selectedItems, toggleItem, unselectAll]);

  const handleRowClick = useCallback(
    (event: MouseEvent) => {
      if ((event.target as HTMLElement).tagName === "INPUT") {
        return;
      }
      if (event.shiftKey && allItems.length > 0) {
        event.preventDefault();
        window.getSelection()?.removeAllRanges();
        shiftSelect(item, allItems);
      } else {
        handleSelect();
        setAnchor(item);
      }
    },
    [item, allItems, handleSelect, shiftSelect, setAnchor]
  );

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (event.shiftKey && allItems.length > 0) {
          shiftSelect(item, allItems);
        } else {
          handleSelect();
          setAnchor(item);
        }
      }
    },
    [item, allItems, handleSelect, shiftSelect, setAnchor]
  );

  return (
    <tr
      class={`item ${selectedItems.has(item) ? "selected" : ""}`}
      onClick={selectable ? handleRowClick : undefined}
      onKeyDown={selectable ? handleRowKeyDown : undefined}
      tabIndex={selectable ? 0 : undefined}
      role={selectable ? "button" : undefined}
      aria-label={selectable ? `Select ${item.name}` : undefined}
      style={selectable ? { cursor: "pointer" } : undefined}
    >
      {selectable && (
        <td onClick={(e: Event) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedItems.has(item)}
            onChange={handleSelect}
            aria-label={item.name}
          />
        </td>
      )}
      <th scope="row" aria-label={item.name}>
        <ItemTooltip item={item} />
      </th>
      <td>{item.level ?? "—"}</td>
      <td>{getItemQualityName(item)}</td>
      <td>{getItemCategoryName(item)}</td>
      {showClassRequirement && (
        <td>{item.classRequirement ? item.classRequirement : "All"}</td>
      )}
      <td>
        <AdditionalInfo
          item={item}
          quantity={duplicates ? groupQuantity(duplicates) : undefined}
        />
      </td>
      {withLocation && (
        <td>
          <ItemLocationDesc item={item} />
        </td>
      )}
    </tr>
  );
}
