import { useContext } from "preact/hooks";
import { CollectionContext } from "../store/CollectionContext";
import {
  areDownloadsBlocked,
  isFileSystemAccessAvailable,
} from "../store/saveLocation";

/** Tells where saving will put the save files. */
export function SaveDestination() {
  const { owners, saveLocation } = useContext(CollectionContext);
  if (owners.length === 0) {
    return null;
  }

  if (!isFileSystemAccessAvailable()) {
    return (
      <p class="sidenote">
        {areDownloadsBlocked()
          ? "This browser can't save files from GameStateTracker's embedded view. Open this page in its own tab to download them, or use Chrome or Edge to save straight back to your save folder."
          : "Saving downloads your files. Chrome and Edge can save straight back to your save folder instead."}
      </p>
    );
  }

  const { folder, files } = saveLocation;
  const pickedOneByOne = Object.keys(files).length > 0;
  if (folder) {
    return (
      <p class="sidenote">
        Saving writes your files straight back to the{" "}
        <span class="magic">{folder.name}</span> folder
        {pickedOneByOne &&
          ", and the files you selected one by one back to where they came from"}
        . Close the game before saving.
      </p>
    );
  }
  return (
    <p class="sidenote">
      {pickedOneByOne
        ? "Saving writes each file straight back to where you selected it. Close the game before saving."
        : "Upload your save folder again, so that saving knows where your files belong."}
    </p>
  );
}
