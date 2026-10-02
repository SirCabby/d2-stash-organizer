import { readFile, writeFile } from "fs/promises";

export const TXT_FOLDER = "game-data/txt";
export const JSON_FOLDER = "game-data/json";
export const ROTW_STRINGS_FOLDER = "game-data/txt-rotw/strings";

export async function readGameFile(filename: string) {
  const raw = await readFile(`${TXT_FOLDER}/${filename}.txt`, {
    encoding: "utf-8",
  });
  return raw
    .trim()
    .split("\n")
    .slice(1)
    .filter((line) => !line.startsWith("Expansion"))
    .map((line) => line.split("\t"));
}

/**
 * The IDs of the strings in one of D2R's string files, by key. The .txt
 * strings made from these files leave them out.
 */
export async function readStringIds(filename: string) {
  const raw = await readFile(`${ROTW_STRINGS_FOLDER}/${filename}.json`, {
    encoding: "utf-8",
  });
  const strings = JSON.parse(raw.replace(/^\uFEFF/, "")) as {
    id: number;
    Key: string;
  }[];
  return Object.fromEntries(strings.map(({ id, Key }) => [Key, id]));
}

export async function writeJson(filename: string, data: unknown) {
  await writeFile(
    `${JSON_FOLDER}/${filename}.json`,
    JSON.stringify(data, undefined, 2)
  );
}
