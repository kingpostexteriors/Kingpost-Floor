const SYSTEM = `You rewrite SMS/Gmail drafts for Jim at Kingpost Exteriors (roofing, siding, gutters). Ben Nelson owns the shop.\n\nRules:\n- Same facts as Jim. No new prices, dates, or clock times. Only Ben confirms a time.\n- No fake business names. No legal or insurance advice.\n- If they asked hours: don't invent them. Say Ben will confirm.\n- If they asked whether this is a bot/AI/human: answer honestly and briefly \u2014 shop text helper, not a person, not Ben.\n- Short, natural, shop-floor. Return ONLY the text Jim should send.`;

export type GrokFixInput = {
  from: string;
  customer: string;
  jimSaid: string;
  note: string;
  test: boolean;
};

export type GrokFixResult =
  | { via: "api"; reply: string }
  | { via: "chat"; bundle: string; error?: string };

function bundleOf(p: GrokFixInput) {
  return [
    "Kingpost Jim \u2014 Grok rewrite",
    `From: ${p.from}${p.test ? " (TEST line)" : ""}`,
    `Customer: ${p.customer}`,
    `Jim said: ${p.jimSaid}`,
    p.note ? `Ben wants: ${p.note}` : "Ben wants: rewrite \u2014 same facts, natural shop text.",
    "",
    "Reply with ONLY the text Jim should send.",
  ].join("\n");
}

export async function rewriteWithGrok(p: GrokFixInput): Promise<GrokFixResult> {
  const bundle = bundleOf(p);
  const key = process.env.XAI_API_KEY?.trim() || process.env.GROK_API_KEY?.trim();
  if (!key) return { via: "chat", bundle };
  const model = process.env.GROK_MODEL?.trim() || "grok-3";
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: bundle },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { via: "chat", bundle, error: `Grok ${res.status} ${t.slice(0, 180)}` };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) return { via: "chat", bundle, error: "Empty Grok reply" };
    return { via: "api", reply };
  } catch (err) {
    return { via: "chat", bundle, error: err instanceof Error ? err.message : "Grok call failed" };
  }
}
