"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { enText, idFrom, move, removeQuestion, renameQuestion } from "@/lib/persona/edit";
import { ICON_NAMES, QIcon } from "@/lib/persona/icons";
import type { LText } from "@/lib/persona/text";
import { cn } from "@/lib/utils";
import { adminFetch } from "./api";
import { IdListPicker, LTextInput, LTextList, ListInput, Panel, SelectInput, TextInput, Toggle, VisBadge, iconBtn, inputCls, smallBtn } from "./controls";
import { ImportDialog } from "./import-dialog";
import type { TabProps } from "./studio";
import type { Doc } from "./use-draft";

type Question = NonNullable<Doc["questions"]>[number];
type Block = NonNullable<Question["blocks"]>[number];

const SHARED: Record<string, string> = {
  download: "Download the document",
  "request-access": "Enter a code / ask for access",
  "contact-form": "Contact form",
  "feedback-form": "Feedback form",
  suggest: "Suggested questions",
  privacy: "Privacy note",
};
const LEGACY = ["stats", "focus", "beliefs", "experience", "projects", "skills", "cloud", "education", "languages", "contact", "hire", "quotes", "stack"];

const blockKey = (b: Block) => (b.kind === "section" ? `section:${b.key}` : b.kind === "project" ? `project:${b.id}` : b.kind);
const toBlock = (key: string): Block => (key.startsWith("section:") ? { kind: "section", key: key.slice(8) } : key.startsWith("project:") ? { kind: "project", id: key.slice(8) } : ({ kind: key } as Block));

/** The cards an answer shows under its text (max `max`). */
function BlockPicker({ label, hint, value, doc, visibility, onChange, max }: { label: string; hint?: string; value: Block[] | undefined; doc: Doc; visibility: "public" | "unlocked"; onChange: (v: Block[]) => void; max: number }) {
  const [project, setProject] = useState("");
  const sections = (doc.sections ?? []).filter((s) => (s.inChat ?? true) && s.visibility !== "private" && (visibility === "unlocked" || s.visibility === "public"));
  const options = [
    ...sections.map((s) => ({ id: `section:${s.key}`, label: `Card: ${enText(s.title) || s.key}` })),
    ...Object.entries(SHARED).map(([id, l]) => ({ id, label: l })),
    ...(doc.legacy ? LEGACY.map((id) => ({ id, label: `Job card: ${id}` })) : []),
    // Cards already chosen that aren't in the menu (projects, hidden sections) still show as chips.
    ...(value ?? []).map(blockKey).filter((k) => k.startsWith("project:")).map((id) => ({ id, label: `Project: ${id.slice(8)}` })),
  ];
  const keys = (value ?? []).map(blockKey);
  return (
    <div className="space-y-2">
      <IdListPicker label={label} hint={hint} value={keys} options={options} max={max} onChange={(next) => onChange(next.map(toBlock))} />
      {doc.legacy && keys.length < max && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = project.trim().toLowerCase();
            if (/^[a-z0-9][a-z0-9-]*$/.test(id)) onChange([...(value ?? []), { kind: "project", id }]);
            setProject("");
          }}
        >
          <input aria-label="Project id to add as a card" value={project} onChange={(e) => setProject(e.target.value)} placeholder="project id" className={cn(inputCls, "w-48 py-1.5 text-sm")} />
          <button type="submit" className={smallBtn}>
            Add project card
          </button>
        </form>
      )}
    </div>
  );
}

