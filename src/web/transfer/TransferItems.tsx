import { useCallback, useContext, useMemo, useState } from "preact/hooks";
import { SelectionContext } from "./SelectionContext";
import { TransferItemsTable } from "./TransferItemsTable";
import "./TransferItems.css";
import { CollectionContext } from "../store/CollectionContext";
import { PrettyOwnerName } from "../save-files/PrettyOwnerName";
import {
  isCharacter,
  isPlugyStash,
  isStash,
  ItemsOwner,
} from "../../scripts/save-file/ownership";
import {
  ItemLocation,
  ItemStorageType,
} from "../../scripts/items/types/ItemLocation";
import { useUpdateCollection } from "../store/useUpdateCollection";
import { numberInputChangeHandler } from "../organizer/numberInputChangeHandler";
import { organize } from "../../scripts/grail/organize";
import { OwnerSelector } from "../save-files/OwnerSelector";
import { updateCharacterStashes } from "../store/plugyDuplicates";
import { bulkTransferWithQuantities } from "../../scripts/items/moving/bulkTransferWithQuantities";
import { TransferQuantityContext } from "./TransferQuantityContext";
import { Item } from "../../scripts/items/types/Item";
import { groupItems } from "../items/groupItems";
import { isSimpleItem } from "../collection/utils/isSimpleItem";

