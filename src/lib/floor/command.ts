import type { FlagItem, ModelSlot, QueueItem } from "./types";
import { TEST_LINE } from "./types";

export type CommandTarget = {
  pauseJim: () => void;
  warmJim: () => void;
  openShop: () => void;
  closeShop: () => void;
  kidMode: () => void;
  nightOff: () => void;
  runCreed: () => void;
  stopCreed: () => void;
  startSystem: () => void;
  stopSystem: () => void;
  setTestMode: (on: boolean) => void;
  jimTag: () => string;
  flags: FlagItem[];
  queue: QueueItem[];
  models: ModelSlot[];
  scheduleEnabled: boolean;
  shopOpenHour: number;
  shopCloseHour: number;
  health: () => { label: string; detail: string };
};

export function runFloorCommand(s: CommandTarget, raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return "Say something like pause Jim, or tell me what’s wrong with a reply.";
  if (/\b(pause|stop) jim\b/.test(t) || t === "pause") {
    s.pauseJim();
    return "Jim paused. Inbound will sit.";
  }
  if (/\bwarm jim\b/.test(t) || t === "warm") {
    s.warmJim();
    return `Jim warmed on ${s.jimTag()}.`;
  }
  if (/\bopen shop\b/.test(t) || t === "open") {
    s.openShop();
    return "Shop open.";
  }
  if (/\bclose shop\b/.test(t) || t === "close") {
    s.closeShop();
    return "Shop closed.";
  }
  if (/\bkid\b/.test(t)) {
    s.kidMode();
    return "Kid mode. GPU is free for games.";
  }
  if (/\bnight\b/.test(t)) {
    s.nightOff();
    return "Night off. Queue waits.";
  }
  if (/\bcreed\b/.test(t) && /\bstop\b/.test(t)) {
    s.stopCreed();
    return "Creed filed. Jim returning.";
  }
  if (/\bcreed\b/.test(t) || /\bsunday\b/.test(t)) {
    s.runCreed();
    return "Creed is on the card. Sunday pass: one page, three legal ways to chase work. He does not text customers.";
  }
  if (/\b(start|boot) (the )?(system|stack|floor)\b/.test(t) || t === "start") {
    s.startSystem();
    return "System on.";
  }
  if (/\b(stop|shut) (the )?(system|stack|floor)\b/.test(t) || t === "shutdown") {
    s.stopSystem();
    return "Whole stack stopped.";
  }
  if (/\btest (on|mode)\b/.test(t) || t === "test on") {
    s.setTestMode(true);
    return `Test mode on. ${TEST_LINE} is Ben’s phone. Shop 1911 stays live. TEST on every card.`;
  }
  if (/\btest off\b/.test(t)) {
    s.setTestMode(false);
    return "Test mode off.";
  }
  if (/\boscar\b/.test(t) || /\bflag/.test(t)) {
    if (!s.flags.length) return "Oscar is clear. Nothing flagged.";
    return s.flags
      .map((f) => `${f.verdict === "ask-ben" ? "Ask Ben" : "Flag"} — ${f.reason}`)
      .join(" · ");
  }
  if (/\btext/.test(t) || /\binbound/.test(t) || /\btoday/.test(t)) {
    if (!s.queue.length) return "Board is empty.";
    return s.queue.map((q) => `${q.test ? "TEST " : ""}${q.from}: ${q.preview}`).join(" / ");
  }
  if (/\bloaded\b/.test(t) || (/\bmodel\b/.test(t) && /\bwhich\b/.test(t))) {
    const m = s.models.find((x) => x.loaded);
    return m ? `Loaded: ${m.tag} (${m.name}). Jim assigned: ${s.jimTag()}.` : "Nothing on the GPU.";
  }
  if (/\bhealth\b/.test(t) || /\bworking\b/.test(t)) {
    const h = s.health();
    return h.label + ". " + h.detail;
  }
  if (/\bhours\b/.test(t) || /\bschedule\b/.test(t)) {
    return `Schedule ${s.scheduleEnabled ? "on" : "off"} · ${String(s.shopOpenHour).padStart(2, "0")}:00–${String(s.shopCloseHour).padStart(2, "0")}:00`;
  }
  if (/\b(bot|ai|human)\b/.test(t)) {
    return "If a customer asks, Jim says he’s the shop’s text helper — not a person, not Ben. He does not volunteer that. He never claims to be human.";
  }
  return "I can pause Jim, open or close shop, kid mode, night off, start or stop the stack, test on/off, Oscar flags, today's texts, which model is loaded. Or tell me what’s wrong with Jim and I’ll queue it for Michael.";
}
