"use client";

import { useState } from "react";
import { Eye, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { idFrom, removeHeroPool } from "@/lib/persona/edit";
import { cn } from "@/lib/utils";
import { adminFetch } from "./api";
import { IdListPicker, LTextInput, LTextList, NumberInput, Panel, SelectInput, Toggle, iconBtn, smallBtn } from "./controls";
import type { TabProps } from "./studio";

type PromptView = { prompt: string; tokens: number; retrieval: boolean; gated: string[]; leakTerms: number };

export function HeroRulesTab({ slug, draft, doc, bangla }: TabProps) {
  const set = draft.update;
  const hero = doc.hero;
  const rules = doc.rules ?? {};
  const [tier, setTier] = useState<"public" | "unlocked">("public");
  const [view, setView] = useState<PromptView | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const showPrompt = async (t: "public" | "unlocked") => {
    setTier(t);
    setLoading(true);
    setError(undefined);
    const res = await adminFetch<PromptView>(`/api/admin/personas/${slug}/prompt/`, { body: { doc, tier: t } });
    setLoading(false);
    if (res.ok) setView(res.data);
    else {
      setView(null);
      setError([res.error, ...((res.data.issues as string[] | undefined) ?? [])].join(" "));
    }
  };

  return (
    <div className="space-y-5">
      <Panel title="Hero" description="The typed greeting on the first screen. Each part is one piece of the sentence; the first line of every part is typed first, then parts swap their lines in the order below.">
        <LTextInput label="Text without animation" hint="Shown to search engines, screen readers and visitors who turn off motion." value={hero.staticIntro} onChange={(v) => set((d) => void (d.hero.staticIntro = v ?? ""))} bangla={bangla} multiline rows={2} />
        <div className="space-y-3">
          {hero.pools.map((p, i) => (
            <div key={`${p.id}-${i}`} className="space-y-3 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold">
                  Part {i + 1} <span className="font-mono text-xs font-normal text-faint">{p.id}</span>
                </p>
                <Toggle label="Typed in the first pass" checked={p.firstPass !== false} onChange={(v) => set((d) => void (d.hero.pools[i].firstPass = v ? undefined : false))} />
                <button type="button" className={cn(iconBtn, "ml-auto hover:text-accent")} onClick={() => set((d) => removeHeroPool(d, p.id))} aria-label={`Remove part ${i + 1}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <LTextList label="Lines" value={p.lines} onChange={(v) => set((d) => void (d.hero.pools[i].lines = v.length ? v : [""]))} bangla={bangla} min={1} max={24} what="line" addLabel="Add a line" />
            </div>
          ))}
          {hero.pools.length < 6 && (
            <button type="button" className={smallBtn} onClick={() => set((d) => void d.hero.pools.push({ id: idFrom(`part-${d.hero.pools.length + 1}`, d.hero.pools.map((x) => x.id)), lines: [""] }))}>
              <Plus className="size-4" /> Add a part
            </button>
          )}
        </div>
        <IdListPicker
          label="Swap order"
          hint="After the first pass, which part changes next (a part may appear more than once)."
          value={hero.schedule}
          options={hero.pools.map((p, i) => ({ id: p.id, label: `Part ${i + 1}` }))}
          max={32}
          onChange={(v) => set((d) => void (d.hero.schedule = v))}
        />
        <div className="flex flex-wrap gap-2">
          {hero.pools.map((p, i) => (
            <button key={p.id} type="button" className={smallBtn} onClick={() => set((d) => void (d.hero.schedule ??= []).push(p.id))}>
              <Plus className="size-4" /> Part {i + 1} again
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="How the AI answers" description="Rules for free questions. Facts come from Knowledge; these set the voice and the limits.">
        <LTextInput label="Voice" hint="How you sound: friendly, humble, direct..." value={rules.voice} onChange={(v) => set((d) => void ((d.rules ??= {}).voice = v ?? ""))} bangla={false} multiline rows={2} />
        <LTextInput label="Who visits" hint="Recruiters; families looking for a match..." value={rules.audience} onChange={(v) => set((d) => void ((d.rules ??= {}).audience = v))} bangla={false} multiline rows={2} optional />
        <LTextList label="Boundaries" hint="Things the AI must or must not do, one per line." value={rules.boundaries} onChange={(v) => set((d) => void ((d.rules ??= {}).boundaries = v))} bangla={false} multiline what="rule" addLabel="Add a rule" />
        <div className="flex flex-wrap items-end gap-4">
          <SelectInput
            label="Answer language"
            value={rules.language ?? "match"}
            options={[
              { value: "match", label: "The visitor's language" },
              { value: "en", label: "Always English" },
              { value: "bn", label: "Always Bangla" },
            ]}
            onChange={(v) => set((d) => void ((d.rules ??= {}).language = v))}
            className="w-60"
          />
          <NumberInput label="Longest answer (words)" value={rules.maxWords ?? 90} min={30} max={250} onChange={(v) => set((d) => void ((d.rules ??= {}).maxWords = v === undefined ? undefined : Math.min(250, Math.max(30, v))))} />
        </div>
        <LTextInput label="Anything else" value={rules.extra} onChange={(v) => set((d) => void ((d.rules ??= {}).extra = v))} bangla={false} multiline rows={3} optional />
      </Panel>

      <Panel
        title="What the AI sees"
        description="The exact instructions and knowledge sent with every free question, for each kind of visitor. Values the visitor may not see are left out."
        actions={
          <>
            <button type="button" className={smallBtn} disabled={loading} onClick={() => void showPrompt("public")}>
              {loading && tier === "public" ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />} For a visitor
            </button>
            <button type="button" className={smallBtn} disabled={loading} onClick={() => void showPrompt("unlocked")}>
              {loading && tier === "unlocked" ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />} With an access code
            </button>
          </>
        }
      >
        {error && (
          <p role="alert" className="text-sm font-medium text-accent">
            {error}
          </p>
        )}
        {view && (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              About {view.tokens.toLocaleString("en-GB")} tokens{view.retrieval ? " (large: the most relevant facts are picked per question)" : ""}.
              {view.gated.length > 0 && ` Shared only with a code: ${view.gated.join(", ")}.`}
            </p>
            <pre className="max-h-[60dvh] overflow-auto rounded-xl bg-bg-soft p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{view.prompt}</pre>
          </div>
        )}
      </Panel>
    </div>
  );
}
