import { create } from "zustand";
import { runFloorCommand } from "./command";
import type {
  Activity,
  Agent,
  DraftPost,
  FlagItem,
  FloorSnapshot,
  FixTicket,
  Hardware,
  ModelSlot,
  QueueItem,
  ShopMode,
} from "./types";
import { TEST_LINE } from "./types";
export { TEST_LINE, SHOP_LINE } from "./types";

const now = () => Date.now();

function log(list: Activity[], agent: string, kind: Activity["kind"], text: string, source: Activity["source"], test: boolean): Activity[] {
  return [{ id: crypto.randomUUID(), at: now(), agent, kind, text, source, test }, ...list].slice(0, 80);
}

const seedAgents: Agent[] = [
  { id: "jim", name: "Jim", role: "Reception", channel: "SMS · Gmail", status: "idle", lastAction: "Waiting" },
  { id: "michael", name: "Michael", role: "Chief of staff", channel: "Fixes", status: "idle", lastAction: "Watching" },
  { id: "oscar", name: "Oscar", role: "Compliance", channel: "Outbound", status: "idle", lastAction: "Gate armed" },
  { id: "creed", name: "Creed", role: "Sunday", channel: "Offline", status: "offline", lastAction: "Not loaded" },
];

const seedModels: ModelSlot[] = [
  { id: "llama31", name: "Jim · current", tag: "llama3.1:8b", sizeGb: 4.9, role: "inbox", loaded: false, onDisk: true, notes: "Live brain." },
  { id: "bigger", name: "Jim · bigger brain", tag: "bigger-brain (TBD)", sizeGb: 0, role: "inbox", loaded: false, onDisk: false, notes: "Empty slot." },
  { id: "creed-brain", name: "Creed", tag: "deepseek-r1:7b", sizeGb: 4.7, role: "sunday", loaded: false, onDisk: false, notes: "Sunday only." },
];

const idleHw = (): Hardware => ({
  gpuName: "GTX 1660 Ti", gpuTemp: 38, gpuUtil: 2, vramUsed: 0.3, vramTotal: 6, cpuTemp: 42, cpuUtil: 8, ramUsed: 9.4, ramTotal: 32,
});

function pushControl(patch: { systemOn?: boolean; mode?: ShopMode; testMode?: boolean; scheduleEnabled?: boolean; shopOpenHour?: number; shopCloseHour?: number }) {
  void import("./api").then(({ postFloorControl }) => postFloorControl({ data: patch })).catch(() => {});
}

export function healthOf(s: { systemOn: boolean; testMode: boolean; mode: ShopMode; flags: FlagItem[]; models: ModelSlot[] }) {
  if (!s.systemOn) return { tone: "muted" as const, label: "Off", detail: "Stack is stopped." };
  if (s.testMode) return { tone: "warn" as const, label: "Test mode", detail: `${TEST_LINE} is labeled TEST.` };
  if (s.flags.length) return { tone: "warn" as const, label: "Oscar needs you", detail: `${s.flags.length} flag(s).` };
  if (s.mode === "kid") return { tone: "warn" as const, label: "Kid mode", detail: "GPU is free for games." };
  if (s.mode === "night") return { tone: "muted" as const, label: "Night off", detail: "Queue waits." };
  if (s.mode === "open" && s.models.some((m) => m.loaded && m.role === "inbox")) return { tone: "ok" as const, label: "All good", detail: "Jim is on the card." };
  if (s.mode === "creed") return { tone: "warn" as const, label: "Sunday Creed", detail: "Inbox paused." };
  return { tone: "muted" as const, label: "Idle", detail: "Stack on. Shop closed." };
}

