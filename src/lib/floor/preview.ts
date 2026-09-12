export function stripVoiceFooter(text: string) {
  return text
    .replace(/To respond to this text message, reply to this email or visit Google Voice\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatWhen(at?: number) {
  if (!at) return "";
  return new Date(at).toLocaleString();
}
