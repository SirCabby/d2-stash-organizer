import { parseSaveFile, toSaveFile } from "./parser";
import { NO_SAVE_LOCATION, SaveLocation } from "./saveLocation";

if (!window.indexedDB) {
  alert(
    "Your browser doesn't support a stable version of IndexedDB. " +
      "This application will not remember your stash between sessions."
  );
}

const OLD_STORE = "stash";
const STORE = "save_files";
// A single record: where the stored save files were loaded from.
const LOCATION_STORE = "save_location";
const LOCATION_KEY = "current";
const STORE_VERSION = 3;
const DB = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("D2StashOrganizer", STORE_VERSION);
  let backfill: Promise<void> | undefined;
  request.onerror = function () {
    reject("Unable to open IndexedDB");
  };
  request.onsuccess = function () {
    if (backfill) {
      backfill.finally(() => resolve(this.result));
    } else {
      resolve(this.result);
    }
  };
  request.onupgradeneeded = function (e) {
    const db = this.result;
    if (e.oldVersion < 2) {
      const storeCreation = db.createObjectStore(STORE, {
        keyPath: "name",
      });
      if (e.oldVersion < 1) {
        // Port the stash that was stored as JSON in local storage
        const oldSave = localStorage.getItem("stash");
        if (oldSave) {
          storeCreation.transaction.oncomplete = () => {
            // Small code duplication, but this is just legacy support that will go away
            db.transaction(STORE, "readwrite")
              .objectStore(STORE)
              .add(toSaveFile(JSON.parse(oldSave)));
          };
        }
      } else {
        // Port the only stash that was stored in the previous store
        backfill = new Promise<void>((resolve, reject) => {
          const v1Data = request.transaction!.objectStore(OLD_STORE).get(0);
          v1Data.onsuccess = function () {
            if (this.result) {
              const adding = request
                .transaction!.objectStore(STORE)
                .add(this.result);
              adding.onsuccess = () => resolve();
              adding.onerror = () => reject();
            } else {
              resolve();
            }
          };
          v1Data.onerror = () => reject();
        });
      }
    }
    if (e.oldVersion < 3) {
      db.createObjectStore(LOCATION_STORE);
    }
  };
});

export function readSaveFiles() {
  return DB.then(
    (db) =>
      new Promise<File[]>((resolve, reject) => {
        const request = db
          .transaction(STORE, "readonly")
          .objectStore(STORE)
          .getAll();
        request.onerror = function () {
          reject("Unable to read save files.");
        };
        request.onsuccess = function () {
          resolve(this.result);
        };
      })
  );
}

/**
 * Stores one save file. Pass `location` when the file was just uploaded, so
 * the save location is updated along with it.
 */
export function writeSaveFile(stash: File, location?: SaveLocation) {
  return DB.then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          location ? [STORE, LOCATION_STORE] : [STORE],
          "readwrite"
        );
        // Location first: if it can't be stored, it throws before the file
        // is queued, and nothing gets written.
        if (location) {
          transaction.objectStore(LOCATION_STORE).put(location, LOCATION_KEY);
        }
        transaction.objectStore(STORE).put(stash);
        transaction.onerror = function () {
          reject("Unable to store save file.");
        };
        transaction.oncomplete = function () {
          resolve();
        };
      })
  );
}

/**
 * Replaces all stored save files. Pass `location` when the files were just
 * uploaded, so the save location is replaced along with them.
 */
export function writeAllFiles(files: File[], location?: SaveLocation) {
  return DB.then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          location ? [STORE, LOCATION_STORE] : [STORE],
          "readwrite"
        );
        // Location first: if it can't be stored, it throws before the files
        // are queued, and nothing gets written.
        if (location) {
          transaction.objectStore(LOCATION_STORE).put(location, LOCATION_KEY);
        }
        const objectStore = transaction.objectStore(STORE);
        objectStore.clear();
        for (const file of files) {
          objectStore.add(file);
        }
        transaction.onerror = function () {
          reject("Unable to store save files.");
        };
        transaction.oncomplete = function () {
          resolve();
        };
      })
  );
}

export function readSaveLocation() {
  return DB.then(
    (db) =>
      new Promise<SaveLocation>((resolve, reject) => {
        const request = db
          .transaction(LOCATION_STORE, "readonly")
          .objectStore(LOCATION_STORE)
          .get(LOCATION_KEY);
        request.onerror = function () {
          reject("Unable to read the save location.");
        };
        request.onsuccess = function () {
          resolve(
            (this.result as SaveLocation | undefined) ?? NO_SAVE_LOCATION
          );
        };
      })
  );
}

export function writeSaveLocation(location: SaveLocation) {
  return DB.then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(LOCATION_STORE, "readwrite");
        transaction.objectStore(LOCATION_STORE).put(location, LOCATION_KEY);
        transaction.onerror = function () {
          reject("Unable to store the save location.");
        };
        transaction.oncomplete = function () {
          resolve();
        };
      })
  );
}

export async function getSavedStashes() {
  const files = await readSaveFiles();
  return Promise.all(files.map((file) => parseSaveFile(file)));
}
