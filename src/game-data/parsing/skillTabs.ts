import { readGameFile, writeJson } from "./files";
import { SkillTab } from "../types";
import { getString } from "../strings";

export async function skillTabsToJson() {
  const tabs: SkillTab[] = [];
  // One line per class, in the same order as CHAR_CLASSES
  const charStats = await readGameFile("CharStats");
  charStats.forEach((line, charClass) => {
    // StrSkillTab1 to StrSkillTab3, which item mods number 0 to 2
    for (let tab = 0; tab < 3; tab++) {
      tabs.push({
        id: 8 * charClass + tab,
        skillsMod: getString(line[36 + tab].trim()),
        charClass,
      });
    }
  });
  await writeJson("SkillTabs", tabs);
}
