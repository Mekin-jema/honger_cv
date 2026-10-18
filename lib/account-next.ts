export function safeAccountNext(value: unknown): string {
  return typeof value === "string" && /^\/account(?:\/[a-z0-9-]+)*\/?$/i.test(value)
    ? value
    : "/account/";
}
