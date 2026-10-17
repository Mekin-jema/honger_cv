"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ListPlus, LoaderCircle, MessageSquarePlus, ThumbsDown } from "lucide-react";
import { enText, idFrom } from "@/lib/persona/edit";
import type { LText } from "@/lib/persona/text";
import { cn } from "@/lib/utils";
import { adminFetch } from "./api";
import { LTextInput, SelectInput, smallBtn } from "./controls";
import type { TabProps } from "./studio";

type Entry = {
  id: string;
  question: string;
  route: string;
  answer: string | null;
  intentId: string | null;
  tier: string;
  lang: string | null;
  declineReason: string | null;
  confidence: string | null;
  flags: Record<string, unknown> | null;
  down: number;
  createdAt: string;
};
type Group = { key: string; entries: Entry[]; reasons: string[] };

const norm = (q: string) =>
  q
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function reasons(e: Entry): string[] {
  const out: string[] = [];
  if (e.route === "decline") out.push(e.declineReason === "off-topic" ? "Off-topic" : e.declineReason === "unsafe" ? "Unsafe or a trick" : e.declineReason === "missing-fact" ? "Not in your facts" : "Declined");
  else if (e.declineReason === "missing-fact") out.push("Not in your facts");
  if (e.route === "gated") out.push("Needed an access code");
  if (e.route === "error") out.push("AI error");
  if (e.confidence === "low") out.push("Unsure");
  if (e.flags?.leak) out.push("Tried to reveal a hidden value (stopped)");
  if (e.down) out.push("Voted down");
  return out;
}

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function AddFact({ group, doc, bangla, onAdd, onCancel }: { group: Group; doc: TabProps["doc"]; bangla: boolean; onAdd: (section: string, label: LText, value: LText) => void; onCancel: () => void }) {
  const factSections = (doc.sections ?? []).filter((s) => s.display === "facts");
  const [section, setSection] = useState(factSections[0]?.key ?? "");
  const [label, setLabel] = useState<LText | undefined>(group.entries[0].question.slice(0, 60));
  const [value, setValue] = useState<LText | undefined>("");
  if (!factSections.length) return <p className="text-sm text-muted">Add a &ldquo;facts&rdquo; section in Knowledge first.</p>;
  return (
    <form
      className="space-y-3 rounded-xl bg-bg-soft p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (section && label && value && enText(value).trim()) onAdd(section, label, value);
      }}
    >
      <SelectInput label="Section" value={section} options={factSections.map((s) => ({ value: s.key, label: enText(s.title) || s.key }))} onChange={setSection} className="max-w-xs" />
      <div className="grid gap-3 md:grid-cols-2">
        <LTextInput label="Label" value={label} onChange={setLabel} bangla={bangla} />
        <LTextInput label="Value" value={value} onChange={setValue} bangla={bangla} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={!value || !enText(value).trim()}>
          Add the fact
        </button>
        <button type="button" className={smallBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ReviewTab({ slug, draft, doc, bangla, go }: TabProps) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const res = await adminFetch<{ entries: Entry[] }>(`/api/admin/personas/${slug}/review/`);
    if (res.ok) setEntries(res.data.entries);
    else setError(res.error);
  }, [slug]);
  useEffect(() => {
    // Loads once; state is set when the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries ?? []) {
      const k = norm(e.question);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()]
      .map(([key, list]) => ({ key, entries: list, reasons: [...new Set(list.flatMap(reasons))] }))
      .filter((g) => !filter || g.key.includes(norm(filter)))
      .sort((a, b) => b.entries.length - a.entries.length || b.entries[0].createdAt.localeCompare(a.entries[0].createdAt));
  }, [entries, filter]);

  const resolve = async (g: Group, promotedTo?: string) => {
    setBusy(g.key);
    const res = await adminFetch(`/api/admin/personas/${slug}/review/`, { body: { ids: g.entries.map((e) => e.id), promotedTo } });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    const ids = new Set(g.entries.map((e) => e.id));
    setEntries((list) => (list ?? []).filter((e) => !ids.has(e.id)));
  };

  const addQuestion = async (g: Group) => {
    const text = g.entries[0].question.trim();
    const answer = g.entries.find((e) => e.answer)?.answer;
    const questions = doc.questions ?? [];
    const id = idFrom(text.split(/\s+/).slice(0, 6).join(" "), [...questions.map((q) => q.id), "ai", "fallback"], "question");
    draft.update((d) => void (d.questions ??= []).push({ id, label: text.slice(0, 60), prompt: text, answers: [answer ?? "TODO: write the answer"], keywords: [], blocks: [], followUps: [], icon: "sparkles", visibility: "public" }));
    await resolve(g, `question:${id}`);
    go("questions", `questions.${questions.length}`);
  };

  const addFact = async (g: Group, section: string, label: LText, value: LText) => {
    let itemId = "";
    draft.update((d) => {
      const s = d.sections?.find((x) => x.key === section);
      if (!s) return;
      itemId = idFrom(enText(label), (s.items ?? []).map((i) => i.id));
      (s.items ??= []).push({ id: itemId, label, value });
    });
    setAdding(null);
    await resolve(g, `fact:${section}/${itemId}`);
  };

  if (error)
    return (
      <p role="alert" className="card p-5 font-medium text-accent">
        {error}
      </p>
    );
  if (!entries) return <p className="card p-5 text-muted">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto max-w-2xl text-sm text-muted">
          Questions visitors asked that the AI declined, wasn&apos;t sure about, sent to &quot;access code&quot;, or that got a thumbs down. Add the missing fact or a ready-made answer; it goes live with the next publish.
        </p>
        <input aria-label="Filter questions" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." className="w-56 rounded-lg border border-line-strong bg-card px-3 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      {groups.length === 0 ? (
        <p className="card flex items-center gap-2 p-5 text-muted">
          <Check className="size-5 text-emerald-600" /> Nothing to review.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const latest = g.entries[0];
            const answer = g.entries.find((e) => e.answer)?.answer;
            return (
              <li key={g.key} className="card space-y-3 p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <p className="min-w-0 flex-1 font-semibold">
                    &ldquo;{latest.question}&rdquo;
                    {latest.lang === "bn" && <span className="ml-2 text-xs font-normal text-muted">(Bangla)</span>}
                  </p>
                  <span className="text-xs text-muted">
                    {g.entries.length > 1 ? `${g.entries.length} times · ` : ""}
                    {when(latest.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.reasons.map((r) => (
                    <span key={r} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold", r.startsWith("Voted") || r.startsWith("Tried") ? "bg-accent-soft text-accent" : "bg-surface text-muted")}>
                      {r.startsWith("Voted") && <ThumbsDown className="size-3" />}
                      {r}
                    </span>
                  ))}
                  {latest.tier === "unlocked" && <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">Visitor had a code</span>}
                </div>
                {answer && <p className="rounded-lg bg-bg-soft p-2.5 text-sm text-muted">AI said: {answer}</p>}
                {adding === g.key ? (
                  <AddFact group={g} doc={doc} bangla={bangla} onAdd={(s, l, v) => void addFact(g, s, l, v)} onCancel={() => setAdding(null)} />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={smallBtn} onClick={() => setAdding(g.key)} disabled={busy === g.key}>
                      <ListPlus className="size-4" /> Add the missing fact
                    </button>
                    <button type="button" className={smallBtn} onClick={() => void addQuestion(g)} disabled={busy === g.key}>
                      <MessageSquarePlus className="size-4" /> Make it a ready-made question
                    </button>
                    <button type="button" className={smallBtn} onClick={() => void resolve(g)} disabled={busy === g.key}>
                      {busy === g.key ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Seen, nothing to do
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
