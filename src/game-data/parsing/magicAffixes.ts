import { readGameFile, writeJson } from "./files";
import { MagicAffix } from "..";
import { getString } from "../strings";

export async function magicAffixesToJson() {
  // AutoMagic has the mods class-specific items get on top of their affixes
  for (const file of ["MagicPrefix", "MagicSuffix", "AutoMagic"]) {
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
