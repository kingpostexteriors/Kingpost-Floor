export type Raw = Record<string, unknown>;

function asObj(v: unknown): Raw | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Raw;
}

export function parseQueueFile(text: string): Raw[] {
  const t = text.trim();
  if (!t) return [];
  try {
    const v = JSON.parse(t) as unknown;
    if (Array.isArray(v)) {
      const rows = v.map(asObj).filter((x): x is Raw => !!x);
      if (rows.length) return rows;
    }
    const one = asObj(v);
    if (one) return [one];
  } catch {
    /* split */
  }
  const parts = t.split(/\}\s*\{/);
  const rows: Raw[] = [];
  for (let i = 0; i < parts.length; i++) {
    let chunk = parts[i].trim();
    if (!chunk.startsWith("{")) chunk = "{" + chunk;
    if (!chunk.endsWith("}")) chunk = chunk + "}";
    chunk = chunk.replace(/^\[/, "").replace(/\]$/, "");
    if (!chunk.startsWith("{")) chunk = "{" + chunk;
    if (!chunk.endsWith("}")) chunk = chunk + "}";
    try {
      const o = asObj(JSON.parse(chunk));
      if (o) rows.push(o);
    } catch {
      /* skip */
    }
  }
  return rows;
}