export const useFloor = create((set: any, get: any) => ({
  mode: "closed",
  pair: "demo",
  endpoint: "http://127.0.0.1:11434",
  systemOn: true,
  testMode: false,
  scheduleEnabled: false,
  shopOpenHour: 5,
  shopCloseHour: 23,
  jimModelId: "llama31",
  models: seedModels,
  agents: seedAgents,
  hardware: idleHw(),
  commandReply: "",
  jimDir: "",
  hwLive: false,
  grokById: {} as Record<string, { status: string; draft?: string; bundle?: string; error?: string; via?: string }>,
  jimToday: 0,
  grokToday: 0,
  jimWeek: 0,
  grokWeek: 0,
  activity: [],
  queue: [],
  flags: [],
  posts: [],
  fixes: [],
  applyLive: (snap: FloorSnapshot, kind = "full") => {
    set((s: any) => ({
      pair: "paired",
      queue: snap.queue,
      jimDir: snap.jimDir,
      hardware: snap.hwLive ? snap.hardware : s.hardware,
      hwLive: snap.hwLive,
      systemOn: snap.control.systemOn,
      mode: snap.control.mode,
      testMode: snap.control.testMode,
      scheduleEnabled: snap.control.scheduleEnabled,
      shopOpenHour: snap.control.shopOpenHour,
      shopCloseHour: snap.control.shopCloseHour,
      fixes: snap.fixes,
      activity: kind === "full" ? [...snap.sendLog, ...s.activity].slice(0, 80) : s.activity,
    }));
  },
  approveReview: (id: string) => {
    set((s: any) => ({ queue: s.queue.map((q: QueueItem) => (q.id === id ? { ...q, status: "approved", held: false } : q)) }));
    void import("./api").then(({ postReviewStatus }) => postReviewStatus({ data: { id, status: "approved" } })).then((snap) => get().applyLive(snap, "queue")).catch(() => {});
  },
  rejectReview: (id: string) => {
    set((s: any) => ({ queue: s.queue.map((q: QueueItem) => (q.id === id ? { ...q, status: "rejected", held: false } : q)) }));
    void import("./api").then(({ postReviewStatus }) => postReviewStatus({ data: { id, status: "rejected" } })).then((snap) => get().applyLive(snap, "queue")).catch(() => {});
  },
  saveDraft: (id: string, reply: string) => {
    set((s: any) => ({ queue: s.queue.map((q: QueueItem) => (q.id === id ? { ...q, reply } : q)) }));
    void import("./api").then(({ postJimDraft }) => postJimDraft({ data: { id, reply } })).then((snap) => get().applyLive(snap, "queue")).catch(() => {});
  },
  giveToMichael: (p: FixTicket) => {
    const ticket = { id: crypto.randomUUID(), at: Date.now(), status: "for-michael", ...p };
    set((s: any) => ({ fixes: [ticket, ...s.fixes] }));
    void import("./api").then(({ postMichaelFix }) => postMichaelFix({ data: p })).then((snap) => get().applyLive(snap, "queue")).catch(() => {});
  },
  markFix: (id: string, status: FixTicket["status"]) => {
    set((s: any) => ({ fixes: s.fixes.map((f: FixTicket) => (f.id === id ? { ...f, status } : f)) }));
    void import("./api").then(({ postFixStatus }) => postFixStatus({ data: { id, status } })).then((snap) => get().applyLive(snap, "queue")).catch(() => {});
  },
  openShop: () => { set({ mode: "open" }); pushControl({ mode: "open" }); },
  closeShop: () => { set({ mode: "closed" }); pushControl({ mode: "closed" }); },
  kidMode: () => { set((s: any) => ({ mode: "kid", models: s.models.map((m: ModelSlot) => ({ ...m, loaded: false })) })); pushControl({ mode: "kid" }); },
  nightOff: () => { set({ mode: "night" }); pushControl({ mode: "night" }); },
  pauseJim: () => {
    set((s: any) => ({
      models: s.models.map((m: ModelSlot) => (m.role === "inbox" ? { ...m, loaded: false } : m)),
      agents: s.agents.map((a: Agent) => (a.id === "jim" ? { ...a, status: "held", lastAction: "Paused" } : a)),
    }));
  },
  warmJim: () => {
    const id = get().jimModelId;
    set((s: any) => ({
      models: s.models.map((m: ModelSlot) => ({ ...m, loaded: m.id === id })),
      agents: s.agents.map((a: Agent) => (a.id === "jim" ? { ...a, status: "working", lastAction: "Warmed" } : a)),
    }));
  },
  runCreed: () => { set((s: any) => ({ mode: "creed", models: s.models.map((m: ModelSlot) => ({ ...m, loaded: m.role === "sunday" })) })); pushControl({ mode: "creed" }); },
  stopCreed: () => { set({ mode: "open" }); get().warmJim(); pushControl({ mode: "open" }); },
  ejectAll: () => set((s: any) => ({ models: s.models.map((m: ModelSlot) => ({ ...m, loaded: false })) })),
  startSystem: () => { set({ systemOn: true }); pushControl({ systemOn: true }); },
  stopSystem: () => { set({ systemOn: false, mode: "closed" }); pushControl({ systemOn: false, mode: "closed" }); },
  setTestMode: (on: boolean) => { set({ testMode: on }); pushControl({ testMode: on }); },
  setSchedule: (on: boolean) => { set({ scheduleEnabled: on }); pushControl({ scheduleEnabled: on }); },
  setHours: (open: number, close: number) => { set({ shopOpenHour: open, shopCloseHour: close }); pushControl({ shopOpenHour: open, shopCloseHour: close }); },
  assignJim: (id: string) => set({ jimModelId: id }),
  toggleDisk: (id: string) => set((s: any) => ({ models: s.models.map((m: ModelSlot) => (m.id === id ? { ...m, onDisk: !m.onDisk } : m)) })),
  setEndpoint: (v: string) => set({ endpoint: v }),
  tryPair: () => {
    void import("./api").then(({ getFloorSnapshot }) => getFloorSnapshot()).then((snap) => get().applyLive(snap, "full")).catch(() => set({ pair: "awaiting" }));
  },
  stayDemo: () => set({ pair: "demo" }),
  tick: () => {},
  clearQueueItem: (id: string) => set((s: any) => ({ queue: s.queue.filter((q: QueueItem) => q.id !== id) })),
  resolveFlag: (id: string) => set((s: any) => ({ flags: s.flags.filter((f: FlagItem) => f.id !== id) })),
  approvePost: (id: string) => set((s: any) => ({ posts: s.posts.map((p: DraftPost) => (p.id === id ? { ...p, status: "approved" } : p)) })),
  rejectPost: (id: string) => set((s: any) => ({ posts: s.posts.map((p: DraftPost) => (p.id === id ? { ...p, status: "rejected" } : p)) })),
  editPost: (id: string, body: string) => set((s: any) => ({ posts: s.posts.map((p: DraftPost) => (p.id === id ? { ...p, body } : p)) })),
  ask: (raw: string) => {
    const reply = runFloorCommand({
      pauseJim: get().pauseJim, warmJim: get().warmJim, openShop: get().openShop, closeShop: get().closeShop,
      kidMode: get().kidMode, nightOff: get().nightOff, runCreed: get().runCreed, stopCreed: get().stopCreed,
      startSystem: get().startSystem, stopSystem: get().stopSystem, setTestMode: get().setTestMode, jimTag: get().jimTag,
      flags: get().flags, queue: get().queue, models: get().models, scheduleEnabled: get().scheduleEnabled,
      shopOpenHour: get().shopOpenHour, shopCloseHour: get().shopCloseHour, health: () => healthOf(get()),
    }, raw);
    set({ commandReply: reply });
  },
  jimTag: () => get().models.find((m: ModelSlot) => m.id === get().jimModelId)?.tag ?? "llama3.1:8b",
  askGrok: (id: string, note: string) => {
    const q = get().queue.find((x: QueueItem) => x.id === id);
    if (!q) return;
    set((s: any) => ({ grokById: { ...s.grokById, [id]: { status: "working" } } }));
    void import("./api").then(({ postGrokFix }) => postGrokFix({ data: { from: q.from, customer: q.preview, jimSaid: q.reply ?? "", note, test: q.test } }))
      .then((res: any) => {
        if (res.via === "api") {
          set((s: any) => ({ grokById: { ...s.grokById, [id]: { status: "ready", draft: res.reply, via: "api" } } }));
          return;
        }
        set((s: any) => ({ grokById: { ...s.grokById, [id]: { status: "needs-chat", bundle: res.bundle, error: res.error, via: "chat" } } }));
      })
      .catch((err: unknown) => {
        set((s: any) => ({ grokById: { ...s.grokById, [id]: { status: "needs-chat", error: err instanceof Error ? err.message : "Grok failed" } } }));
      });
  },
  useGrokDraft: (id: string) => {
    const g = get().grokById[id];
    if (!g?.draft) return;
    get().saveDraft(id, g.draft);
    set((s: any) => ({ grokById: { ...s.grokById, [id]: { status: "idle" } }, commandReply: "Grok rewrite is in Jim’s box. Approve when it looks right." }));
  },
  dismissGrok: (id: string) => {
    set((s: any) => ({ grokById: { ...s.grokById, [id]: { status: "idle" } } }));
  },
}));
