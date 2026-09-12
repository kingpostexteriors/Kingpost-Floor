import { rename, writeFile } from "node:fs/promises";
import type { Raw } from "./parse-queue";

export async function writeQueueFile(file: string, rows: Raw[]) {
  const tmp = file + ".tmp";
  await writeFile(tmp, JSON.stringify(rows) + "\n", "utf8");
  await rename(tmp, file);
}
