import { readGameFile, writeJson } from "./files";
import { MagicAffix } from "..";
import { getString } from "../strings";

export async function magicAffixesToJson() {
  for (const file of ["MagicPrefix", "MagicSuffix"]) {
    const table = await readGameFile(file);
    // Index 0 is unused, suffixes start at 1?
    const affixes: MagicAffix[] = [{ name: "", reqlevel: 1 }];
    for (const line of table) {
      affixes.push({
        name: getString(line[0].trim()),
        reqlevel: Number(line[6]),
      });
    }
    await writeJson(file, affixes);
  }
}
