import type { AiAnswerEntry, ContactEntry, Db, FeedbackEntry, VisitorInfo, VoteEntry } from "./store";

/**
 * What the /admin page sends to the browser. The raw event log (up to 20,000 events, with device
 * details) stays on the server: analytics arrive as totals, and each visitor who accepted analytics
 * as one merged summary.
 */
export type AdminData = {
  contacts: ContactEntry[];
  feedback: FeedbackEntry[];
  votes: VoteEntry[];
  aiAnswers: AiAnswerEntry[];
  analytics: AnalyticsSummary;
  activity: VisitorActivity[];
};

export type Ranked = [label: string, count: number][];

export type AnalyticsSummary = {
  views: number;
  asks: number;
  /** Distinct visitors among events that carry a visitor (consented only). */
  unique: number;
  consentedCount: number;
  consentRate: number | null;
  /** Page views for the last 14 UTC days, oldest first. */
  days: { key: string; label: string; n: number }[];
  questions: Ranked;
  sources: Ranked;
  browsers: Ranked;
  os: Ranked;
  timezones: Ranked;
};

/** One visitor's analytics, merged from their consented events. */
export type VisitorActivity = {
  visitorId: string;
  info: VisitorInfo;
  first: string;
  last: string;
  views: number;
  /** Labels of the questions asked, oldest first (at most MAX_ASKED). */
  asked: string[];
};

const MAX_ASKED = 200;

const browserOf = (ua = "") =>
  /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other";
const osOf = (ua = "") =>
  /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other";
const sourceOf = (ref?: string, utm?: string) => {
  if (utm) return utm.split("&")[0].replace("source=", "").replace("ref=", "") || "Campaign";
  if (!ref) return "Direct";
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return "Other";
  }
};

function top(values: string[], n = 5): Ranked {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function summarize(db: Db, labels: Record<string, string>, now: Date): AnalyticsSummary {
  const ev = db.events ?? [];
  const views = ev.filter((e) => e.type === "pageview");
  const asks = ev.filter((e) => e.type === "ask");
  const consented = views.filter((e) => e.consent && e.visitor);
  const unique = new Set(ev.filter((e) => e.visitor).map((e) => e.visitor!.visitorId)).size;

  const days: AnalyticsSummary["days"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push({ key: d.toISOString().slice(0, 10), label: dayFmt.format(d), n: 0 });
  }
  const byDay = new Map(days.map((d) => [d.key, d]));
  for (const v of views) {
    const day = byDay.get(v.at.slice(0, 10));
    if (day) day.n++;
  }

  return {
    views: views.length,
    asks: asks.length,
    unique,
    consentedCount: consented.length,
    consentRate: views.length ? Math.round((consented.length / views.length) * 100) : null,
    days,
    questions: top(asks.map((a) => labels[a.intentId ?? ""] ?? a.intentId ?? "Unknown"), 8),
    browsers: top(consented.map((e) => browserOf(e.visitor!.userAgent))),
    os: top(consented.map((e) => `${osOf(e.visitor!.userAgent)}${e.visitor!.touch ? " (touch)" : ""}`)),
    timezones: top(consented.map((e) => e.visitor!.timezone ?? "Unknown")),
    sources: top(consented.map((e) => sourceOf(e.visitor!.referrer, e.visitor!.utm))),
  };
}

function activityOf(db: Db, labels: Record<string, string>): VisitorActivity[] {
  const map = new Map<string, VisitorActivity>();
  for (const e of db.events ?? []) {
    if (!e.visitor) continue;
    const id = e.visitor.visitorId;
    let a = map.get(id);
    if (!a) map.set(id, (a = { visitorId: id, info: { visitorId: id }, first: e.at, last: e.at, views: 0, asked: [] }));
    a.info = { ...a.info, ...e.visitor };
    if (e.type === "pageview") a.views++;
    else if (e.intentId && a.asked.length < MAX_ASKED) a.asked.push(labels[e.intentId] ?? e.intentId);
    if (e.at < a.first) a.first = e.at;
    if (e.at > a.last) a.last = e.at;
  }
  return [...map.values()];
}

export function buildAdminData(db: Db, labels: Record<string, string>, now = new Date()): AdminData {
  return {
    contacts: db.contacts,
    feedback: db.feedback,
    votes: db.votes,
    aiAnswers: db.aiAnswers,
    analytics: summarize(db, labels, now),
    activity: activityOf(db, labels),
  };
}
