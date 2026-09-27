import { writeAllFiles, writeSaveFile } from "../store/store";
import { RenderableProps } from "preact";
import { useCallback, useContext, useRef } from "preact/hooks";
import { CollectionContext } from "../store/CollectionContext";
import { parseSaveFile } from "../store/parser";
import {
  DirectoryHandle,
  FileHandle,
  folderLocation,
  isFileSystemAccessAvailable,
  isSaveFileName,
  pickSaveFile,
  pickSaveFolder,
  SAVE_FILE_EXTENSIONS,
  withFile,
} from "../store/saveLocation";

export interface FilePickerProps {
  folder: boolean;
}

export function FilePicker({
  folder,
  children,
}: RenderableProps<FilePickerProps>) {
  const { saveLocation, setCollection, setSingleFile, setSaveLocation } =
    useContext(CollectionContext);
  const input = useRef<HTMLInputElement>(null);

  // Files are parsed before anything is stored, so a file that fails to parse
  // leaves the current collection and its save location untouched.
  const loadFolder = useCallback(
    async (files: File[], handle?: DirectoryHandle) => {
      const owners = await Promise.all(
        files.map((file) => parseSaveFile(file))
      );
      const location = folderLocation(files, handle);
      await writeAllFiles(files, location);
      setCollection(owners);
      setSaveLocation(location);
    },
    [setCollection, setSaveLocation]
  );

  const loadFile = useCallback(
    async (file: File, handle?: FileHandle) => {
      const owner = await parseSaveFile(file);
      const location = withFile(saveLocation, file, handle);
      await writeSaveFile(file, location);
      setSingleFile(owner);
      setSaveLocation(location);
    },
    [saveLocation, setSingleFile, setSaveLocation]
  );

  // Pick with the File System Access API when possible, so that saving can
  // write the files back to the same place.
  const handleClick = useCallback(async () => {
    if (!isFileSystemAccessAvailable()) {
      input.current?.click();
    } else if (folder) {
      const picked = await pickSaveFolder();
      if (picked) {
        await loadFolder(picked.files, picked.folder);
      }
    } else {
      const picked = await pickSaveFile();
      if (picked) {
        await loadFile(picked.file, picked.handle);
      }
    }
  }, [folder, loadFolder, loadFile]);

  const handleChange = useCallback(async () => {
    if (input.current?.files) {
      const usableFiles = [];
      for (const file of input.current.files) {
        // Only use the root files in case there is a backup folder
        if (file.webkitRelativePath.split("/").length > 2) {
          continue;
        }
        if (isSaveFileName(file.name)) {
          usableFiles.push(file);
        }
      }
      if (folder) {
        await loadFolder(usableFiles);
      } else if (usableFiles.length > 0) {
        await loadFile(usableFiles[0]);
      }
      // Clear the input so we can re-upload the same file later.
      input.current.value = "";
    }
  }, [folder, loadFolder, loadFile]);

  const inputAttrs = folder
    ? { directory: true, webkitdirectory: true, multiple: true }
    : { accept: SAVE_FILE_EXTENSIONS.join(",") };

  return (
    <span class="filepicker">
      <button class={folder ? "button" : "button danger"} onClick={handleClick}>
        {children}
      </button>
      <input
        class="hidden"
        ref={input}
        type="file"
        {...inputAttrs}
        onChange={handleChange}
      />
    </span>
  );
}
