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
import { isPlugyStash } from "../../scripts/save-file/ownership";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../scripts/plugy-stash/dimensions";
import { D2R_STASH_HEIGHT, D2R_STASH_WIDTH } from "../../scripts/character/dimensions";
import { findSpot } from "../../scripts/items/moving/findSpot";
import { postProcessStash as postProcessPlugyStash } from "../../scripts/plugy-stash/parsing/postProcessStash";
import { postProcessStash as postProcessD2rStash } from "../../scripts/d2r-stash/parsing/postProcessStash";

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
    const newOwners = owners.map((owner) => {
      if (isPlugyStash(owner)) {
        // 1. Gather all simple items by code
        const allSimple = owner.pages.flatMap((page) => page.items.filter(isSimpleItem));
        const byCode = new Map();
        for (const item of allSimple) {
          if (!byCode.has(item.code)) byCode.set(item.code, []);
          byCode.get(item.code).push(item);
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
          const maxPerPage = Math.floor(PAGE_WIDTH / w) * Math.floor(PAGE_HEIGHT / h);
          const page = addPage(owner, template.name || code) as { items: import("../../scripts/items/types/Item").Item[] };
          let maxId = Math.max(0, ...allSimple.map(i => i.id ?? 0));
          let placed = 0;
          outer: for (let row = 0; row <= PAGE_HEIGHT - h; row++) {
            for (let col = 0; col <= PAGE_WIDTH - w; col++) {
              if (placed >= maxPerPage) break outer;
              // Check for collision
              if (page.items.some(existing => {
                const eb = getBase(existing);
                return (
                  col < existing.column + eb.width &&
                  col + w > existing.column &&
                  row < existing.row + eb.height &&
                  row + h > existing.row
                );
              })) continue;
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
        postProcessPlugyStash(owner);
        organize(owner);
        return owner;
      }
      return owner;
    });
    setCollection(newOwners);
    alert(`Created ${pagesCreated} pages and placed ${itemsPlaced} simple items (one page per item code).`);
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
    </div>
  );
}
