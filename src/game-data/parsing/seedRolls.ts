import { readFile } from "fs/promises";
import { TXT_FOLDER, writeJson } from "./files";
import { SeedRolls } from "../types";

// A game table's rows by column name
async function readTable(filename: string) {
  const raw = await readFile(`${TXT_FOLDER}/${filename}.txt`, {
    encoding: "utf-8",
  });
  const [head, ...lines] = raw
    .trim()
    .split("\n")
    .map((line) => line.replace(/\r$/, "").split("\t"));
  return lines.map((line) =>
    Object.fromEntries(
      head.map((name, i): [string, string] => [
        name.trim(),
        (line[i] ?? "").trim(),
      ])
    )
  );
}

/**
 * The bases' fields that decide what the game rolls from an item's seed (see
 * seeds.ts).
 */
export async function seedRollsToJson() {
  const types = new Map(
    (await readTable("ItemTypes")).map((row) => [row.Code, row])
  );
  // The game's item type test, through Equiv1 and Equiv2
  const isType = (code: string, want: string, depth = 0): boolean => {
    if (!code || depth > 10) return false;
    if (code === want) return true;
    const row = types.get(code);
    return (
      !!row &&
      (isType(row.Equiv1, want, depth + 1) ||
        isType(row.Equiv2, want, depth + 1))
    );
  };

  const rolls: Record<string, SeedRolls> = {};
  for (const table of ["Armor", "Weapons", "Misc"]) {
    for (const row of await readTable(table)) {
      if (!row.code) continue;
      const is = (want: string) =>
        isType(row.type, want) || isType(row.type2, want);
      const type = types.get(row.type);
      const kind =
        row.type === "gold"
          ? "gold"
          : type?.Quiver
          ? "quiver"
          : is("armo")
          ? "armor"
          : is("weap")
          ? "weapon"
          : "other";
      rolls[row.code] = {
        kind,
        stackable: Number(row.stackable) !== 0,
        minStack: Number(row.minstack) || 0,
        maxStack: Math.min(Number(row.maxstack) || 0, 511),
        spawnStack: Number(row.spawnstack) || 0,
        durability: (Number(row.durability) || 0) & 0xff,
        defense:
          kind === "armor"
            ? [Number(row.minac) || 0, Number(row.maxac) || 0]
            : undefined,
        pictures: Number(type?.VarInvGfx) || 0,
      };
    }
  }
  await writeJson("SeedRolls", rolls);
  return rolls;
}
