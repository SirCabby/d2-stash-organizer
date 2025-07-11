import { Item } from "../../scripts/items/types/Item";
import { CustomAdditionalInfo } from "./CustomAdditionalInfo";
import "./Item.css";
import { ItemTooltip } from "../items/ItemTooltip";
import { ItemLocationDesc } from "../items/ItemLocationDesc";
import { useCallback, useContext } from "preact/hooks";
import { SelectionContext } from "./SelectionContext";

import {
  getItemCategoryName,
  getItemQualityName,
} from "../collection/ItemsTable";

export interface CustomItemProps {
  item: Item;
  duplicates?: Item[];
  selectable: boolean;
  withLocation: boolean;
  showClassRequirement?: boolean;
}

export function CustomItem({
  item,
  duplicates,
  selectable,
  withLocation,
  showClassRequirement,
}: CustomItemProps) {
  const { selectedItems, toggleItem, selectAll, unselectAll } =
    useContext(SelectionContext);

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

  return (
    <tr class="item">
      {selectable && (
        <td>
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
        <CustomAdditionalInfo
          item={item}
          quantity={duplicates?.length}
          duplicates={duplicates}
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