function QuestionEditor({ slug, q, index, doc, bangla, ai, update, onRenamed, onDeleted }: { slug: string; q: Question; index: number; doc: Doc; bangla: boolean; ai: boolean; update: (fn: (d: Doc) => void) => void; onRenamed: (id: string) => void; onDeleted: () => void }) {
  const [idText, setIdText] = useState(q.id);
  const [seen, setSeen] = useState(q.id);
  const [idError, setIdError] = useState<string>();
  const [drafting, setDrafting] = useState(false);
  const [aiError, setAiError] = useState<string>();
  if (seen !== q.id) {
    setSeen(q.id);
    setIdText(q.id);
  }
  const setQ = (fn: (x: Question) => void) => update((d) => fn(d.questions![index]));
  const others = (doc.questions ?? []).filter((x) => x.id !== q.id).map((x) => ({ id: x.id, label: enText(x.label) || x.id }));

  const commitId = () => {
    const next = idText.trim();
    if (next === q.id) return setIdError(undefined);
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(next) || next === "ai" || next === "fallback") return setIdError("Use lowercase letters, digits and dashes (not ai or fallback).");
    if ((doc.questions ?? []).some((x) => x.id === next)) return setIdError("Another question already uses this id.");
    setIdError(undefined);
    update((d) => renameQuestion(d, q.id, next));
    onRenamed(next);
  };

  const draftAnswer = async () => {
    setDrafting(true);
    setAiError(undefined);
    const res = await adminFetch<{ answer: { en: string; bn?: string } }>("/api/admin/ai/", { body: { action: "draft-answer", slug, doc, label: enText(q.label), prompt: enText(q.prompt) } });
    setDrafting(false);
    if (!res.ok) return setAiError(res.error);
    const a = res.data.answer;
    const text: LText = a.bn ? { en: a.en, bn: a.bn } : a.en;
    setQ((x) => {
      const empty = x.answers.findIndex((t) => !enText(t).trim());
      if (empty >= 0) x.answers[empty] = text;
      else x.answers.push(text);
    });
  };

  return (
    <div className="space-y-4">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <QIcon name={q.icon} className="size-5 text-muted" /> {enText(q.label) || "New question"}
          </span>
        }
        actions={
          <>
            <button type="button" className={iconBtn} disabled={index === 0} onClick={() => update((d) => move(d.questions!, index, -1))} aria-label="Move this question up" title="Move up">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" className={iconBtn} disabled={index === (doc.questions ?? []).length - 1} onClick={() => update((d) => move(d.questions!, index, 1))} aria-label="Move this question down" title="Move down">
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              className={cn(smallBtn, "hover:text-accent")}
              onClick={() => {
                if (!window.confirm(`Delete "${enText(q.label)}"? Links to it (follow-ups, landing chips, menus) are removed too.`)) return;
                update((d) => removeQuestion(d, q.id));
                onDeleted();
              }}
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LTextInput label="Button label" hint="Short: Family, Education & career." value={q.label} onChange={(v) => setQ((x) => void (x.label = v ?? ""))} bangla={bangla} />
          <LTextInput label="The question it asks" hint="As a visitor would type it." value={q.prompt} onChange={(v) => setQ((x) => void (x.prompt = v ?? ""))} bangla={bangla} />
        </div>
        <LTextList
          label="Answers"
          hint="Written in your voice; **bold** works. With more than one, the first is used (or a random one, see below)."
          value={q.answers}
          onChange={(v) => setQ((x) => void (x.answers = v.length ? v : [""]))}
          bangla={bangla}
          multiline
          min={1}
          max={40}
          addLabel="Add another answer"
          what="answer"
        />
        {ai && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={smallBtn} disabled={drafting} onClick={() => void draftAnswer()}>
              {drafting ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Draft an answer from my facts
            </button>
            {aiError && (
              <span role="alert" className="text-sm font-medium text-accent">
                {aiError}
              </span>
            )}
          </div>
        )}
        <ListInput label="Keywords" hint="Words and phrases that should lead here, in English and Bangla (comma-separated)." value={q.keywords} onChange={(v) => setQ((x) => void (x.keywords = v))} />
        <BlockPicker label="Cards under the answer" hint="Up to 4. A section card shows that section's items." value={q.blocks} doc={doc} visibility={q.visibility ?? "public"} max={4} onChange={(v) => setQ((x) => void (x.blocks = v))} />
        <IdListPicker label="Follow-up questions" hint="Suggested after this answer (up to 4)." value={q.followUps} options={others} max={4} onChange={(v) => setQ((x) => void (x.followUps = v))} />
      </Panel>

      <Panel title="Settings">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <SelectInput label="Icon" value={q.icon ?? "sparkles"} options={ICON_NAMES.map((n) => ({ value: n, label: n }))} onChange={(v) => setQ((x) => void (x.icon = v))} />
          </div>
          <SelectInput
            label="Who sees this question"
            value={q.visibility ?? "public"}
            options={[
              { value: "public", label: "Everyone" },
              { value: "unlocked", label: "With access code" },
            ]}
            onChange={(v) => setQ((x) => void (x.visibility = v))}
          />
          <div>
            <label htmlFor={`qid-${index}`} className="mb-1 block text-sm font-semibold">
              Id
            </label>
            <input
              id={`qid-${index}`}
              value={idText}
              onChange={(e) => setIdText(e.target.value)}
              onBlur={commitId}
              onKeyDown={(e) => e.key === "Enter" && commitId()}
              aria-invalid={idError ? true : undefined}
              aria-describedby={`qid-${index}-hint`}
              className={cn(inputCls, "font-mono text-sm")}
            />
            <p id={`qid-${index}-hint`} className={cn("mt-1 text-[13px]", idError ? "font-medium text-accent" : "text-muted")}>
              {idError ?? `Its page: /ask/${q.id}/`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Toggle label="Main topic" hint="Listed when a visitor types /, and preferred when matching." checked={q.primary ?? false} onChange={(v) => setQ((x) => void (x.primary = v))} />
          <Toggle label="Random answer" hint="Plays a random one of the answers each time." checked={q.random ?? false} onChange={(v) => setQ((x) => void (x.random = v))} />
        </div>
        <TextInput label="Page that covers it (optional)" hint="An indexable page with more on this topic, for example /about/." value={q.page} onChange={(v) => setQ((x) => void (x.page = v || undefined))} className="max-w-md" mono />
      </Panel>
    </div>
  );
}

