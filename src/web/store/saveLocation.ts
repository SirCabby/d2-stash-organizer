// Remembers where the loaded save files live on disk, so saving writes them
// straight back there instead of downloading them. This relies on the File
// System Access API, which only Chromium browsers (Chrome, Edge...) implement.
// Everywhere else, saving falls back to downloading the files.
//
// It also works when GameStateTracker embeds this site as a companion site, as
// long as GameStateTracker serves it from a local path (its own origin):
// Chromium refuses to show file pickers in cross-origin iframes, and
// GameStateTracker's iframe sandbox blocks downloads.
//
// TypeScript's DOM typings don't cover this API yet, so the few members we use
// are declared here.

type PermissionMode = "read" | "readwrite";

interface HandlePermissions {
  queryPermission?(descriptor: {
    mode: PermissionMode;
  }): Promise<PermissionState>;
  requestPermission?(descriptor: {
    mode: PermissionMode;
  }): Promise<PermissionState>;
}

interface WritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

export interface FileHandle extends HandlePermissions {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFileStream>;
}

export interface DirectoryHandle extends HandlePermissions {
  readonly kind: "directory";
  readonly name: string;
  values(): AsyncIterableIterator<FileHandle | DirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileHandle>;
  removeEntry(name: string): Promise<void>;
}

interface FilePickerWindow {
  showDirectoryPicker(options?: { id?: string }): Promise<DirectoryHandle>;
  showOpenFilePicker(options?: {
    id?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
    excludeAcceptAllOption?: boolean;
  }): Promise<FileHandle[]>;
}

/** Where the loaded save files came from, which is where saving puts them. */
export interface SaveLocation {
  /** Folder of the last "upload all my save files". New files go here too. */
  folder?: DirectoryHandle;
  /** Files uploaded one at a time, by name. They take precedence over `folder`. */
  files: Record<string, FileHandle | undefined>;
  /**
   * Each file's last modification on disk when it was loaded or saved, by
   * name, to notice when the game saved it since.
   */
  versions: Record<string, number | undefined>;
}

export const NO_SAVE_LOCATION: SaveLocation = { files: {}, versions: {} };

export const SAVE_FILE_EXTENSIONS = [".sss", ".d2x", ".d2s", ".d2i"];

// Makes the browser reopen the pickers in the folder picked last time.
const PICKER_ID = "d2-saves";

export function isSaveFileName(name: string) {
  return SAVE_FILE_EXTENSIONS.some((extension) => name.endsWith(extension));
}

/**
 * Whether this page can pick files and write back to them: false outside
 * Chromium, and in cross-origin iframes where Chromium refuses file pickers.
 */
export function isFileSystemAccessAvailable() {
  const picker = window as unknown as Partial<FilePickerWindow>;
  if (
    typeof picker.showDirectoryPicker !== "function" ||
    typeof picker.showOpenFilePicker !== "function"
  ) {
    return false;
  }
  // Inside an iframe, frameElement is only visible to a same-origin parent.
  return window.top === window || window.frameElement !== null;
}

/**
 * Whether we are in an iframe whose sandbox blocks downloads, like
 * GameStateTracker's companion site viewer. Only detectable when the parent
 * page shares our origin.
 */
export function areDownloadsBlocked() {
  // frameElement belongs to the parent page, so `instanceof` would not work.
  const sandbox = window.frameElement?.getAttribute("sandbox");
  return (
    typeof sandbox === "string" &&
    !sandbox.split(/\s+/).includes("allow-downloads")
  );
}

function pickerWindow() {
  return window as unknown as FilePickerWindow;
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : undefined;
}

/** Resolves undefined when the user closes the picker without choosing. */
async function cancellable<T>(pick: () => Promise<T>) {
  try {
    return await pick();
  } catch (e) {
    if (errorName(e) === "AbortError") {
      return undefined;
    }
    throw e;
  }
}

/** Copies the file in memory, so it no longer depends on the file on disk. */
async function readFile(handle: FileHandle) {
  const file = await handle.getFile();
  return new File([await file.arrayBuffer()], file.name, {
    lastModified: file.lastModified,
  });
}

/** Asks for a save folder, and reads the save files directly inside it. */
export async function pickSaveFolder() {
  const folder = await cancellable(() =>
    pickerWindow().showDirectoryPicker({ id: PICKER_ID })
  );
  if (!folder) {
    return undefined;
  }
  const files: File[] = [];
  for await (const entry of folder.values()) {
    // Only the folder's own files, in case there is a backup folder inside.
    if (entry.kind === "file" && isSaveFileName(entry.name)) {
      files.push(await readFile(entry));
    }
  }
  return { folder, files };
}

/** Asks for a single save file. */
export async function pickSaveFile() {
  const handles = await cancellable(() =>
    pickerWindow().showOpenFilePicker({
      id: PICKER_ID,
      types: [
        {
          description: "Diablo 2 save files",
          accept: { "application/octet-stream": SAVE_FILE_EXTENSIONS },
        },
      ],
      excludeAcceptAllOption: true,
    })
  );
  const handle = handles?.[0];
  if (!handle) {
    return undefined;
  }
  return { handle, file: await readFile(handle) };
}

