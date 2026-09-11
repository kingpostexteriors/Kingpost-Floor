export type ShopMode = "open" | "closed" | "kid" | "night" | "creed";
export type PairStatus = "demo" | "awaiting" | "paired";
export type AgentStatus = "idle" | "working" | "held" | "offline";
export type ActivityKind = "inbound" | "draft" | "hold" | "system" | "send";
export type ReplySource = "faq" | "llm" | "system";
export type FlagVerdict = "flag" | "ask-ben";
export type PostChannel = "facebook" | "gbp";
export type PostStatus = "pending" | "approved" | "rejected";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type FixStatus = "for-michael" | "applied" | "discarded";

export const SHOP_LINE = "712-318-1911";
export const TEST_LINE = "712-309-6810";

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isTestPhone(phone: string) {
  const d = phoneDigits(phone);
  return d === "7123096810" || d.endsWith("3096810");
}

export type ModelSlot = {
  id: string;
  name: string;
  tag: string;
  sizeGb: number;
  role: "inbox" | "sunday";
  loaded: boolean;
  onDisk: boolean;
  notes: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  channel: string;
  status: AgentStatus;
  lastAction: string;
};

export type Hardware = {
  gpuName: string;
  gpuTemp: number;
  gpuUtil: number;
  vramUsed: number;
  vramTotal: number;
  cpuTemp: number;
  cpuUtil: number;
  ramUsed: number;
  ramTotal: number;
};

export type Activity = {
  id: string;
  at: number;
  agent: string;
  kind: ActivityKind;
  text: string;
  source: ReplySource;
  test: boolean;
};

export type GrokFixState = {
  status: "idle" | "working" | "ready" | "needs-chat";
  draft?: string;
  bundle?: string;
  error?: string;
  via?: "api" | "chat";
};

export type QueueItem = {
  id: string;
  channel: "sms" | "email" | "page";
  from: string;
  preview: string;
  held: boolean;
  source: ReplySource;
  test: boolean;
  reply?: string;
  status: ReviewStatus;
  autoSent: boolean;
  urgent: boolean;
  sent: boolean;
  sendError?: string;
};

export type FlagItem = {
  id: string;
  at: number;
  verdict: FlagVerdict;
  on: string;
  reason: string;
  test: boolean;
};

export type DraftPost = {
  id: string;
  channel: PostChannel;
  author: string;
  body: string;
  status: PostStatus;
  test: boolean;
};

export type FloorControl = {
  systemOn: boolean;
  mode: ShopMode;
  testMode: boolean;
  scheduleEnabled: boolean;
  shopOpenHour: number;
  shopCloseHour: number;
};

export type FixTicket = {
  id: string;
  at: number;
  queueId?: string;
  from: string;
  customer: string;
  jimSaid: string;
  benWants: string;
  note: string;
  status: FixStatus;
  test: boolean;
};

export type FloorSnapshot = {
  live: boolean;
  jimDir: string;
  queue: QueueItem[];
  sendLog: Activity[];
  hardware: Hardware;
  hwLive: boolean;
  control: FloorControl;
  fixes: FixTicket[];
};