function Layout({ doc, bangla, update }: { doc: Doc; bangla: boolean; update: (fn: (d: Doc) => void) => void }) {
  const options = (doc.questions ?? []).map((q) => ({ id: q.id, label: enText(q.label) || q.id }));
  const sidebar = doc.sidebar ?? [];
  return (
    <div className="space-y-4">
      <Panel title="First screen" description="Chips under the greeting, the first thing visitors can tap.">
        <IdListPicker label="Landing chips" hint="Up to 6." value={doc.landing} options={options} max={6} onChange={(v) => update((d) => void (d.landing = v))} />
      </Panel>
      <Panel title="Sidebar menu" description="Up to 4 groups of questions in the sidebar (and the mobile menu).">
        {sidebar.map((g, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-end gap-3">
              <LTextInput label={`Group ${i + 1} title`} value={g.title} onChange={(v) => update((d) => void (d.sidebar![i].title = v ?? ""))} bangla={bangla} className="min-w-56 flex-1" />
              <Toggle label="With icons" checked={g.icons ?? false} onChange={(v) => update((d) => void (d.sidebar![i].icons = v))} />
              <button type="button" className={cn(iconBtn, "hover:text-accent")} onClick={() => update((d) => void d.sidebar!.splice(i, 1))} aria-label={`Remove group ${i + 1}`}>
                <X className="size-4" />
              </button>
            </div>
            <IdListPicker label="Questions" value={g.questionIds} options={options} max={80} onChange={(v) => update((d) => void (d.sidebar![i].questionIds = v))} />
          </div>
        ))}
        {sidebar.length < 4 && (
          <button type="button" className={smallBtn} onClick={() => update((d) => void (d.sidebar ??= []).push({ title: "Ask about", questionIds: [], icons: true }))}>
            <Plus className="size-4" /> Add a group
          </button>
        )}
      </Panel>
      <Panel title="After an AI answer" description="Questions suggested when the AI's answer doesn't suggest its own.">
        <IdListPicker label="Default follow-ups" hint="Up to 4." value={doc.defaultFollowUps} options={options} max={4} onChange={(v) => update((d) => void (d.defaultFollowUps = v))} />
      </Panel>
      <Panel title="When nothing matches" description="The answer when a question matches nothing and the AI is off (or declines).">
        <LTextList
          label="Answers"
          value={doc.fallback?.answers ?? ["That's outside what this chat covers. Try one of these:"]}
          onChange={(v) => update((d) => void ((d.fallback ??= { answers: [] }).answers = v.length ? v : ["That's outside what this chat covers. Try one of these:"]))}
          bangla={bangla}
          multiline
          min={1}
          max={6}
          what="answer"
        />
        <BlockPicker label="Cards" value={doc.fallback?.blocks ?? [{ kind: "suggest" }]} doc={doc} visibility="public" max={2} onChange={(v) => update((d) => void ((d.fallback ??= { answers: ["That's outside what this chat covers. Try one of these:"] }).blocks = v))} />
      </Panel>
    </div>
  );
}

