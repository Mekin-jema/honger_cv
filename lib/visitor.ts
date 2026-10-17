"use client";

import { getConsent } from "./consent";
import { apiUrl } from "./utils";

const KEY = "portfolio:visitor";
let memoryId: string | undefined;

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Anonymous id kept in this browser so one visitor's messages, feedback and votes group together. */
export function visitorId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return (memoryId ??= randomId());
  }
}

export function visitorInfo() {
  return {
    visitorId: visitorId(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || undefined,
    screen: `${window.screen.width}x${window.screen.height}`,
  };
}

export type ApiResult = { ok: boolean; error?: string; status?: number; [k: string]: unknown };

/** Device details go along only when the visitor accepted the privacy banner; otherwise just the anonymous id. */
export async function postApi(path: string, body: Record<string, unknown>, method = "POST"): Promise<ApiResult> {
  const consent = getConsent() === "granted";
  try {
    const res = await fetch(apiUrl(path), {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, consent, visitor: consent ? visitorInfo() : { visitorId: visitorId() } }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult;
    return { ...data, ok: res.ok && data.ok !== false, status: res.status };
  } catch {
    return { ok: false, status: 0, error: "Couldn't reach the server. Please try again." };
  }
}

// ---------- remembered votes (UI state only; the server keeps the real record) ----------
const VOTES_KEY = "portfolio:votes";
type VoteMap = Record<string, "up" | "down">;

export function readVotes(): VoteMap {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || "{}") as VoteMap;
  } catch {
    return {};
  }
}

export function rememberVote(key: string, value: "up" | "down" | null) {
  try {
    const all = readVotes();
    if (value) all[key] = value;
    else delete all[key];
    localStorage.setItem(VOTES_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: the vote is still saved on the server */
  }
}
