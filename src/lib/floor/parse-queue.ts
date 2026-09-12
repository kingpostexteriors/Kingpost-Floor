export type Raw = Record<string, unknown>;

export function parseQueueFile(text: string): Raw[] {
  const t = text.trim();
  if (!t) return [];
  try {
    const v = JSON.parse(t) as unknown;
    if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Raw[];
    if (v && typeof v === "object") return [v as Raw];
  } catch {
    /* jsonl */
  }
  const rows: Raw[] = [];
  for (const line of t.split(/\r?\n/)) {
    const s = line.trim().replace(/^,/, "").replace(/,$/, "");
    if (!s || s === "[" || s === "]") continue;
    try {
      const v = JSON.parse(s) as unknown;
      if (Array.isArray(v)) rows.push(...(v.filter((x) => x && typeof x === "object") as Raw[]));
      else if (v && typeof v === "object") rows.push(v as Raw);
    } catch {
      /* skip */
    }
  }
  return rows;
}
