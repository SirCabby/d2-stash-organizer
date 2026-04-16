import "./Settings.css";
import { useContext, useCallback } from "preact/hooks";
import { SettingsContext } from "./SettingsContext";
import { CollectionContext } from "../store/CollectionContext";
import { downloadAllFiles } from "../store/downloader";
import { toSaveFile } from "../store/parser";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import { getBase } from "../../scripts/items/getBase";
import { addPage } from "../../scripts/plugy-stash/addPage";
import { organize } from "../../scripts/grail/organize";
import { isPlugyStash, isD2rStash } from "../../scripts/save-file/ownership";
import { Item } from "../../scripts/items/types/Item";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../scripts/plugy-stash/dimensions";
import { postProcessItem } from "../../scripts/items/post-processing/postProcessItem";
import { getAllItems } from "../../scripts/plugy-stash/getAllItems";
import {
  topOffDedicatedTab,
  refillDedicatedTab,
} from "../../scripts/d2r-stash/dedicatedTab";

export function Settings() {
  const { accessibleFont, toggleAccessibleFont } = useContext(SettingsContext);
  const { owners, setCollection } = useContext(CollectionContext);

  const handleSave = useCallback(async () => {
    if (owners.length === 0) {
      alert("No save files to download.");
      return;
    }

    const saveFiles = owners.map((owner) => toSaveFile(owner));
    await downloadAllFiles(saveFiles);
  }, [owners]);

  // Set Items 100 handler
  const handleSetItems100 = useCallback(() => {
    if (owners.length === 0) {
      alert("No save files loaded.");
      return;
    }
    let pagesCreated = 0;
    let itemsPlaced = 0;
    let slotsMaxed = 0;
    const newOwners = owners.map((owner) => {
      if (isPlugyStash(owner)) {
        // 1. Gather all simple items by code
        const allSimple = owner.pages.flatMap((page) =>
          page.items.filter(isSimpleItem)
        );
        const byCode = new Map<string, Item[]>();
        for (const item of allSimple) {
          if (!byCode.has(item.code)) byCode.set(item.code, []);
          byCode.get(item.code)!.push(item);
        }
        // 2. Remove all simple items from all pages
        for (const page of owner.pages) {
          page.items = page.items.filter((item) => !isSimpleItem(item));
        }
        // 3. For each code, create a new page and fill it
        for (const [code, items] of byCode.entries()) {
          const template = items[0];
          const base = getBase(template);
          const w = base.width;
          const h = base.height;
          const maxPerPage =
            Math.floor(PAGE_WIDTH / w) * Math.floor(PAGE_HEIGHT / h);
          const page = addPage(owner, template.name || code);
          let maxId = Math.max(0, ...allSimple.map((i) => i.id ?? 0));
          let placed = 0;
          outer: for (let row = 0; row <= PAGE_HEIGHT - h; row++) {
            for (let col = 0; col <= PAGE_WIDTH - w; col++) {
              if (placed >= maxPerPage) break outer;
              // Check for collision
              if (
                page.items.some((existing) => {
                  const eb = getBase(existing);
                  return (
                    col < existing.column + eb.width &&
                    col + w > existing.column &&
                    row < existing.row + eb.height &&
                    row + h > existing.row
                  );
                })
              )
                continue;
              const newItem = {
                ...template,
                id: ++maxId,
                row: row,
                column: col,
              } as import("../../scripts/items/types/Item").Item;
              page.items.push(newItem);
              placed++;
              itemsPlaced++;
            }
          }
          pagesCreated++;
        }
        organize(owner);
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
        const topped = topOffDedicatedTab(owner);
        slotsMaxed += topped;
        return owner;
      }
      return owner;
    });
    setCollection(newOwners);
    const parts: string[] = [];
    if (pagesCreated > 0 || itemsPlaced > 0) {
      parts.push(
        `Created ${pagesCreated} pages and placed ${itemsPlaced} simple items`
      );
    }
    if (slotsMaxed > 0) {
      parts.push(`Maxed ${slotsMaxed} dedicated tab slot(s) to 99`);
    }
    alert(parts.length > 0 ? parts.join(". ") + "." : "Nothing to top off.");
  }, [owners, setCollection]);

  // Repair All handler
  const handleRepairAll = useCallback(() => {
    if (owners.length === 0) {
      alert("No save files loaded.");
      return;
    }
    let repairedCount = 0;
    const repairItem = (item: Item) => {
      if (item.durability && item.durability.length === 2) {
        if (typeof item.extraDurability === "number") {
          item.durability[0] = item.durability[1] + item.extraDurability;
        } else {
          item.durability[0] = item.durability[1];
        }
        repairedCount++;
      }
      if (item.modifiers) {
        for (const mod of item.modifiers) {
          if (
            typeof mod.charges === "number" &&
            typeof mod.maxCharges === "number" &&
            mod.charges !== mod.maxCharges
          ) {
            mod.charges = mod.maxCharges;
            repairedCount++;
          }
        }
      }
      if (item.filledSockets) {
        for (const socketed of item.filledSockets) {
          repairItem(socketed);
        }
      }
    };
    const newOwners = owners.map((owner) => {
      const items = getAllItems(owner);
      for (const item of items) {
        repairItem(item);
      }
      return owner;
    });
    setCollection(newOwners);
    alert(`Repaired ${repairedCount} durability/charges on all items.`);
  }, [owners, setCollection]);

  const handleRefillStash = useCallback(() => {
    if (owners.length === 0) {
      alert("No save files loaded.");
      return;
    }
    let totalSlots = 0;
    const newOwners = owners.map((owner) => {
      if (isD2rStash(owner) && owner.variant === "rotw") {
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
    setCollection(newOwners);
    alert(
      totalSlots > 0
        ? `Refilled ${totalSlots} dedicated tab slot(s) to 99.`
        : "No D2R RotW stash found to refill."
    );
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
