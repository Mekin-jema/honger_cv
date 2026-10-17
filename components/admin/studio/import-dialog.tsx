"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, Sparkles, X } from "lucide-react";
import { parsePersonaMarkdown, renderPersonaMarkdown } from "@/lib/persona/markdown";
import { describeMerge, mergeMarkdown } from "@/lib/persona/merge";
import { cn } from "@/lib/utils";
import { adminFetch } from "./api";
import { Toggle, inputCls, smallBtn } from "./controls";
import type { Doc, DraftApi } from "./use-draft";

const EXAMPLE = `## Personal information || ব্যক্তিগত তথ্য (facts) [public] {personal}
- Height || উচ্চতা: 5'8"
- Present address: [unlocked] House 99, Road 7, Dhaka
## Education (timeline) [public]
- 2017-2021 | BSc in CSE | North South University | CGPA 3.5
## About me (paragraphs) [public]
A paragraph. A blank line starts the next one.
## Questions
### Family {family}
Prompt: Tell me about your family.
Keywords: family, parents, পরিবার
Answer: My family is small and close.
Shows: personal
Follow-ups: about`;

const GUIDE: [string, string][] = [
  ["## Title (kind) [who] {key}", "A section. Kinds: facts, paragraphs, list, timeline, tags, gallery, quotes. Who: public (everyone), unlocked (with an access code), private (only you). {key} is optional."],
  ["- Label: value", "A fact. Start the value with [unlocked] or [private] to hide it more than its section."],
  ["- period | title | place | details", "A timeline line (write ? when there is no period)."],
  ["- Group: tag, tag", "Tags. Gallery: - /images/file.webp | caption. Quotes: - quote | who | role."],
  ["English || বাংলা", "Bangla next to the English, anywhere."],
  ["## Questions, then ### Label {id}", "A quick question, with Prompt:, Keywords:, Answer:, Shows: (section keys), Follow-ups: (question ids)."],
];

/**
 * Paste the Markdown template (or free text for the AI to structure), see exactly what changes, then
 * apply it to the draft. Nothing is applied before "Apply"; applying is an ordinary autosaved edit.
 */
export function ImportDialog({ slug, draft, doc, ai, onClose }: { slug: string; draft: DraftApi; doc: Doc; ai: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"template" | "free">("template");
  const [text, setText] = useState("");
  const [free, setFree] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string>();
  const [removeSections, setRemoveSections] = useState(false);
  const [removeQuestions, setRemoveQuestions] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    const parsed = parsePersonaMarkdown(text);
    const merged = mergeMarkdown(doc, parsed, { removeMissingSections: removeSections, removeMissingQuestions: removeQuestions });
    return { parsed, merged, lines: describeMerge(merged.summary) };
  }, [text, doc, removeSections, removeQuestions]);

  const runAi = async (action: "structure" | "suggest") => {
    setBusy(action);
    setAiError(undefined);
    const res = await adminFetch<{ markdown: string }>("/api/admin/ai/", { body: { action, slug, doc, text: free } });
    setBusy(null);
    if (!res.ok) return setAiError(res.error);
    setText(res.data.markdown);
    setMode("template");
  };

  const apply = () => {
    if (!preview) return;
    const { doc: next } = preview.merged;
    draft.update((d) => {
      d.sections = next.sections;
      d.questions = next.questions;
    });
    ref.current?.close();
  };

  const blocked = !preview || (preview.parsed.sections.length === 0 && preview.parsed.questions.length === 0);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="import-title"
      className="m-auto max-h-[92dvh] w-[min(56rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-card p-0 text-fg shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <h2 id="import-title" className="text-lg font-semibold">
            Import or paste text
          </h2>
          <button type="button" className="icon-btn ml-auto" onClick={() => ref.current?.close()} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div role="group" aria-label="What to paste" className="flex gap-1 rounded-xl border border-line bg-bg-soft p-1">
            {(
              [
                ["template", "The template (Markdown)"],
                ["free", "Any text: let AI structure it"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-muted", mode === id && "bg-card text-fg shadow-sm")}>
                {label}
              </button>
            ))}
          </div>

          {mode === "free" ? (
            <div className="space-y-3">
              <label htmlFor="free-text" className="block text-sm font-semibold">
                Paste an old biodata, notes or a message, in English or Bangla
              </label>
              <textarea id="free-text" value={free} onChange={(e) => setFree(e.target.value)} rows={12} className={cn(inputCls, "resize-y")} placeholder="Name: ... Height: ... Father: retired teacher ..." />
              <p className="text-[13px] text-muted">The AI only sorts what you wrote into the template (phone numbers, addresses and family names become &ldquo;with access code&rdquo;). You check the result before anything changes. Private sections are never sent.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={!ai || !!busy || free.trim().length < 10} onClick={() => void runAi("structure")}>
                  {busy === "structure" ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Turn it into the template
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="md-text" className="mr-auto text-sm font-semibold">
                  The template
                </label>
                <button type="button" className={smallBtn} onClick={() => setText(renderPersonaMarkdown({ sections: (doc.sections ?? []) as never, questions: (doc.questions ?? []) as never }, `Persona: ${slug}`))}>
                  Start from my current data
                </button>
                <button type="button" className={smallBtn} disabled={!ai || !!busy} onClick={() => void runAi("suggest")} title={ai ? "Questions visitors are likely to ask, with answers from your facts" : "Needs GEMINI_API_KEY"}>
                  {busy === "suggest" ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Suggest questions
                </button>
              </div>
              <textarea id="md-text" value={text} onChange={(e) => setText(e.target.value)} rows={14} spellCheck={false} className={cn(inputCls, "resize-y font-mono text-[13px] leading-relaxed")} placeholder={EXAMPLE} />
              <button type="button" onClick={() => setGuide((v) => !v)} aria-expanded={guide} className="flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
                <ChevronDown className={cn("size-4 transition-transform", guide && "rotate-180")} /> How to write it
              </button>
              {guide && (
                <dl className="grid gap-x-4 gap-y-1.5 rounded-xl bg-bg-soft p-3 text-[13px] md:grid-cols-[16rem_1fr]">
                  {GUIDE.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-mono text-fg">{k}</dt>
                      <dd className="text-muted">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {aiError && (
            <p role="alert" className="text-sm font-medium text-accent">
              {aiError}
            </p>
          )}

          {mode === "template" && preview && (
            <section aria-labelledby="import-preview" className="space-y-2 rounded-xl border border-line p-3.5">
              <h3 id="import-preview" className="font-semibold">
                What will change
              </h3>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {preview.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {preview.parsed.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-accent">Lines that couldn&apos;t be read (they are skipped):</p>
                  <ul className="space-y-0.5 text-[13px] text-muted">
                    {preview.parsed.errors.slice(0, 12).map((e, i) => (
                      <li key={i}>
                        {e.line > 0 ? `Line ${e.line}: ` : ""}
                        {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                <Toggle label="Remove sections the text doesn't mention" checked={removeSections} onChange={setRemoveSections} />
                <Toggle label="Remove questions the text doesn't mention" checked={removeQuestions} onChange={setRemoveQuestions} disabled={!preview.parsed.questions.length} />
              </div>
            </section>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" className={smallBtn} onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={mode !== "template" || blocked} onClick={apply}>
            Apply to the draft
          </button>
        </div>
      </div>
    </dialog>
  );
}
