import { useCallback, useContext, useMemo, useState } from "preact/hooks";
import { SelectionContext } from "./SelectionContext";
import { TransferItemsTable } from "./TransferItemsTable";
import "./TransferItems.css";
import { CollectionContext } from "../store/CollectionContext";
import { SettingsContext } from "../settings/SettingsContext";
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
import { bulkCopyWithQuantities } from "../../scripts/items/moving/bulkCopyWithQuantities";
import { bulkDeleteWithQuantities } from "../../scripts/items/moving/bulkDeleteWithQuantities";
import { TransferQuantityContext } from "./TransferQuantityContext";
import { Item } from "../../scripts/items/types/Item";
import { groupItems } from "../items/groupItems";
import { isSimpleItem } from "../collection/utils/isSimpleItem";

export function TransferItems() {
  const { lastActivePlugyStashPage } = useContext(CollectionContext);
  const {
    transferWithOrganize: withOrganize,
    setTransferWithOrganize: setWithOrganize,
    transferSkipPages: skipPages,
    setTransferSkipPages: setSkipPages,
  } = useContext(SettingsContext);
  const { updateAllFiles, saveCollection, rollback } = useUpdateCollection();
  const { selectedItems, unselectAll } = useContext(SelectionContext);
  const { transferQuantities, resetQuantities } = useContext(
    TransferQuantityContext
  );
  const [target, setTarget] = useState<ItemsOwner>();
  const [targetStorage, setTargetStorage] = useState<ItemStorageType>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const items = useMemo(() => Array.from(selectedItems), [selectedItems]);

  const actualTransferCount = useMemo(() => {
    const groupedItems = groupItems(items);
    let total = 0;

    for (const itemGroup of groupedItems) {
      const representativeItem = itemGroup[0];

      if (isSimpleItem(representativeItem) && itemGroup.length > 1) {
        const transferQuantity = transferQuantities.get(
          representativeItem.code
        );
        if (
          transferQuantity &&
          transferQuantity > 0 &&
          transferQuantity < itemGroup.length
        ) {
          total += transferQuantity;
        } else {
          total += itemGroup.length;
        }
      } else {
        total += itemGroup.length;
      }
    }

    return total;
  }, [items, transferQuantities]);

  const handleRemoveItem = useCallback(
    (itemToRemove: Item) => {
      const itemsToRemove = Array.from(selectedItems).filter((item) => {
        if (
          item.code !== itemToRemove.code ||
          item.owner !== itemToRemove.owner
        ) {
          return false;
        }

        if (item.location !== itemToRemove.location) {
          return false;
        }

        if (item.location === ItemLocation.STORED) {
          if (item.stored !== itemToRemove.stored) {
            return false;
          }
          if (
            item.stored === ItemStorageType.STASH &&
            item.page !== itemToRemove.page
          ) {
            return false;
          }
        }

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

  const doTransferOrCopy = useCallback(
    async (copy: boolean) => {
      setError(undefined);
      setSuccess(undefined);

      if (!target) {
        setError(
          copy
            ? "Please select where you want to copy the items."
            : "Please select where you want to transfer the items."
        );
        return;
      }
      if (!isStash(target) && !targetStorage) {
        setError(
          "Please select where you want to store the items on your character."
        );
        return;
      }

      try {
        if (copy) {
          bulkCopyWithQuantities(
            target,
            items,
            transferQuantities,
            targetStorage
          );
        } else {
          bulkTransferWithQuantities(
            target,
            items,
            transferQuantities,
            targetStorage
          );
        }
        if (isPlugyStash(target) && (withOrganize || target.nonPlugY)) {
          organize(target, [], skipPages);
        }
        if (lastActivePlugyStashPage) {
          updateCharacterStashes(lastActivePlugyStashPage);
        }
        await updateAllFiles(target, true);
        setSuccess(
          copy
            ? `${actualTransferCount} items copied!`
            : `${actualTransferCount} items transferred!`
        );
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
          await rollback();
          setTarget(undefined);
        } else {
          throw e;
        }
      }
    },
    [
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
    ]
  );

  const doDelete = useCallback(async () => {
    setError(undefined);
    setSuccess(undefined);

    if (
      !window.confirm(
        `Are you sure you want to delete ${actualTransferCount} item(s)? This cannot be undone without re-uploading your save files.`
      )
    ) {
      return;
    }
    try {
      const deleted = bulkDeleteWithQuantities(items, transferQuantities);
      if (lastActivePlugyStashPage) {
        updateCharacterStashes(lastActivePlugyStashPage);
      }
      await saveCollection();
      setSuccess(`${deleted} items deleted!`);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
        await rollback();
      } else {
        throw e;
      }
    }
  }, [
    items,
    saveCollection,
    rollback,
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
        items (<span class="magic">{actualTransferCount}</span> based on
        quantities).
      </p>
      <p>Select where you want to transfer or copy them:</p>
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
      <p class="action-buttons">
        <button class="button" onClick={() => doTransferOrCopy(false)}>
          Transfer my items
        </button>
        <button class="button" onClick={() => doTransferOrCopy(true)}>
          Copy my items
        </button>
        <button class="button danger" onClick={doDelete}>
          Delete my items
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
