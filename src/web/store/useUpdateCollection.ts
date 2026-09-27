import { toSaveFile } from "./parser";
import {
  getSavedStashes,
  writeAllFiles,
  writeSaveFile,
  writeSaveLocation,
} from "./store";
import { downloadAllFiles, downloadFile } from "./downloader";
import { useCallback, useContext } from "preact/hooks";
import { CollectionContext } from "./CollectionContext";
import { ItemsOwner } from "../../scripts/save-file/ownership";
import {
  areDownloadsBlocked,
  isFileSystemAccessAvailable,
  writeToSaveLocation,
} from "./saveLocation";

const DOWNLOADS_BLOCKED = `\
Nothing was saved: this browser can't save files from GameStateTracker's \
embedded view.

Open this page in its own tab to download them, or use Chrome or Edge, \
which save straight back to your save folder.`;

export function useUpdateCollection() {
  const {
    owners,
    saveLocation,
    setCollection,
    setSingleFile,
    setSaveLocation,
  } = useContext(CollectionContext);

  // Writes the files back where they were uploaded from, or downloads them
  // when this browser can't write to disk.
  const saveToDisk = useCallback(
    async function (files: File[]) {
      if (!isFileSystemAccessAvailable()) {
        if (areDownloadsBlocked()) {
          throw new Error(DOWNLOADS_BLOCKED);
        }
        if (files.length === 1) {
          downloadFile(files[0], files[0].name);
        } else {
          await downloadAllFiles(files);
        }
        return;
      }
      // Remember the files' new versions, so the next save doesn't mistake
      // this one for the game changing them.
      const location = await writeToSaveLocation(saveLocation, files);
      await writeSaveLocation(location);
      setSaveLocation(location);
      alert(
        files.length === 1
          ? `Saved ${files[0].name}.`
          : `Saved ${files.length} files.`
      );
    },
    [saveLocation, setSaveLocation]
  );

  const updateAllFiles = useCallback(
    async function (newOwner: ItemsOwner, skipSave = false) {
      const allOwners = [...owners];

      // Find if the owner already exists and update it
      const existingIndex = allOwners.findIndex(
        (owner) => owner.filename === newOwner.filename
      );

      if (existingIndex >= 0) {
        // Update the existing owner with the new one
        allOwners[existingIndex] = newOwner;
      } else {
        // Add new owner if it doesn't exist
        allOwners.push(newOwner);
      }

      const saveFiles = allOwners.map((owner) => toSaveFile(owner));
      await writeAllFiles(saveFiles);
      if (!skipSave) {
        await saveToDisk(saveFiles);
      }
      setCollection(allOwners);
    },
    [owners, setCollection, saveToDisk]
  );

  const updateSingleFile = useCallback(
    async function (owner: ItemsOwner) {
      const saveFile = toSaveFile(owner);
      await writeSaveFile(saveFile);
      await saveToDisk([saveFile]);
      // Set the state to force a re-render of the app.
      setSingleFile(owner);
    },
    [setSingleFile, saveToDisk]
  );

  const saveCollection = useCallback(
    async function () {
      const saveFiles = owners.map((owner) => toSaveFile(owner));
      await writeAllFiles(saveFiles);
      setCollection([...owners]);
    },
    [owners, setCollection]
  );

  // Saves every file, so items moved between them are neither lost nor duplicated.
  const saveAllFiles = useCallback(
    async function () {
      const saveFiles = owners.map((owner) => toSaveFile(owner));
      await writeAllFiles(saveFiles);
      await saveToDisk(saveFiles);
    },
    [owners, saveToDisk]
  );

  const rollback = useCallback(() => {
    return getSavedStashes().then(setCollection);
  }, [setCollection]);

  return {
    updateAllFiles,
    updateSingleFile,
    saveCollection,
    saveAllFiles,
    rollback,
  };
}
