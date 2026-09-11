import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  Activity,
  FloorControl,
  FloorSnapshot,
  FixTicket,
  Hardware,
  QueueItem,
  ReplySource,
  ReviewStatus,
} from "./types";
import { isTestPhone } from "./types";

const DEFAULT_DIR = path.join(process.cwd(), "KingpostJim");
const QUEUE_FILE = "gmail_pending_review.jsonl";
const SEND_FILE = "send_log.jsonl";
const CONTROL_FILE = "floor_control.json";
const FIX_FILE = "proposed_fixes.jsonl";

type Raw = Record<string, unknown>;

function jimDir() {
  return process.env.KINGPOST_JIM_DIR?.trim() || DEFAULT_DIR;
}
function queuePath() {
  return path.join(jimDir(), QUEUE_FILE);
}
function sendPath() {
  return path.join(jimDir(), SEND_FILE);
}
function controlPath() {
  return path.join(jimDir(), CONTROL_FILE);
}
function fixPath() {
  return path.join(jimDir(), FIX_FILE);
}
function asStr(v: unknown, fallback = "") {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}
function asBool(v: unknown) {
  return v === true || v === "true" || v === 1;
}
function asNum(v: unknown, fallback: number) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function parseJsonl(text: string): Raw[] {
  const rows: Raw[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const v = JSON.parse(t) as unknown;
      if (v && typeof v === "object") rows.push(v as Raw);
    } catch {
      /* skip */
    }
  }
  return rows;
}
async function readJsonl(file: string): Promise<Raw[]> {
  if (!existsSync(file)) return [];
  return parseJsonl(await readFile(file, "utf8"));
}
async function writeJsonl(file: string, rows: Raw[]) {
  const tmp = file + ".tmp";
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  await writeFile(tmp, body, "utf8");
  await rename(tmp, file);
}
function sourceOf(raw: Raw): ReplySource {
  const s = asStr(raw.source || raw.reply_source || raw.layer).toLowerCase();
  if (s === "faq" || s === "deterministic") return "faq";
  if (s === "llm" || s === "model") return "llm";
  if (asBool(raw.auto_sent) || asStr(raw.rule_id)) return "faq";
  return "llm";
}
function statusOf(raw: Raw): ReviewStatus {
  const s = asStr(raw.review_status || raw.status).toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return "pending";
}
function idOf(raw: Raw, i: number) {
  return asStr(raw.id || raw.entry_id || raw.message_id || `row-${i}`);
}
export function toQueueItem(raw: Raw, i: number): QueueItem {
  const from = asStr(raw.phone || raw.from || raw.customer || "unknown");
  const preview = asStr(raw.customer_message || raw.message || raw.preview);
  const reply = asStr(raw.drafted_reply || raw.reply || raw.draft);
  const status = statusOf(raw);
  const sent = asBool(raw.sent);
  const autoSent = asBool(raw.auto_sent);
  const urgent = asBool(raw.is_urgent || raw.urgent);
  const sendError = asStr(raw.send_error) || undefined;
  return {
    id: idOf(raw, i),
    channel: "sms",
    from,
    preview,
    reply: reply || undefined,
    held: status === "pending" || (status === "approved" && !sent && !autoSent),
    source: sourceOf(raw),
    test: isTestPhone(from),
    status,
    autoSent,
    urgent,
    sent,
    sendError,
  };
}
function toActivity(raw: Raw, i: number): Activity {
  const ok = raw.ok !== false && raw.success !== false && !raw.error && !raw.send_error;
  const phone = asStr(raw.phone || raw.to);
  const err = asStr(raw.error || raw.send_error);
  return {
    id: asStr(raw.id, `send-${i}`),
    at: asNum(raw.at ?? raw.ts, Date.now()),
    agent: "Jim",
    kind: "send",
    text: ok ? `Sent to ${phone || "thread"}.` : `Send failed${phone ? ` to ${phone}` : ""}${err ? ` — ${err}` : ""}.`,
    source: "system",
    test: isTestPhone(phone),
  };
}
const defaultControl = (): FloorControl => ({
  systemOn: true,
  mode: "closed",
  testMode: false,
  scheduleEnabled: false,
  shopOpenHour: 5,
  shopCloseHour: 23,
});
function idleHw(): Hardware {
  return {
    gpuName: "GTX 1660 Ti",
    gpuTemp: 38,
    gpuUtil: 2,
    vramUsed: 0.3,
    vramTotal: 6,
    cpuTemp: 42,
    cpuUtil: 8,
    ramUsed: 9.4,
    ramTotal: 32,
  };
}
export async function ensureJimDir() {
  const dir = jimDir();
  await mkdir(dir, { recursive: true });
  if (!existsSync(queuePath())) await writeJsonl(queuePath(), []);
  if (!existsSync(sendPath())) await writeJsonl(sendPath(), []);
  if (!existsSync(controlPath())) {
    await writeFile(controlPath(), JSON.stringify(defaultControl(), null, 2), "utf8");
  }
  if (!existsSync(fixPath())) await writeJsonl(fixPath(), []);
}
export async function readControl(): Promise<FloorControl> {
  await ensureJimDir();
  try {
    const raw = JSON.parse(await readFile(controlPath(), "utf8")) as Partial<FloorControl>;
    return { ...defaultControl(), ...raw };
  } catch {
    return defaultControl();
  }
}
export async function writeControl(patch: Partial<FloorControl>): Promise<FloorControl> {
  const next = { ...(await readControl()), ...patch };
  const tmp = controlPath() + ".tmp";
  await writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await rename(tmp, controlPath());
  return next;
}
function rank(q: QueueItem) {
  if (q.urgent && q.status === "pending") return 0;
  if (q.sendError) return 1;
  if (q.status === "pending") return 2;
  if (q.status === "approved" && !q.sent) return 3;
  if (q.status === "rejected") return 4;
  return 5;
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
  const [rows, sends, control, fixRows] = await Promise.all([
    readJsonl(queuePath()),
    readJsonl(sendPath()),
    readControl(),
    readJsonl(fixPath()),
  ]);
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
  await writeJsonl(
    queuePath(),
    rows.map((r, i) =>
      idOf(r, i) !== id
        ? r
        : { ...r, review_status: status, auto_sent: false, reviewed_at: Date.now(), reviewed_by: "ben-command" },
    ),
  );
  return readSnapshot();
}
export async function setDraft(id: string, reply: string): Promise<FloorSnapshot> {
  await ensureJimDir();
  const rows = await readJsonl(queuePath());
  await writeJsonl(
    queuePath(),
    rows.map((r, i) => (idOf(r, i) !== id ? r : { ...r, drafted_reply: reply, edited_by: "ben-command", edited_at: Date.now() })),
  );
  return readSnapshot();
}
export async function addFix(
  ticket: Omit<FixTicket, "id" | "at" | "status"> & { status?: FixTicket["status"] },
): Promise<FloorSnapshot> {
  await ensureJimDir();
  const rows = await readJsonl(fixPath());
  await writeJsonl(fixPath(), [
    {
      id: crypto.randomUUID(),
      at: Date.now(),
      status: ticket.status ?? "for-michael",
      queueId: ticket.queueId,
      from: ticket.from,
      customer: ticket.customer,
      jimSaid: ticket.jimSaid,
      benWants: ticket.benWants,
      note: ticket.note,
      test: ticket.test,
    },
    ...rows,
  ]);
  return readSnapshot();
}
export async function setFixStatus(id: string, status: FixTicket["status"]): Promise<FloorSnapshot> {
  await ensureJimDir();
  const rows = await readJsonl(fixPath());
  await writeJsonl(
    fixPath(),
    rows.map((r) => (asStr(r.id) === id ? { ...r, status } : r)),
  );
  return readSnapshot();
}
