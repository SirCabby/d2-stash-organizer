import { toSaveFile } from "./parser";
import { getSavedStashes, writeAllFiles, writeSaveFile } from "./store";
import { downloadAllFiles, downloadFile } from "./downloader";
import { useCallback, useContext } from "preact/hooks";
import { CollectionContext } from "./CollectionContext";
import { ItemsOwner } from "../../scripts/save-file/ownership";

export function useUpdateCollection() {
  const { owners, setCollection, setSingleFile } =
    useContext(CollectionContext);

  const updateAllFiles = useCallback(
    async function (newOwner: ItemsOwner) {
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
      await downloadAllFiles(saveFiles);
      setCollection(allOwners);
    },
    [owners, setCollection]
  );

  const updateSingleFile = useCallback(
    async function (owner: ItemsOwner) {
      const saveFile = toSaveFile(owner);
      await writeSaveFile(saveFile);
      downloadFile(saveFile, saveFile.name);
      // Set the state to force a re-render of the app.
      setSingleFile(owner);
    },
    [setSingleFile]
  );

  const rollback = useCallback(() => {
    return getSavedStashes().then(setCollection);
  }, [setCollection]);

  return { updateAllFiles, updateSingleFile, rollback };
}