export function TransferItems() {
  const { lastActivePlugyStashPage } = useContext(CollectionContext);
  const { updateAllFiles, rollback } = useUpdateCollection();
  const { selectedItems, unselectAll } = useContext(SelectionContext);
  const { transferQuantities, resetQuantities } = useContext(
    TransferQuantityContext
  );
  const [target, setTarget] = useState<ItemsOwner>();
  const [targetStorage, setTargetStorage] = useState<ItemStorageType>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const [withOrganize, setWithOrganize] = useState<boolean>(false);
  const [skipPages, setSkipPages] = useState(0);

  const items = useMemo(() => Array.from(selectedItems), [selectedItems]);

  // Calculate the actual number of items that will be transferred
  const actualTransferCount = useMemo(() => {
    const groupedItems = groupItems(items);
    let totalTransferred = 0;

    for (const itemGroup of groupedItems) {
      const representativeItem = itemGroup[0];

      if (isSimpleItem(representativeItem) && itemGroup.length > 1) {
        // For simple items with quantities, check if we have a specific transfer quantity
        const transferQuantity = transferQuantities.get(
          representativeItem.code
        );
        if (
          transferQuantity &&
          transferQuantity > 0 &&
          transferQuantity < itemGroup.length
        ) {
          // Transfer only the specified quantity
          totalTransferred += transferQuantity;
        } else {
          // Transfer all items in the group
          totalTransferred += itemGroup.length;
        }
      } else {
        // For non-simple items or single items, transfer all
        totalTransferred += itemGroup.length;
      }
    }

    return totalTransferred;
  }, [items, transferQuantities]);

  const handleRemoveItem = useCallback(
    (itemToRemove: Item) => {
      // Find all items that are the same as the one to remove (same code and location)
      const itemsToRemove = Array.from(selectedItems).filter((item) => {
        // Basic properties must match
        if (
          item.code !== itemToRemove.code ||
          item.owner !== itemToRemove.owner
        ) {
          return false;
        }

        // Location-specific properties must match
        if (item.location !== itemToRemove.location) {
          return false;
        }

        // For stored items, check storage type and page
        if (item.location === ItemLocation.STORED) {
          if (item.stored !== itemToRemove.stored) {
            return false;
          }
          // For stash items, also check page number
          if (
            item.stored === ItemStorageType.STASH &&
            item.page !== itemToRemove.page
          ) {
            return false;
          }
        }

        // For equipped items, check mercenary and corpse properties
        if (item.location === ItemLocation.EQUIPPED) {
          if (
            item.mercenary !== itemToRemove.mercenary ||
            item.corpse !== itemToRemove.corpse
          ) {
            return false;
          }
        }

        return true;
      });
      unselectAll(itemsToRemove);
    },
    [selectedItems, unselectAll]
  );

  const transferItems = useCallback(async () => {
    if (!target) {
      setError("Please select where you want to transfer the items.");
      return;
    }
    if (!isStash(target) && !targetStorage) {
      setError(
        "Please select where you want to store the items on your character."
      );
      return;
    }
    setError(undefined);

    try {
      bulkTransferWithQuantities(
        target,
        items,
        transferQuantities,
        targetStorage
      );
      if (isPlugyStash(target) && (withOrganize || target.nonPlugY)) {
        organize(target, [], skipPages);
      }
      if (lastActivePlugyStashPage) {
        updateCharacterStashes(lastActivePlugyStashPage);
      }
      // Update the entire collection to ensure all changes are reflected
      await updateAllFiles(target);
      setSuccess(`${actualTransferCount} items transferred!`);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
        await rollback();
        setTarget(undefined);
      } else {
        throw e;
      }
    }
  }, [
    items,
    skipPages,
    target,
    targetStorage,
    updateAllFiles,
    rollback,
    withOrganize,
    lastActivePlugyStashPage,
    transferQuantities,
    actualTransferCount,
  ]);

  if (items.length === 0 && !error && !success) {
    return (
      <p>
        You have not selected any items yet. Go through your{" "}
        <a href="#collection">Collection</a> or{" "}
        <a href="#characters">Characters</a> and select the items you want to
        transfer.
      </p>
    );
  }

  let supportedStorageTypes: ItemStorageType[] | undefined;
  if (target && isCharacter(target)) {
    supportedStorageTypes = [ItemStorageType.INVENTORY, ItemStorageType.CUBE];
    if (!lastActivePlugyStashPage?.has(target)) {
      supportedStorageTypes.push(ItemStorageType.STASH);
    }
  }

  return (
    <div id="transfer-items">
      <p>
        You have currently selected <span class="magic">{items.length}</span>{" "}
        items (will transfer <span class="magic">{actualTransferCount}</span>{" "}
        items based on quantities).
      </p>
      <p>Select where you want to transfer them:</p>
      <div class="selectors">
        <OwnerSelector selected={target} onChange={setTarget} />
        {target &&
          (isCharacter(target) ||
            (isPlugyStash(target) && !target.nonPlugY)) && (
            <div class="arrow">&#8594;</div>
          )}
        {supportedStorageTypes && (
          <ul id="storage-selector">
            {supportedStorageTypes.map((storage) => (
              <li>
                <label>
                  <input
                    type="radio"
                    name="storage"
                    checked={targetStorage === storage}
                    onChange={() => setTargetStorage(storage)}
                  />{" "}
                  {storage === ItemStorageType.INVENTORY
                    ? "Inventory"
                    : storage === ItemStorageType.CUBE
                    ? "Cube"
                    : "Stash"}
                </label>
              </li>
            ))}
          </ul>
        )}
        {target && isPlugyStash(target) && !target.nonPlugY && (
          <ul id="organize-selector">
            <li>
              <label>
                <input
                  type="radio"
                  name="organize"
                  checked={!withOrganize}
                  onChange={() => setWithOrganize(false)}
                />{" "}
                Just add the items at the end of {target.personal ? "" : "my"}{" "}
                <PrettyOwnerName owner={target} />.
              </label>
            </li>
            <li>
              <label>
                <input
                  type="radio"
                  name="organize"
                  checked={withOrganize}
                  onChange={() => setWithOrganize(true)}
                />{" "}
                Organize {target.personal ? "" : "my"}{" "}
                <PrettyOwnerName owner={target} /> for me
              </label>
              , except the first{" "}
              <input
                type="number"
                min={0}
                max={99}
                value={skipPages}
                onChange={numberInputChangeHandler((value) =>
                  setSkipPages(value)
                )}
              />{" "}
              pages.
            </li>
          </ul>
        )}
      </div>
      <p>
        <button class="button" onClick={transferItems}>
          Transfer my items
        </button>
        <button class="button secondary" onClick={resetQuantities}>
          Reset quantities
        </button>
        <span class="error danger">{error}</span>
        <span class="success">{success}</span>
      </p>

      <h4>Selected items</h4>
      <TransferItemsTable
        items={items}
        sortField="none"
        sortDirection="asc"
        onSort={() => {
          // No-op since this table doesn't need sorting
        }}
        onRemoveItem={handleRemoveItem}
      />
    </div>
  );
}
