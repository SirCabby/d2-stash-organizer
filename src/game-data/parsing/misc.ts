import { readGameFile, writeJson } from "./files";
import { Misc } from "../types";
import { getString } from "../strings";

export async function miscToJson() {
  const misc: Record<string, Misc> = {};
  for (const line of await readGameFile("Misc")) {
    const code = line[15].trim();
    misc[code] = {
      name: getString(line[17].trim()),
      type: line[32].trim(),
      tier: 0,
      maxSockets: Number(line[22]),
      indestructible: line[12].trim() === "1",
      width: Number(line[19]),
      height: Number(line[20]),
      qlevel: Number(line[3]),
      levelReq: Number(line[5]),
      stackable: line[43] === "1",
      trackQuestDifficulty: line[48] === "1" || undefined,
    };
    // Token of absolution name may have the description before a \n separator
    if (code === "toa") {
      const parts = misc[code].name.split("\\n");
      if (parts.length > 1) {
        misc[code].name = parts[1];
      }
    }
  }
  await writeJson("Misc", misc);
  return misc;
}
