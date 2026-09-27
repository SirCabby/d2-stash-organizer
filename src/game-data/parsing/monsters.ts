import { readGameFile, writeJson } from "./files";
import { getString } from "../strings";

export async function monstersToJson() {
  // Mods like "Reanimate as" refer to monsters by their *hcIdx
  const names: string[] = [];
  for (const line of await readGameFile("MonStats")) {
    names[Number(line[1])] = getString(line[5].trim());
  }
  await writeJson("Monsters", names);
}
