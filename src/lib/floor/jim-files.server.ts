import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Activity, FloorControl, FloorSnapshot, FixTicket, Hardware, QueueItem, ReplySource, ReviewStatus } from "./types";
import { isTestPhone } from "./types";
import { parseQueueFile, type Raw } from "./parse-queue";

const DEFAULT_DIR = path.join(process.cwd(), "KingpostJim");
function jimDir() { return process.env.KINGPOST_JIM_DIR?.trim() || DEFAULT_DIR; }
function queuePath() { return path.join(jimDir(), "gmail_pending_review.jsonl"); }
function sendPath() { return path.join(jimDir(), "send_log.jsonl"); }
function controlPath() { return path.join(jimDir(), "floor_control.json"); }
function fixPath() { return path.join(jimDir(), "proposed_fixes.jsonl"); }
function asStr(v: unknown, fallback = "") { return typeof v === "string" ? v : v == null ? fallback : String(v); }
function asBool(v: unknown) { return v === true || v === "true" || v === 1; }
function asNum(v: unknown, fallback: number) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) { const n = Number(v); if (Number.isFinite(n)) return n; }
  return fallback;
}
async function readJsonl(file: string): Promise<Raw[]> {
  if (!existsSync(file)) return [];
  return parseQueueFile(await readFile(file, "utf8"));
}
async function writeJsonl(file: string, rows: Raw[]) {
  const tmp = file + ".tmp";
  await writeFile(tmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  await rename(tmp, file);
}
function sourceOf(raw: Raw): ReplySource {
  const p = asStr(raw.path || raw.source).toLowerCase();
  if (p === "deterministic" || p === "faq") return "faq";
  return "llm";
}
function statusOf(raw: Raw): ReviewStatus {
  const s = asStr(raw.review_status || raw.status).toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return "pending";
}
function idOf(raw: Raw, i: number) {
  return asStr(raw.message_id || raw.id || raw.gmail_uid || raw.customer_id || `row-${i}`);
}
export function toQueueItem(raw: Raw, i: number): QueueItem {
  const from = asStr(raw.phone_display || raw.phone_digits || raw.phone || raw.from || "unknown");
  const digits = asStr(raw.phone_digits || raw.phone_display || from);
  const status = statusOf(raw);
  const sent = asBool(raw.sent);
  const autoSent = asBool(raw.auto_sent);
  return {
    id: idOf(raw, i),
    channel: "sms",
    from,
    preview: asStr(raw.message || raw.customer_message || raw.preview),
    reply: asStr(raw.reply || raw.drafted_reply) || undefined,
    held: status === "pending" || (status === "approved" && !sent && !autoSent),
    source: sourceOf(raw),
    test: isTestPhone(digits),
    status,
    autoSent,
    urgent: asBool(raw.is_urgent),
    sent,
    sendError: asStr(raw.error) || undefined,
  };
}
function toActivity(raw: Raw, i: number): Activity {
  const phone = asStr(raw.phone_display || raw.phone || raw.to);
  return {
    id: asStr(raw.id, `send-${i}`),
    at: asNum(raw.at ?? raw.ts, Date.now()),
    agent: "Jim",
    kind: "send",
    text: `Send ${phone || "thread"}`,
    source: "system",
    test: isTestPhone(phone),
  };
}
const defaultControl = (): FloorControl => ({ systemOn: true, mode: "closed", testMode: false, scheduleEnabled: false, shopOpenHour: 5, shopCloseHour: 23 });
function idleHw(): Hardware {
  return { gpuName: "GTX 1660 Ti", gpuTemp: 38, gpuUtil: 2, vramUsed: 0.3, vramTotal: 6, cpuTemp: 42, cpuUtil: 8, ramUsed: 9.4, ramTotal: 32 };
}
export async function ensureJimDir() {
  const dir = jimDir();
  await mkdir(dir, { recursive: true });
  if (!existsSync(queuePath())) await writeJsonl(queuePath(), []);
  if (!existsSync(sendPath())) await writeJsonl(sendPath(), []);
  if (!existsSync(controlPath())) await writeFile(controlPath(), JSON.stringify(defaultControl(), null, 2), "utf8");
  if (!existsSync(fixPath())) await writeJsonl(fixPath(), []);
}
export async function readControl(): Promise<FloorControl> {
  await ensureJimDir();
  try { return { ...defaultControl(), ...JSON.parse(await readFile(controlPath(), "utf8")) }; }
  catch { return defaultControl(); }
}
export async function writeControl(patch: Partial<FloorControl>): Promise<FloorControl> {
  const next = { ...(await readControl()), ...patch };
  const tmp = controlPath() + ".tmp";
  await writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await rename(tmp, controlPath());
  return next;
}
function rank(q: QueueItem) {
  if (q.status === "pending" && !q.sent) return 1;
  if (q.status === "approved" && !q.sent) return 2;
  if (q.status === "rejected") return 3;
  return 4;
}
function toFix(raw: Raw): FixTicket {
  const st = asStr(raw.status, "for-michael");
  return {
    id: asStr(raw.id, crypto.randomUUID()),
    at: asNum(raw.at, Date.now()),
    queueId: asStr(raw.queueId) || undefined,
    from: asStr(raw.from, "note"),
    customer: asStr(raw.customer),
    jimSaid: asStr(raw.jimSaid),
    benWants: asStr(raw.benWants),
    note: asStr(raw.note),
    status: st === "applied" || st === "discarded" ? st : "for-michael",
    test: asBool(raw.test),
  };
}
export async function readSnapshot(): Promise<FloorSnapshot> {
  await ensureJimDir();
  const [rows, sends, control, fixRows] = await Promise.all([readJsonl(queuePath()), readJsonl(sendPath()), readControl(), readJsonl(fixPath())]);
  return {
    live: true,
    jimDir: jimDir(),
    queue: rows.map(toQueueItem).sort((a, b) => rank(a) - rank(b)),
    sendLog: sends.map(toActivity).sort((a, b) => b.at - a.at),
    hardware: idleHw(),
    hwLive: false,
    control,
    fixes: fixRows.map(toFix).sort((a, b) => b.at - a.at),
  };
}
export async function setReview(id: string, status: ReviewStatus): Promise<FloorSnapshot> {
  await ensureJimDir();
  const rows = await readJsonl(queuePath());
  await writeJsonl(queuePath(), rows.map((r, i) => idOf(r, i) !== id ? r : { ...r, review_status: status, status, auto_sent: false, reviewed_at: Date.now(), reviewed_by: "ben-command" }));
  return readSnapshot();
}
export async function setDraft(id: string, reply: string): Promise<FloorSnapshot> {
  await ensureJimDir();
  const rows = await readJsonl(queuePath());
  await writeJsonl(queuePath(), rows.map((r, i) => idOf(r, i) !== id ? r : { ...r, reply, drafted_reply: reply, edited_by: "ben-command", edited_at: Date.now() }));
  return readSnapshot();
}
export async function addFix(ticket: Omit<FixTicket, "id" | "at" | "status"> & { status?: FixTicket["status"] }): Promise<FloorSnapshot> {
  await ensureJimDir();
  const rows = await readJsonl(fixPath());
  await writeJsonl(fixPath(), [{ id: crypto.randomUUID(), at: Date.now(), status: ticket.status ?? "for-michael", ...ticket }, ...rows]);
  return readSnapshot();
}
export async function setFixStatus(id: string, status: FixTicket["status"]): Promise<FloorSnapshot> {
  await ensureJimDir();
  const rows = await readJsonl(fixPath());
  await writeJsonl(fixPath(), rows.map((r) => asStr(r.id) === id ? { ...r, status } : r));
  return readSnapshot();
}
