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
    if (one) {
      const keys = Object.keys(one);
      const numeric = keys.filter((k) => /^\d+$/.test(k)).map((k) => asObj(one[k])).filter((x): x is Raw => !!x);
      if (numeric.length > 1) return numeric;
    }
  } catch {
    /* split */
  }
  const rows: Raw[] = [];
  const parts = t.split(/\}\s*,?\s*\{/);
  for (let i = 0; i < parts.length; i++) {
    let chunk = parts[i].trim();
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