/** `files` were just loaded from `folder`, or from somewhere unknown. */
export function folderLocation(
  files: File[],
  folder?: DirectoryHandle
): SaveLocation {
  const versions: SaveLocation["versions"] = {};
  if (folder) {
    for (const file of files) {
      versions[file.name] = file.lastModified;
    }
  }
  return { folder, files: {}, versions };
}

/** `file` was just loaded from `handle`, or from somewhere unknown. */
export function withFile(
  location: SaveLocation,
  file: File,
  handle?: FileHandle
): SaveLocation {
  const files = { ...location.files };
  const versions = { ...location.versions };
  if (handle) {
    files[file.name] = handle;
    versions[file.name] = file.lastModified;
  } else {
    delete files[file.name];
    delete versions[file.name];
  }
  return { ...location, files, versions };
}

async function hasWritePermission(handle: FileHandle | DirectoryHandle) {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") {
    return true;
  }
  try {
    return (
      (await handle.requestPermission({ mode: "readwrite" })) === "granted"
    );
  } catch {
    // Chromium only prompts shortly after a click, which may have expired.
    return false;
  }
}

/** The file named `name` in `folder`, or undefined if there is none. */
async function findInFolder(folder: DirectoryHandle, name: string) {
  try {
    return await folder.getFileHandle(name);
  } catch (e) {
    if (errorName(e) === "NotFoundError") {
      return undefined;
    }
    throw e;
  }
}

/** When the file was last modified on disk, or undefined if it is gone. */
async function lastModifiedOnDisk(handle: FileHandle | undefined) {
  try {
    return handle && (await handle.getFile()).lastModified;
  } catch (e) {
    if (errorName(e) === "NotFoundError") {
      return undefined;
    }
    throw e;
  }
}

/**
 * Writes the files back where they were loaded from, and returns the location
 * with their new versions.
 *
 * Nothing is written unless all of it is safe to write: every file has a known
 * destination we may write to, and none changed on disk since it was loaded or
 * saved (the game saving it would have made our copy stale). Then every file
 * is written in full before any of them replaces the one on disk, as saving
 * some characters but not others would duplicate or lose the items moved
 * between them.
 */
export async function writeToSaveLocation(
  location: SaveLocation,
  files: File[]
): Promise<SaveLocation> {
  const { folder } = location;
  if (!folder && files.some((file) => !location.files[file.name])) {
    throw new Error(
      "Nothing was saved: the organizer doesn't know where your save files are. Upload your save folder again, then redo your changes."
    );
  }

  // Ask for permission first, while the click that started the save still
  // allows permission prompts.
  const destinations = new Set(
    files.map((file) => location.files[file.name] ?? folder)
  );
  for (const destination of destinations) {
    if (destination && !(await hasWritePermission(destination))) {
      throw new Error(
        `Nothing was saved: permission to write to ${destination.name} was not granted.`
      );
    }
  }

  const handles: (FileHandle | undefined)[] = [];
  for (const file of files) {
    // Without a handle of its own, the file belongs in the folder (see above).
    const handle =
      location.files[file.name] ?? (await findInFolder(folder!, file.name));
    if ((await lastModifiedOnDisk(handle)) !== location.versions[file.name]) {
      throw new Error(
        `Nothing was saved: ${file.name} changed on disk since it was uploaded, probably because the game saved it. Upload your save files again, then redo your changes.`
      );
    }
    handles.push(handle);
  }

  const streams: WritableFileStream[] = [];
  const created: string[] = [];
  let current = files[0];
  try {
    for (const [i, file] of files.entries()) {
      current = file;
      let handle = handles[i];
      if (!handle) {
        handle = await folder!.getFileHandle(file.name, { create: true });
        handles[i] = handle;
        created.push(file.name);
      }
      // Writes go to a temporary copy until the stream is closed.
      const stream = await handle.createWritable();
      streams.push(stream);
      await stream.write(file);
    }
  } catch (e) {
    await Promise.all(streams.map((stream) => stream.abort().catch(() => 0)));
    await Promise.all(
      created.map((name) => folder?.removeEntry(name).catch(() => 0))
    );
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Nothing was saved: could not write ${current.name}. ${reason}`
    );
  }

  const results = await Promise.allSettled(
    streams.map((stream) => stream.close())
  );
  const failed = files.filter((_, i) => results[i].status === "rejected");
  if (failed.length > 0) {
    const others =
      failed.length < files.length ? " The other files were saved." : "";
    throw new Error(
      `Could not save ${failed.map((file) => file.name).join(", ")}.${others}`
    );
  }

  const versions = { ...location.versions };
  for (const [i, file] of files.entries()) {
    versions[file.name] = await lastModifiedOnDisk(handles[i]);
  }
  return { ...location, versions };
}
