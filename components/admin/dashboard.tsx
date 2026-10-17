"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Copy,
  Download,
  Globe,
  Inbox,
  Languages,
  LogOut,
  Mail,
  MessageSquareHeart,
  MessageSquareText,
  Monitor,
  Search,
  Settings,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Timer,
  UserRoundPen,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";
import { Analytics } from "./analytics";
import type { AdminData } from "@/server/admin-view";
import type { VisitorInfo } from "@/server/store";
import { cn, plain, withBase } from "@/lib/utils";
import { getAuthClient } from "@/lib/auth-client";

type Props = { data: AdminData; labels: Record<string, string>; personas?: { slug: string; name: string }[]; persona?: string };
type Tab = "all" | "messages" | "feedback" | "votes" | "ai" | "visitors" | "analytics";

type Item = {
  id: string;
  kind: "message" | "feedback" | "vote";
  at: string;
  visitorId: string;
  name?: string;
  email?: string;
  company?: string;
  title: string;
  body: string;
  rating?: number | null;
  value?: "up" | "down";
};

type Visitor = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  info: VisitorInfo;
  first: string;
  last: string;
  items: Item[];
  /** From analytics events (only for visitors who accepted). */
  views: number;
  asked: string[];
};

// ---------- helpers ----------
const absFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const absolute = (iso: string) => `${absFmt.format(new Date(iso))} UTC`;

const subscribeNow = (cb: () => void) => {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};
/** Current minute on the client, null during SSR (so dates render identically on both sides first). */
const useNow = () => useSyncExternalStore(subscribeNow, () => Math.floor(Date.now() / 60_000) * 60_000, () => null);

function ago(iso: string, now: number | null) {
  if (now === null) return absFmt.format(new Date(iso));
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return absFmt.format(new Date(iso)).split(",")[0];
}

function device(ua?: string) {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${browser} · ${os}${/Mobile/.test(ua) ? " (mobile)" : ""}`;
}

const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const initials = (name?: string, fallback = "?") =>
  name
    ? name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : fallback;

function Avatar({ seed, name, size = 36 }: { seed: string; name?: string; size?: number }) {
  const h = hue(seed);
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full text-[13px] font-semibold"
      style={{ width: size, height: size, background: `hsl(${h} 75% 55% / 0.16)`, color: `hsl(${h} 65% var(--avatar-l))` }}
    >
      {name ? initials(name) : <Users className="size-4" />}
    </span>
  );
}

function Stars({ n, size = "size-3.5" }: { n: number | null | undefined; size?: string }) {
  if (!n) return <span className="text-xs text-faint">No rating</span>;
  return (
    <span role="img" className="inline-flex items-center gap-0.5" aria-label={`${n} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(size, i <= n ? "fill-accent text-accent" : "text-line-strong")} />
      ))}
    </span>
  );
}

const KIND = {
  message: { icon: MessageSquareText, label: "Message", tone: "bg-sky-500/12 text-sky-800 dark:text-sky-400" },
  feedback: { icon: MessageSquareHeart, label: "Feedback", tone: "bg-accent-soft text-accent" },
  vote: { icon: ThumbsUp, label: "Vote", tone: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-400" },
} as const;

/** Disliked votes get their own tone, so they never read as Liked at a glance (rose-800 on its tint passes AA). */
const DOWN_TONE = "bg-rose-500/12 text-rose-800 dark:text-rose-400";

function KindBadge({ item }: { item: Item }) {
  const k = KIND[item.kind];
  const down = item.kind === "vote" && item.value === "down";
  const Icon = down ? ThumbsDown : k.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", down ? DOWN_TONE : k.tone)}>
      <Icon className="size-3" /> {item.kind === "vote" ? (item.value === "up" ? "Liked" : "Disliked") : k.label}
    </span>
  );
}

// "New since your last visit" - per browser, nothing stored on the server.
const SEEN_KEY = "admin:last-seen";
let seenSnapshot: string | null | undefined;
const readSeen = () => {
  if (seenSnapshot === undefined) {
    try {
      seenSnapshot = localStorage.getItem(SEEN_KEY);
    } catch {
      seenSnapshot = null;
    }
  }
  return seenSnapshot;
};
const noSubscribe = () => () => {};
function useLastSeen() {
  // Server and first client render agree on null; the stored value arrives right after hydration.
  const lastSeen = useSyncExternalStore(noSubscribe, readSeen, () => null);
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
  }, []);
  return lastSeen;
}

