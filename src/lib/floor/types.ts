export type ShopMode = "open" | "closed" | "kid" | "night" | "creed";
export type PairStatus = "demo" | "awaiting" | "paired";
export type AgentStatus = "idle" | "working" | "held" | "offline";
export type ActivityKind = "inbound" | "draft" | "hold" | "system" | "send";
export type ReplySource = "faq" | "llm" | "system";
export type FlagVerdict = "flag" | "ask-ben";
export type PostChannel = "facebook" | "gbp";
export type PostStatus = "pending" | "approved" | "rejected";
export type ReviewStatus = "pending" | "approved" | "rejected";

export const SHOP_LINE = "712-318-1911";
export const TEST_LINE = "712-309-6810";

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isTestPhone(phone: string) {
  const d = phoneDigits(phone);
  return d === "7123096810" || d.endsWith("3096810");
}