export function QuestionsTab({ slug, draft, doc, bangla, ai, focus }: TabProps) {
  const questions = doc.questions ?? [];
  const focusIndex = focus?.startsWith("questions.") ? Number(focus.split(".")[1]) : -1;
  const layoutFocus = !!focus && /^(landing|sidebar|defaultFollowUps|fallback)/.test(focus);
  const [view, setView] = useState<"questions" | "layout">(layoutFocus ? "layout" : "questions");
  const [selected, setSelected] = useState<string | null>(questions[focusIndex]?.id ?? questions[0]?.id ?? null);
  const [label, setLabel] = useState("");
  const [importing, setImporting] = useState(false);
  const index = questions.findIndex((q) => q.id === selected);

  const add = () => {
    const text = label.trim();
    if (!text) return;
    const id = idFrom(text, [...questions.map((q) => q.id), "ai", "fallback"], "question");
    draft.update((d) => void (d.questions ??= []).push({ id, label: text, prompt: text, answers: [""], keywords: [], blocks: [], followUps: [], icon: "sparkles", visibility: "public" }));
    setSelected(id);
    setLabel("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show" className="flex gap-1 rounded-xl border border-line bg-card p-1">
          {(
            [
              ["questions", `Questions (${questions.length})`],
              ["layout", "Landing & menus"],
            ] as const
          ).map(([id, text]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold text-muted", view === id && "bg-surface text-fg")}>
              {text}
            </button>
          ))}
        </div>
        <button type="button" className={cn(smallBtn, "ml-auto")} onClick={() => setImporting(true)}>
          <Sparkles className="size-4" /> Import or suggest questions
        </button>
      </div>

      {view === "layout" ? (
        <Layout doc={doc} bangla={bangla} update={draft.update} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[17rem_1fr]">
          <div className="lg:hidden">
            <SelectInput label="Question" value={selected ?? ""} options={questions.map((q) => ({ value: q.id, label: enText(q.label) || q.id }))} onChange={setSelected} />
          </div>
          <div className="order-2 space-y-3 lg:order-1">
            <nav aria-label="Questions" className="card hidden max-h-[70dvh] overflow-y-auto lg:block">
              <ul className="divide-y divide-line">
                {questions.map((q) => (
                  <li key={q.id}>
                    <button type="button" onClick={() => setSelected(q.id)} aria-current={selected === q.id ? "true" : undefined} className={cn("flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface", selected === q.id && "bg-surface")}>
                      <QIcon name={q.icon} className="size-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate font-medium">{enText(q.label) || q.id}</span>
                      {q.primary && <Star className="size-3.5 shrink-0 fill-current text-amber-500" aria-label="Main topic" />}
                      {q.visibility === "unlocked" && <VisBadge v="unlocked" />}
                    </button>
                  </li>
                ))}
                {questions.length === 0 && <li className="px-3.5 py-3 text-sm text-muted">No questions yet.</li>}
              </ul>
            </nav>
            <form
              className="card flex items-end gap-2 p-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <TextInput label="New question" placeholder="Button label" value={label} onChange={setLabel} className="flex-1" />
              <button type="submit" className={smallBtn} disabled={!label.trim()} aria-label="Add question">
                <Plus className="size-4" />
              </button>
            </form>
          </div>
          {index >= 0 ? (
            <div className="order-1 min-w-0 lg:order-2">
            <QuestionEditor key={index} slug={slug} q={questions[index]} index={index} doc={doc} bangla={bangla} ai={ai} update={draft.update} onRenamed={setSelected} onDeleted={() => setSelected(questions.find((q) => q.id !== selected)?.id ?? null)} />
            </div>
          ) : (
            <p className="card order-1 p-5 text-muted lg:order-2">Pick a question, or add one.</p>
          )}
        </div>
      )}
      {importing && <ImportDialog slug={slug} draft={draft} doc={doc} ai={ai} onClose={() => setImporting(false)} />}
    </div>
  );
}
