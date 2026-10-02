import "./Settings.css";
import { useContext, useCallback } from "preact/hooks";
import { SettingsContext } from "./SettingsContext";
import { CollectionContext } from "../store/CollectionContext";
import { useUpdateCollection } from "../store/useUpdateCollection";
import { SaveDestination } from "../save-files/SaveDestination";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import { getBase } from "../../scripts/items/getBase";
import { organize } from "../../scripts/grail/organize";
import { isPlugyStash, isD2rStash } from "../../scripts/save-file/ownership";
import { Item } from "../../scripts/items/types/Item";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../scripts/plugy-stash/dimensions";
import { postProcessItem } from "../../scripts/items/post-processing/postProcessItem";
import { getAllItems } from "../../scripts/plugy-stash/getAllItems";
import { repairItem } from "../../scripts/items/repairItem";
import { fixDuplicateIds } from "../../scripts/items/itemIds";
import { cloneItem } from "../../scripts/items/moving/copyItemTo";
import { isUnreadable } from "../store/parser";
import { updateCharacterStashes } from "../store/plugyDuplicates";
import {
  topOffDedicatedTab,
  refillDedicatedTab,
} from "../../scripts/d2r-stash/dedicatedTab";

export function Settings() {
  const { accessibleFont, toggleAccessibleFont } = useContext(SettingsContext);
  const { owners, allItems, lastActivePlugyStashPage, setCollection } =
    useContext(CollectionContext);
  const { saveAllFiles } = useUpdateCollection();

  const handleSave = useCallback(async () => {
    if (owners.length === 0) {
      alert("No save files to save.");
      return;
    }

    try {
      await saveAllFiles();
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message);
      } else {
        throw e;
      }
    }
  }, [owners, saveAllFiles]);

  // Set Items 100 handler
  const handleSetItems100 = useCallback(() => {
    if (owners.length === 0) {
      alert("No save files loaded.");
      return;
    }
    let itemsAdded = 0;
    let typesFilled = 0;
    let slotsMaxed = 0;
    let stashFound = false;
    const newOwners = owners.map((owner) => {
      if (isPlugyStash(owner)) {
        stashFound = true;
        const byCode = new Map<string, Item[]>();
        for (const page of owner.pages) {
          for (const item of page.items.filter(isSimpleItem)) {
            if (!byCode.has(item.code)) byCode.set(item.code, []);
            byCode.get(item.code)!.push(item);
          }
        }
        // Fill each item type up to a full page with copies of its first item.
        // Types that already fill a page are left as they are.
        const copies: Item[] = [];
        for (const items of byCode.values()) {
          const { width, height } = getBase(items[0]);
          const fullPage =
            Math.floor(PAGE_WIDTH / width) * Math.floor(PAGE_HEIGHT / height);
          if (items.length >= fullPage) continue;
          for (let i = items.length; i < fullPage; i++) {
            copies.push(cloneItem(items[0]));
          }
          typesFilled++;
        }
        if (copies.length === 0) return owner;
        itemsAdded += copies.length;
        organize(owner, copies);
        // Set correct owner/page after organize reshuffles items. Do NOT call
        // postProcessItem here -- items were already post-processed during
        // initial parse, and postProcessItem is not idempotent.
        for (let i = 0; i < owner.pages.length; i++) {
          for (const item of owner.pages[i].items) {
            item.owner = owner;
            item.page = i;
          }
        }
        return owner;
      }
      if (isD2rStash(owner) && owner.variant === "rotw") {
        stashFound = true;
        slotsMaxed += topOffDedicatedTab(owner);
        return owner;
      }
      return owner;
    });
    const parts: string[] = [];
    if (itemsAdded > 0) {
      parts.push(
        `Added ${itemsAdded} simple item(s), filling ${typesFilled} item type(s) to a full page`
      );
    }
    if (slotsMaxed > 0) {
      parts.push(`Maxed ${slotsMaxed} dedicated tab slot(s) to 99`);
    }
    if (parts.length > 0) {
      setCollection(newOwners);
      alert(parts.join(". ") + ".");
    } else {
      alert(
        stashFound
          ? "Nothing to top off: everything is already full."
          : "No stash found to top off."
      );
    }
  }, [owners, setCollection]);

  // Repair All handler
  const handleRepairAll = useCallback(() => {
    if (owners.length === 0) {
      alert("No save files loaded.");
      return;
    }
    let repairedCount = 0;
    const repair = (item: Item) => {
      repairedCount += repairItem(item);
      for (const socketed of item.filledSockets ?? []) {
        repair(socketed);
      }
    };
    const newOwners = owners.map((owner) => {
      // Files that couldn't be fully read can't be saved with changes
      if (!isUnreadable(owner)) {
        getAllItems(owner).forEach(repair);
      }
      return owner;
    });
    // Copies made before copying gave them IDs of their own
    const newIdsCount = fixDuplicateIds(
      allItems,
      (owner) => !isUnreadable(owner)
    );
    if (newIdsCount > 0 && lastActivePlugyStashPage) {
      updateCharacterStashes(lastActivePlugyStashPage);
    }
    setCollection(newOwners);
    let message = `Repaired ${repairedCount} durability/charges/quantities on all items.`;
    if (newIdsCount > 0) {
      message += ` Gave new IDs to ${newIdsCount} copied item(s), so that the game doesn't delete them as duplicates.`;
    }
    alert(message);
  }, [owners, allItems, lastActivePlugyStashPage, setCollection]);

  const handleRefillStash = useCallback(() => {
    if (owners.length === 0) {
      alert("No save files loaded.");
      return;
    }
    let totalSlots = 0;
    let rotwFound = false;
    const newOwners = owners.map((owner) => {
      if (isD2rStash(owner) && owner.variant === "rotw") {
        rotwFound = true;
        const before = owner.dedicatedTab?.length ?? 0;
        totalSlots += refillDedicatedTab(owner);
        // Only post-process newly created dedicated tab items; existing page
        // items were already post-processed during initial parse.
        if (owner.dedicatedTab) {
          for (const slot of owner.dedicatedTab.slice(before)) {
            slot.item.owner = owner;
            postProcessItem(slot.item);
          }
        }
      }
      return owner;
    });
    if (totalSlots > 0) {
      setCollection(newOwners);
      alert(`Refilled ${totalSlots} dedicated tab slot(s) to 99.`);
    } else {
      alert(
        rotwFound
          ? "Nothing to refill: the RotW stash tabs already hold 99 of everything."
          : "No D2R RotW stash found to refill."
      );
    }
  }, [owners, setCollection]);

  return (
    <div>
      <p>
        <label>
          <input
            type="checkbox"
            name="font"
            checked={!accessibleFont}
            onChange={toggleAccessibleFont}
          />{" "}
          Use Diablo font
        </label>
      </p>
      <p>
        <button
          class="button"
          onClick={handleSave}
          disabled={owners.length === 0}
        >
          Save
        </button>
      </p>
      <SaveDestination />
      <p>
        <button
          class="button"
          onClick={handleSetItems100}
          disabled={owners.length === 0}
        >
          Top Off Items
        </button>
      </p>
      <p>
        <button
          class="button"
          onClick={handleRefillStash}
          disabled={owners.length === 0}
        >
          Refill Shared Stash
        </button>
      </p>
      <p>
        <button
          class="button"
          onClick={handleRepairAll}
          disabled={owners.length === 0}
        >
          Repair All
        </button>
      </p>
    </div>
  );
}
