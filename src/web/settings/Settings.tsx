import "./Settings.css";
import { useContext, useCallback } from "preact/hooks";
import { SettingsContext } from "./SettingsContext";
import { CollectionContext } from "../store/CollectionContext";
import { downloadAllFiles } from "../store/downloader";
import { toSaveFile } from "../store/parser";

export function Settings() {
  const { accessibleFont, toggleAccessibleFont } = useContext(SettingsContext);
  const { owners } = useContext(CollectionContext);

  const handleSave = useCallback(async () => {
    if (owners.length === 0) {
      alert("No save files to download.");
      return;
    }

    const saveFiles = owners.map((owner) => toSaveFile(owner));
    await downloadAllFiles(saveFiles);
  }, [owners]);

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
    </div>
  );
}