// ---------- data shaping ----------
function buildItems(db: AdminData, labels: Record<string, string>): Item[] {
  const named = new Map<string, { name?: string; email?: string; company?: string }>();
  for (const c of db.contacts) named.set(c.visitor.visitorId, { name: c.name, email: c.email, company: c.company });
  for (const f of db.feedback) {
    const n = named.get(f.visitor.visitorId) ?? {};
    named.set(f.visitor.visitorId, { name: n.name ?? f.name, email: n.email ?? f.email, company: n.company });
  }
  const who = (id: string) => named.get(id) ?? {};
  return [
    ...db.contacts.map<Item>((c) => ({
      id: c.id,
      kind: "message",
      at: c.createdAt,
      visitorId: c.visitor.visitorId,
      ...who(c.visitor.visitorId),
      // Access requests are answered in the persona's Studio (Document & access), where a code is made.
      title: c.kind === "access" ? `Access request${c.relation ? ` · ${c.relation}` : ""} (${c.status})` : c.company ? `Message · ${c.company}` : "Message",
      body: c.kind === "access" ? [c.phone && `Phone: ${c.phone}`, c.message].filter(Boolean).join("\n") : c.message,
    })),
    ...db.feedback.map<Item>((f) => ({ id: f.id, kind: "feedback", at: f.createdAt, visitorId: f.visitor.visitorId, ...who(f.visitor.visitorId), title: "Site feedback", body: f.message, rating: f.rating })),
    ...db.votes.map<Item>((v) => ({ id: v.id, kind: "vote", at: v.updatedAt, visitorId: v.visitor.visitorId, ...who(v.visitor.visitorId), title: labels[v.intentId] ?? v.intentId, body: "", value: v.value })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

function buildVisitors(db: AdminData, items: Item[]): Visitor[] {
  const infos = new Map<string, VisitorInfo>();
  for (const e of [...db.contacts, ...db.feedback, ...db.votes]) infos.set(e.visitor.visitorId, { ...infos.get(e.visitor.visitorId), ...e.visitor });
  for (const a of db.activity) infos.set(a.visitorId, { ...infos.get(a.visitorId), ...a.info });
  const map = new Map<string, Visitor>();
  const blank = (id: string, at: string): Visitor => ({ id, info: infos.get(id)!, first: at, last: at, items: [], views: 0, asked: [] });
  for (const a of db.activity) map.set(a.visitorId, { ...blank(a.visitorId, a.first), last: a.last, views: a.views, asked: a.asked });
  for (const it of items) {
    const v = map.get(it.visitorId) ?? blank(it.visitorId, it.at);
    v.items.push(it);
    if (it.at < v.first) v.first = it.at;
    if (it.at > v.last) v.last = it.at;
    v.name ??= it.name;
    v.email ??= it.email;
    v.company ??= it.company;
    map.set(it.visitorId, v);
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
}

/**
 * Marks a horizontal scroller with data-fade="start end" while content is hidden past that edge,
 * so CSS can fade only the edges that really scroll (a hint that more filters sit off screen).
 */
function useEdgeFade(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const edges = [el.scrollLeft > 1 && "start", el.scrollLeft < max - 1 && "end"].filter(Boolean).join(" ");
      if (edges) el.dataset.fade = edges;
      else delete el.dataset.fade;
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);
}

// ---------- page ----------
export function AdminDashboard({ data: db, labels, personas = [], persona }: Props) {
  const now = useNow();
  const lastSeen = useLastSeen();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);
  useEdgeFade(tabStripRef);
  /** The list row that opened the detail, so focus can go back to it (single-pane layout below lg). */
  const openerRef = useRef<string | null>(null);

  const items = useMemo(() => buildItems(db, labels), [db, labels]);
  const visitors = useMemo(() => buildVisitors(db, items), [db, items]);
  const byVisitor = useMemo(() => new Map(visitors.map((v) => [v.id, v])), [visitors]);
  // Only visitors who sent a message, feedback or a vote (page views alone don't count as interacting).
  const interacted = useMemo(() => visitors.filter((v) => v.items.length > 0), [visitors]);

  const needle = q.trim().toLowerCase();
  const match = (...parts: (string | undefined | null)[]) => !needle || parts.some((p) => p?.toLowerCase().includes(needle));

  const listItems = items.filter(
    (i) => (tab === "all" || (tab === "messages" && i.kind === "message") || (tab === "feedback" && i.kind === "feedback") || (tab === "votes" && i.kind === "vote")) && match(i.name, i.email, i.company, i.title, i.body),
  );
  const listVisitors = visitors.filter((v) => match(v.name, v.email, v.company, v.id, ...v.items.map((i) => i.body + i.title)));

  const singlePane = () => window.matchMedia("(max-width: 63.99rem)").matches;

  const open = (id: string) => {
    openerRef.current ??= id;
    setSelected(id);
    // Below lg the list is replaced by the detail: move focus to its Back button.
    if (singlePane()) requestAnimationFrame(() => backRef.current?.focus());
  };

  const back = () => {
    const opener = openerRef.current;
    openerRef.current = null;
    setSelected(null);
    if (opener && singlePane())
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-row="${CSS.escape(opener)}"]`)?.focus());
  };
  const backFn = useRef(back);
  useEffect(() => {
    backFn.current = back;
  });

  // Keyboard: "/" focuses search, Esc clears selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") backFn.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const up = db.votes.filter((v) => v.value === "up").length;
  const ratings = db.feedback.map((f) => f.rating).filter((r): r is number => !!r);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const upPct = db.votes.length ? Math.round((up / db.votes.length) * 100) : null;
  const newCount = lastSeen ? items.filter((i) => i.at > lastSeen).length : items.length;

  const signOut = async () => {
    // Ends this device's session (other devices stay signed in; "Sign out everywhere" is in Settings).
    await getAuthClient()
      .signOut()
      .catch(() => {});
    window.location.assign(withBase("/"));
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All activity", count: items.length },
    { id: "messages", label: "Messages", count: db.contacts.length },
    { id: "feedback", label: "Feedback", count: db.feedback.length },
    { id: "votes", label: "Votes", count: db.votes.length },
    { id: "ai", label: "AI answers", count: db.aiAnswers.length },
    { id: "visitors", label: "Visitors", count: visitors.length },
    { id: "analytics", label: "Analytics", count: db.analytics.views },
  ];

  const selectedItem = tab !== "visitors" ? items.find((i) => i.id === selected) : undefined;
  const selectedVisitor = tab === "visitors" ? byVisitor.get(selected ?? "") : selectedItem ? byVisitor.get(selectedItem.visitorId) : undefined;
  const hasDetail = !!(selectedItem || selectedVisitor);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
          <Link href="/" className="icon-btn shrink-0" aria-label="Back to site">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Phones drop the icon tile and shorten the title to "Inbox" (the full name stays for screen readers), so it never truncates. */}
            <span className="hidden size-8 shrink-0 place-items-center rounded-lg bg-fg text-bg sm:grid" aria-hidden="true">
              <Inbox className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-[15px] font-semibold tracking-tight whitespace-nowrap">
                <span className="sm:hidden" aria-hidden="true">
                  Inbox
                </span>
                <span className="max-sm:sr-only">Feedback inbox</span>
              </h1>
              <p className="hidden text-xs text-muted sm:block">{newCount > 0 ? `${newCount} new since your last visit` : "You're all caught up"}</p>
            </div>
            <span className="eyebrow ml-1 hidden rounded-md border border-line px-1.5 py-0.5 sm:inline">Private</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <a href={withBase("/admin/personas/")} className="icon-btn" aria-label="Personas" title="Personas: what the site knows and says">
              <UserRoundPen className="size-[18px]" />
            </a>
            <a href={withBase("/admin/settings/")} className="icon-btn" aria-label="Settings" title="Settings: password, devices">
              <Settings className="size-[18px]" />
            </a>
            <ThemeToggle />
            <a href={withBase("/api/admin/export/")} className="btn btn-ghost py-2.5 text-sm max-sm:px-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11" aria-label="Export JSON">
              <Download className="size-4" /> <span className="hidden sm:inline">Export</span>
            </a>
            <button type="button" onClick={signOut} className="btn btn-primary py-2.5 text-sm max-sm:px-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11" aria-label="Sign out">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
        {/* Stats */}
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={MessageSquareText} tone="text-sky-700 dark:text-sky-400 bg-sky-500/12" label="Messages" value={db.contacts.length} hint={db.contacts.length ? `Latest ${ago(db.contacts.at(-1)!.createdAt, now)}` : "None yet"} />
          <StatCard
            icon={MessageSquareHeart}
            tone="text-accent bg-accent-soft"
            label="Feedback"
            value={db.feedback.length}
            hint={avg !== null ? <span className="inline-flex items-center gap-1.5"><Stars n={Math.round(avg)} size="size-3" /> {avg.toFixed(1)} avg</span> : "No ratings yet"}
          />
          <StatCard
            icon={ThumbsUp}
            tone="text-emerald-700 dark:text-emerald-400 bg-emerald-500/12"
            label="Answer votes"
            value={upPct !== null ? `${upPct}%` : "-"}
            hint={
              db.votes.length ? (
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-strong">
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${upPct}%` }} />
                  </span>
                  <span className="dot-list [--dot-gap:0.75rem]">
                    <span>{up} up</span>
                    <span>{db.votes.length - up} down</span>
                  </span>
                </span>
              ) : (
                "No votes yet"
              )
            }
          />
          <StatCard
            icon={Users}
            tone="text-violet-700 dark:text-violet-400 bg-violet-500/12"
            label="Visitors who interacted"
            value={interacted.length}
            hint={interacted[0] ? `Sent a message, feedback or vote · last active ${ago(interacted[0].last, now)}` : "No one has sent a message, feedback or vote yet"}
          />
        </ul>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* A filter group (toggle buttons), not tabs: one Tab stop each, Enter/Space selects. */}
          {/* The frame holds the border, so the edge fade only touches the tabs, never the outline. */}
          <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-card">
          <div ref={tabStripRef} role="group" aria-label="Filter" className="tab-strip no-scrollbar flex gap-1 overflow-x-auto p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={(e) => {
                  // Bring the chosen filter fully into view (clear of the edge fade) on narrow screens.
                  e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
                  setTab(t.id);
                  setSelected(null);
                  openerRef.current = null;
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm pointer-coarse:min-h-11 font-semibold whitespace-nowrap text-muted transition-colors hover:text-fg",
                  tab === t.id && "bg-surface text-fg shadow-sm",
                )}
              >
                {t.label}
                <span className={cn("rounded-md px-1.5 text-xs tabular-nums", tab === t.id ? "bg-card text-fg" : "bg-surface text-muted")}>{t.count}</span>
              </button>
            ))}
          </div>
          </div>
          {personas.length > 1 && (
            <div className="flex items-center gap-2 text-sm font-semibold md:ml-auto">
              <label htmlFor="inbox-persona" className="text-muted">
                Persona
              </label>
              <select
                id="inbox-persona"
                value={persona ?? ""}
                onChange={(e) => window.location.assign(withBase(e.target.value ? `/admin/?persona=${encodeURIComponent(e.target.value)}` : "/admin/"))}
                className="rounded-xl border border-line-strong bg-card px-3 py-2.5 text-sm font-medium outline-none focus:border-accent pointer-coarse:min-h-11"
              >
                <option value="">All</option>
                {personas.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className={cn("relative md:w-80", personas.length > 1 ? "" : "md:ml-auto")}>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people, emails, messages…"
              aria-label="Search"
              className="w-full rounded-xl border border-line-strong bg-card py-2.5 pr-10 pl-10 text-sm outline-none pointer-coarse:min-h-11 transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-faint">/</kbd>
          </label>
        </div>

        {tab === "analytics" ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <Analytics data={db.analytics} />
          </div>
        ) : (
        /* Two panes */
        <div className="grid min-h-[28rem] flex-1 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-card lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
          {/* List */}
          <div className={cn("min-h-0 min-w-0 border-line lg:border-r", hasDetail && "hidden lg:block")}>
            {tab === "votes" ? (
              <VotesTable db={db} labels={labels} query={needle} />
            ) : tab === "ai" ? (
              <AiAnswersTable db={db} labels={labels} query={needle} now={now} />
            ) : tab === "visitors" ? (
              <>
                {/* Why this count is bigger than "Visitors who interacted": it also has people who only browsed with analytics accepted. */}
                <p className="border-b border-line px-4 py-2.5 text-xs leading-snug text-muted">
                  Everyone who sent a message, feedback or vote, plus visitors who accepted analytics. Visits without consent stay anonymous and are not listed.
                </p>
                <ul className="divide-y divide-line">
                  {listVisitors.length === 0 && <Empty query={needle} />}
                  {listVisitors.map((v) => (
                    <li key={v.id}>
                      <button type="button" data-row={v.id} aria-current={selected === v.id ? "true" : undefined} onClick={() => open(v.id)} className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-soft", selected === v.id && "bg-surface")}>
                        <Avatar seed={v.id} name={v.name} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">{v.name ?? "Anonymous visitor"}</span>
                            <span className="shrink-0 text-xs text-faint" title={absolute(v.last)}>
                              {ago(v.last, now)}
                            </span>
                          </span>
                          <span className="block truncate text-sm text-muted">
                            {v.email ?? device(v.info.userAgent)} · {v.items.length ? `${v.items.length} ${v.items.length === 1 ? "action" : "actions"}` : `${v.views} ${v.views === 1 ? "visit" : "visits"}, ${v.asked.length} questions`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <ul className="divide-y divide-line">
                {listItems.length === 0 && <Empty query={needle} />}
                {listItems.map((it) => {
                  const isNew = lastSeen ? it.at > lastSeen : false;
                  return (
                    <li key={it.id}>
                      <button type="button" data-row={it.id} aria-current={selected === it.id ? "true" : undefined} onClick={() => open(it.id)} className={cn("flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-soft", selected === it.id && "bg-surface")}>
                        <Avatar seed={it.visitorId} name={it.name} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              {isNew && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="New" />}
                              <span className="truncate font-semibold">{it.name ?? "Anonymous visitor"}</span>
                            </span>
                            <span className="shrink-0 text-xs text-faint" title={absolute(it.at)}>
                              {ago(it.at, now)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <KindBadge item={it} />
                            {it.kind === "feedback" && <Stars n={it.rating} size="size-3" />}
                            <span className="truncate text-sm text-muted">{it.kind === "vote" ? `"${it.title}"` : it.body || it.title}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div className={cn("min-h-0 min-w-0", !hasDetail && "hidden lg:block")}>
            {hasDetail && selectedVisitor ? (
              <Detail item={selectedItem} visitor={selectedVisitor} now={now} backRef={backRef} onBack={back} onPick={(id) => { setTab("all"); setSelected(id); }} />
            ) : (
              <div className="grid h-full place-items-center p-10 text-center">
                <div>
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface text-faint">
                    <Inbox className="size-6" />
                  </span>
                  <p className="mt-4 font-semibold">{tab === "votes" ? "Votes by answer" : tab === "ai" ? "AI answers" : "Select an item"}</p>
                  <p className="mt-1 text-sm text-muted">
                    {tab === "votes"
                      ? "See which answers visitors liked and which missed."
                      : tab === "ai"
                        ? "Questions no curated answer covered: what the AI did with each, and how visitors rated it. Frequent ones are good candidates for new curated answers."
                        : "Pick something on the left to see the person, their details and everything they did."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; tone: string; label: string; value: React.ReactNode; hint: React.ReactNode }) {
  return (
    <li className="card flex flex-col gap-3 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", tone)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="display text-3xl tabular-nums md:text-[2rem]">{value}</div>
      <div className="text-xs text-muted">{hint}</div>
    </li>
  );
}

function Empty({ query }: { query: string }) {
  return (
    <li className="px-6 py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface text-faint">
        <Search className="size-5" />
      </span>
      <p className="mt-3 font-semibold">{query ? "No matches" : "Nothing here yet"}</p>
      <p className="mt-1 text-sm text-muted">{query ? "Try a different name, email or word." : "New messages, feedback and votes will show up here."}</p>
    </li>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="btn btn-ghost py-2 text-sm pointer-coarse:min-h-11"
      aria-label={label}
    >
      {done ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />} {done ? "Copied" : "Copy email"}
    </button>
  );
}

function Detail({ item, visitor, now, backRef, onBack, onPick }: { item?: Item; visitor: Visitor; now: number | null; backRef: React.Ref<HTMLButtonElement>; onBack: () => void; onPick: (id: string) => void }) {
  const chips = [
    { icon: Monitor, v: device(visitor.info.userAgent) },
    { icon: Timer, v: visitor.info.timezone },
    { icon: Languages, v: visitor.info.language },
    { icon: Monitor, v: visitor.info.screen && `Screen ${visitor.info.screen}` },
    { icon: Globe, v: visitor.info.referrer && `From ${visitor.info.referrer.replace(/^https?:\/\//, "").slice(0, 40)}` },
    { icon: Monitor, v: visitor.info.viewport && `Window ${visitor.info.viewport}` },
    { icon: Monitor, v: visitor.info.platform && `Platform ${visitor.info.platform}` },
    { icon: Monitor, v: visitor.info.colorScheme && `${visitor.info.colorScheme} mode` },
    { icon: Monitor, v: visitor.info.touch !== undefined && (visitor.info.touch ? "Touch screen" : "Mouse / trackpad") },
    { icon: Globe, v: visitor.info.utm && `Campaign ${visitor.info.utm}` },
    { icon: Globe, v: visitor.info.landing && `Landed on ${visitor.info.landing}` },
    { icon: Users, v: visitor.info.visits && `${visitor.info.visits} ${visitor.info.visits === 1 ? "visit" : "visits"}` },
  ].filter((c) => c.v);

  const subject = encodeURIComponent(item?.kind === "message" ? "Re: your message" : "Thanks for your feedback");
  const quoted = item?.body ? encodeURIComponent(`\n\n---\nOn ${absolute(item.at)} you wrote:\n> ${item.body.split("\n").join("\n> ")}`) : "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 lg:hidden">
        <button ref={backRef} type="button" onClick={onBack} className="btn btn-ghost py-2.5 text-sm pointer-coarse:min-h-11">
          <ChevronLeft className="size-4" /> Back
        </button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-5 md:p-7">
        {/* Person */}
        <div className="flex flex-wrap items-start gap-4">
          <Avatar seed={visitor.id} name={visitor.name} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight">{visitor.name ?? "Anonymous visitor"}</h2>
            <p className="truncate text-sm text-muted">
              {[visitor.email, visitor.company].filter(Boolean).join(" · ") || `Visitor ${visitor.id.slice(0, 8)}`}
            </p>
            <p className="mt-0.5 text-xs text-faint">
              First seen {absolute(visitor.first)} · last active {ago(visitor.last, now)}
            </p>
          </div>
          {visitor.email && (
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${visitor.email}?subject=${subject}&body=${quoted}`} className="btn btn-primary py-2 text-sm pointer-coarse:min-h-11">
                <Mail className="size-4" /> Reply
              </a>
              <CopyButton value={visitor.email} label={`Copy ${visitor.email}`} />
            </div>
          )}
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <li key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-muted">
                <c.icon className="size-3.5 text-faint" /> {c.v}
              </li>
            ))}
          </ul>
        )}

        {/* Selected item */}
        {item && (
          <section className="rounded-2xl border border-line bg-bg-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KindBadge item={item} />
                <span className="text-sm font-semibold">{item.kind === "vote" ? `on "${item.title}"` : item.title}</span>
                {item.kind === "feedback" && <Stars n={item.rating} />}
              </div>
              <span className="text-xs text-faint">{absolute(item.at)}</span>
            </div>
            {item.body ? (
              <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{item.body}</p>
            ) : (
              <p className="mt-3 text-sm text-muted">{item.kind === "vote" ? `${item.value === "up" ? "Found this answer helpful." : "Felt this answer missed the mark."}` : "No comment left."}</p>
            )}
          </section>
        )}

        {(visitor.views > 0 || visitor.asked.length > 0) && (
          <section className="rounded-2xl border border-line p-5">
            <h3 className="eyebrow mb-2">Browsing</h3>
            <p className="text-sm text-muted">
              {visitor.views} {visitor.views === 1 ? "visit" : "visits"} · {visitor.asked.length} {visitor.asked.length === 1 ? "question" : "questions"} asked
            </p>
            {visitor.asked.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(visitor.asked)].map((q) => (
                  <li key={q} className="tag">
                    {q}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Timeline */}
        <section>
          <h3 className="eyebrow mb-3">Activity · {visitor.items.length}</h3>
          <ol className="relative space-y-1 border-l border-line pl-5">
            {visitor.items.map((it) => (
              <li key={it.id} className="relative">
                <span className={cn("absolute top-3.5 -left-[25px] size-2 rounded-full ring-4 ring-card", it.id === item?.id ? "bg-accent" : "bg-surface-strong")} />
                <button type="button" onClick={() => onPick(it.id)} className={cn("w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-bg-soft", it.id === item?.id && "bg-bg-soft")}>
                  <span className="flex flex-wrap items-center gap-2">
                    <KindBadge item={it} />
                    <span className="truncate text-sm font-medium">{it.kind === "vote" ? `"${it.title}"` : it.title}</span>
                    <span className="ml-auto text-xs text-faint" title={absolute(it.at)}>
                      {ago(it.at, now)}
                    </span>
                  </span>
                  {it.body && <span className="mt-1 line-clamp-2 block text-sm text-muted">{it.body}</span>}
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function VotesTable({ db, labels, query }: { db: Pick<AdminData, "votes">; labels: Record<string, string>; query: string }) {
  const rows = useMemo(() => {
    const m = new Map<string, { up: number; down: number }>();
    for (const v of db.votes) {
      const r = m.get(v.intentId) ?? { up: 0, down: 0 };
      r[v.value]++;
      m.set(v.intentId, r);
    }
    return [...m.entries()].map(([id, r]) => ({ id, label: labels[id] ?? id, ...r, total: r.up + r.down })).sort((a, b) => b.total - a.total);
  }, [db.votes, labels]);
  const shown = rows.filter((r) => !query || r.label.toLowerCase().includes(query));
  if (!shown.length) return <ul><Empty query={query} /></ul>;
  return (
    <ul className="divide-y divide-line">
      {shown.map((r) => {
        const pct = Math.round((r.up / r.total) * 100);
        return (
          <li key={r.id} className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-semibold">{r.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{pct}%</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong" aria-label={`${pct}% positive`}>
                <span className={cn("block h-full rounded-full", pct >= 50 ? "bg-emerald-500" : "bg-accent")} style={{ width: `${pct}%` }} />
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted tabular-nums">
                <ThumbsUp className="size-3.5" /> {r.up}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted tabular-nums">
                <ThumbsDown className="size-3.5" /> {r.down}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const ROUTE = {
  answer: { label: "Answered", tone: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-400" },
  topic: { label: "Routed", tone: "bg-sky-500/12 text-sky-800 dark:text-sky-400" },
  gated: { label: "Needs access", tone: "bg-amber-500/12 text-amber-800 dark:text-amber-400" },
  decline: { label: "Declined", tone: "bg-surface text-muted" },
  error: { label: "Failed", tone: DOWN_TONE },
} as const;

/** Free-form questions the AI handled, newest first, with the visitors' thumbs on each answer. */
function AiAnswersTable({ db, labels, query, now }: { db: Pick<AdminData, "aiAnswers" | "votes">; labels: Record<string, string>; query: string; now: number | null }) {
  const votes = useMemo(() => {
    const m = new Map<string, { up: number; down: number }>();
    for (const v of db.votes) {
      if (!v.answerId) continue;
      const r = m.get(v.answerId) ?? { up: 0, down: 0 };
      r[v.value]++;
      m.set(v.answerId, r);
    }
    return m;
  }, [db.votes]);
  const rows = useMemo(() => [...db.aiAnswers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db.aiAnswers]);
  const shown = rows.filter((a) => !query || a.question.toLowerCase().includes(query) || a.answer?.toLowerCase().includes(query));
  if (!shown.length) return <ul><Empty query={query} /></ul>;
  return (
    <ul className="divide-y divide-line">
      {shown.map((a) => {
        const r = ROUTE[a.route];
        const v = votes.get(a.id);
        return (
          <li key={a.id} className="space-y-1.5 px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", r.tone)}>
                <Sparkles className="size-3" /> {r.label}
              </span>
              {a.route === "topic" && a.intentId && <span>to {labels[a.intentId] ?? a.intentId}</span>}
              <span className="ml-auto tabular-nums" title={absolute(a.createdAt)}>
                {ago(a.createdAt, now)}
                {a.model ? ` · ${a.model}` : ""} · {(a.ms / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="font-semibold">{a.question}</p>
            {a.answer && <p className="text-sm leading-relaxed text-muted">{plain(a.answer)}</p>}
            {a.cards?.length ? <p className="text-xs text-faint">Cards: {a.cards.join(", ")}</p> : null}
            {v && (
              <p className="flex items-center gap-3 text-xs text-muted tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="size-3.5" /> {v.up}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ThumbsDown className="size-3.5" /> {v.down}
                </span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
