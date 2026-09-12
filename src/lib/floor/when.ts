export function formatWhen(at?: number) {
  if (!at) return "";
  return new Date(at).toLocaleString();
}
