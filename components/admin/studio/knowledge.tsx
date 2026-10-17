"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Download, FileUp, Languages, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { enText, idFrom, move, removeSection, renameSection, setBangla, uniqueId } from "@/lib/persona/edit";
import { renderPersonaMarkdown, SECTION_DISPLAYS_LIST } from "@/lib/persona/markdown";
import type { LText } from "@/lib/persona/text";
import { cn } from "@/lib/utils";
import { adminFetch, downloadText } from "./api";
import { LTextInput, LTextList, ListInput, NumberInput, Panel, RowActions, SelectInput, TextInput, Toggle, VisBadge, VisSelect, VIS_LABEL, iconBtn, inputCls, smallBtn, type Vis } from "./controls";
import { ImportDialog } from "./import-dialog";
import type { TabProps } from "./studio";
import type { Doc } from "./use-draft";

type Section = NonNullable<Doc["sections"]>[number];
type Item = NonNullable<Section["items"]>[number];
type Display = Section["display"];

const DISPLAY_HELP: Record<Display, string> = {
  facts: "Facts: a label and a value per line (Height: 5'8\")",
  paragraphs: "Paragraphs: free text",
  list: "List: one short line per item",
  timeline: "Timeline: period, title, place and details (education, jobs)",
  tags: "Tags: groups of keywords (skills, hobbies)",
  gallery: "Gallery: images with captions",
  quotes: "Quotes: what others said, with who and their role",
};

const VIS_HELP: Record<Vis, string> = {
  public: "Everyone: shown on the site, used by the AI for every visitor and by search engines.",
  unlocked: "With access code: only visitors who entered a code you gave them. The AI won't reveal it to others.",
  private: "Only me: never shown and never sent to the AI. Notes for yourself.",
};

const blankItem = (display: Display, id: string): Item =>
  display === "facts" ? { id, label: "", value: "" } : display === "timeline" ? { id, label: "", period: "", meta: "" } : display === "gallery" ? { id, src: "/images/" } : display === "tags" ? { id, label: "", tags: [] } : { id, text: "" };

const AUTO_ID = /^item(-\d+)?$/;

/** The section list on the left: pick one to edit, or add a new one. */
function SectionList({ sections, selected, onSelect, onAdd, className }: { sections: Section[]; selected: string | null; onSelect: (key: string) => void; onAdd: (title: string, display: Display, visibility: Vis) => void; className?: string }) {
  const [title, setTitle] = useState("");
  const [display, setDisplay] = useState<Display>("facts");
  const [visibility, setVisibility] = useState<Vis>("public");
  return (
    <div className={cn("space-y-3", className)}>
      <nav aria-label="Sections" className="card hidden overflow-hidden lg:block">
        <ul className="divide-y divide-line">
          {sections.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onSelect(s.key)}
                aria-current={selected === s.key ? "true" : undefined}
                className={cn("flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface", selected === s.key && "bg-surface")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{enText(s.title) || s.key}</span>
                  <span className="text-xs text-muted">
                    {s.display} · {(s.items ?? []).length} {(s.items ?? []).length === 1 ? "item" : "items"}
                  </span>
                </span>
                <VisBadge v={s.visibility} />
              </button>
            </li>
          ))}
          {sections.length === 0 && <li className="px-3.5 py-3 text-sm text-muted">No sections yet.</li>}
        </ul>
      </nav>
      <form
        className="card space-y-2.5 p-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onAdd(title.trim(), display, visibility);
          setTitle("");
        }}
      >
        <TextInput label="New section" placeholder="Title, for example Hobbies" value={title} onChange={setTitle} />
        <div className="grid gap-2">
          <SelectInput label="Kind" value={display} options={SECTION_DISPLAYS_LIST.map((d) => ({ value: d, label: d }))} onChange={setDisplay} />
          <SelectInput label="Who sees it" value={visibility} options={(Object.keys(VIS_LABEL) as Vis[]).map((v) => ({ value: v, label: VIS_LABEL[v] }))} onChange={setVisibility} />
        </div>
        <button type="submit" className={cn(smallBtn, "w-full")} disabled={!title.trim()}>
          <Plus className="size-4" /> Add section
        </button>
      </form>
    </div>
  );
}

function ItemEditor({ item, section, index, count, bangla, update, otherIds }: { item: Item; section: Section; index: number; count: number; bangla: boolean; update: (fn: (it: Item, s: Section) => void) => void; otherIds: string[] }) {
  const set = (fn: (it: Item) => void) => update((it) => fn(it));
  const lt = (label: string, key: "label" | "value" | "text" | "meta", opts: { multiline?: boolean; hint?: string; className?: string } = {}) => (
    <LTextInput label={label} hint={opts.hint} value={item[key]} onChange={(v) => set((it) => void (it[key] = v))} bangla={bangla} multiline={opts.multiline} className={opts.className} optional={key !== "value" && key !== "text"} />
  );
  // A new item gets a readable id from its first label ("Father's job" -> fathers-job).
  const nameFromLabel = () => {
    const label = enText(item.label as LText | undefined).trim();
    if (AUTO_ID.test(item.id) && label) update((it) => void (it.id = idFrom(label, otherIds)));
  };
  const what = enText(item.label as LText | undefined) || enText(item.text as LText | undefined).slice(0, 30) || `item ${index + 1}`;

  return (
    <li className="space-y-3 rounded-xl border border-line bg-card p-3 md:p-3.5">
      <div onBlur={nameFromLabel}>
        {section.display === "facts" && (
          <div className="grid gap-3 md:grid-cols-2">
            {lt("Label", "label")}
            {lt("Value", "value")}
          </div>
        )}
        {section.display === "paragraphs" && lt("Paragraph", "text", { multiline: true })}
        {section.display === "list" && lt("Line", "text")}
        {section.display === "timeline" && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[10rem_1fr_1fr]">
              <TextInput label="Period" placeholder="2017-2021" value={item.period} onChange={(v) => set((it) => void (it.period = v))} />
              {lt("Title", "label")}
              {lt("Organisation or place", "meta")}
            </div>
            <LTextList label="Details" value={item.details} onChange={(v) => set((it) => void (it.details = v.length ? v : undefined))} bangla={bangla} addLabel="Add a detail" what="detail" />
            {(item.sub?.length ?? 0) > 0 && <p className="text-[13px] text-muted">{item.sub!.length} nested entries (edit them in the JSON tab).</p>}
          </div>
        )}
        {section.display === "tags" && (
          <div className="grid gap-3 md:grid-cols-[16rem_1fr]">
            {lt("Group", "label")}
            <ListInput label="Tags" hint="Comma-separated." value={item.tags} onChange={(v) => set((it) => void (it.tags = v))} />
          </div>
        )}
        {section.display === "gallery" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <TextInput label="Image" value={item.src} onChange={(v) => set((it) => void (it.src = v))} className="min-w-56 flex-1" mono />
              <NumberInput label="Width" value={item.width} onChange={(v) => set((it) => void (it.width = v))} min={1} />
              <NumberInput label="Height" value={item.height} onChange={(v) => set((it) => void (it.height = v))} min={1} />
            </div>
            {lt("Caption", "label")}
          </div>
        )}
        {section.display === "quotes" && (
          <div className="space-y-3">
            {lt("Quote", "text", { multiline: true })}
            <div className="grid gap-3 md:grid-cols-2">
              {lt("Who said it", "label")}
              {lt("Their role", "meta")}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
        <VisSelect label={`Who sees ${what}`} value={item.visibility} inherit={`Same as section (${VIS_LABEL[section.visibility]})`} onChange={(v) => set((it) => void (it.visibility = v))} />
        <span className="font-mono text-xs text-faint" title="Internal id">
          {item.id}
        </span>
        <span className="ml-auto">
          <RowActions index={index} count={count} what={what} onMove={(dir) => update((_, s) => move(s.items!, index, dir))} onRemove={() => update((_, s) => void s.items!.splice(index, 1))} />
        </span>
      </div>
    </li>
  );
}

function SectionEditor({ section, index, doc, bangla, update, onDeleted, onRenamed }: { section: Section; index: number; doc: Doc; bangla: boolean; update: (fn: (d: Doc) => void) => void; onDeleted: () => void; onRenamed: (key: string) => void }) {
  const [keyText, setKeyText] = useState(section.key);
  const [keyError, setKeyError] = useState<string>();
  const [seenKey, setSeenKey] = useState(section.key);
  if (seenKey !== section.key) {
    setSeenKey(section.key);
    setKeyText(section.key);
  }
  const items = section.items ?? [];
  const setS = (fn: (s: Section) => void) => update((d) => fn(d.sections![index]));
  const commitKey = () => {
    const next = keyText.trim();
    if (next === section.key) return setKeyError(undefined);
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(next)) return setKeyError("Use lowercase letters, digits and dashes.");
    if ((doc.sections ?? []).some((s) => s.key === next)) return setKeyError("Another section already uses this key.");
    setKeyError(undefined);
    update((d) => renameSection(d, section.key, next));
    onRenamed(next);
  };
  const ids = items.map((i) => i.id);

  return (
    <div className="space-y-4">
      <Panel
        title={enText(section.title) || "Untitled section"}
        description={DISPLAY_HELP[section.display]}
        actions={
          <>
          <button type="button" className={iconBtn} disabled={index === 0} onClick={() => update((d) => move(d.sections!, index, -1))} aria-label="Move this section up" title="Move up">
            <ArrowUp className="size-4" />
          </button>
          <button type="button" className={iconBtn} disabled={index === (doc.sections ?? []).length - 1} onClick={() => update((d) => move(d.sections!, index, 1))} aria-label="Move this section down" title="Move down">
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            className={cn(smallBtn, "hover:text-accent")}
            onClick={() => {
              if (!window.confirm(`Delete the section "${enText(section.title)}" and its ${items.length} items? Questions that show it lose that card.`)) return;
              update((d) => removeSection(d, section.key));
              onDeleted();
            }}
          >
            <Trash2 className="size-4" /> Delete section
          </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
          <LTextInput label="Title" value={section.title} onChange={(v) => setS((s) => void (s.title = v ?? ""))} bangla={bangla} />
          <div>
            <label htmlFor={`key-${index}`} className="mb-1 block text-sm font-semibold">
              Key
            </label>
            <input
              id={`key-${index}`}
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              onBlur={commitKey}
              onKeyDown={(e) => e.key === "Enter" && commitKey()}
              aria-invalid={keyError ? true : undefined}
              aria-describedby={`key-${index}-hint`}
              className={cn(inputCls, "font-mono text-sm")}
            />
            <p id={`key-${index}-hint`} className={cn("mt-1 text-[13px]", keyError ? "font-medium text-accent" : "text-muted")}>
              {keyError ?? "Used in the template and by questions ({key})."}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectInput label="Kind" hint={DISPLAY_HELP[section.display]} value={section.display} options={SECTION_DISPLAYS_LIST.map((d) => ({ value: d, label: d }))} onChange={(v) => setS((s) => void (s.display = v))} />
          <SelectInput
            label="Who sees it"
            hint={VIS_HELP[section.visibility]}
            value={section.visibility}
            options={(Object.keys(VIS_LABEL) as Vis[]).map((v) => ({ value: v, label: VIS_LABEL[v] }))}
            onChange={(v) =>
              setS((s) => {
                s.visibility = v;
                if (v === "private") s.inChat = false;
                else if (s.inChat === false && section.visibility === "private") s.inChat = true;
                if (v !== "public") s.inSite = false;
              })
            }
          />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Toggle label="Use in the chat" hint="The AI may use it, and answers can show it as a card." checked={section.inChat ?? true} disabled={section.visibility === "private"} onChange={(v) => setS((s) => void (s.inChat = v))} />
          <Toggle label="Its own page for search engines" hint="Everyone sections only." checked={section.inSite ?? false} disabled={section.visibility !== "public"} onChange={(v) => setS((s) => void (s.inSite = v))} />
        </div>
      </Panel>

      <ol className="space-y-3" aria-label={`Items in ${enText(section.title)}`}>
        {items.map((it, i) => (
          <ItemEditor
            key={`${it.id}-${i}`}
            item={it}
            section={section}
            index={i}
            count={items.length}
            bangla={bangla}
            otherIds={ids.filter((_, k) => k !== i)}
            update={(fn) =>
              update((d) => {
                const s = d.sections![index];
                fn(s.items![i], s);
              })
            }
          />
        ))}
      </ol>
      <button type="button" className={smallBtn} onClick={() => setS((s) => void (s.items ??= []).push(blankItem(s.display, uniqueId("item", ids))))}>
        <Plus className="size-4" /> Add {section.display === "facts" ? "a fact" : section.display === "paragraphs" ? "a paragraph" : section.display === "gallery" ? "an image" : section.display === "quotes" ? "a quote" : "an item"}
      </button>
    </div>
  );
}

export function KnowledgeTab({ slug, draft, doc, bangla, ai, focus }: TabProps) {
  const sections = doc.sections ?? [];
  const focusIndex = focus?.startsWith("sections.") ? Number(focus.split(".")[1]) : -1;
  const [selected, setSelected] = useState<string | null>(sections[focusIndex]?.key ?? sections[0]?.key ?? null);
  const [importing, setImporting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [note, setNote] = useState<string>();
  const index = sections.findIndex((s) => s.key === selected);

  // Missing Bangla, filled in by AI for review (only texts whose English didn't change meanwhile).
  const translate = async () => {
    setTranslating(true);
    setNote(undefined);
    const res = await adminFetch<{ items: { path: (string | number)[]; en: string; bn: string }[]; total: number }>("/api/admin/ai/", { body: { action: "translate", slug, doc } });
    setTranslating(false);
    if (!res.ok) return setNote(res.error);
    let applied = 0;
    if (res.data.items.length) draft.update((d) => void (applied = res.data.items.filter((t) => setBangla(d, t.path, t.en, t.bn)).length));
    setNote(res.data.total === 0 ? "Every text already has Bangla." : `Added Bangla to ${applied} of ${res.data.total} texts. The new Bangla boxes are filled in: read them through.`);
  };

  const add = (title: string, display: Display, visibility: Vis) => {
    const key = idFrom(title, sections.map((s) => s.key), "section");
    draft.update((d) => void (d.sections ??= []).push({ key, title, display, visibility, inChat: visibility !== "private", inDocument: visibility !== "private", inSite: false, items: [] }));
    setSelected(key);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto max-w-2xl text-sm text-muted">Everything the site and the AI may say about you, in sections. Each section and each item says who may see it.</p>
        {bangla && ai && (
          <button type="button" className={smallBtn} disabled={translating} onClick={() => void translate()} title="Bangla for every English text that has none (people's names and numbers stay as they are)">
            {translating ? <LoaderCircle className="size-4 animate-spin" /> : <Languages className="size-4" />} Fill in missing Bangla
          </button>
        )}
        <button type="button" className={smallBtn} onClick={() => setImporting(true)}>
          <FileUp className="size-4" /> Import or paste text
        </button>
        <button type="button" className={smallBtn} onClick={() => downloadText(`${slug}-persona.md`, renderPersonaMarkdown({ sections: sections as never, questions: (doc.questions ?? []) as never }, `Persona: ${slug}`))}>
          <Download className="size-4" /> Download as Markdown
        </button>
      </div>
      {note && (
        <p role="status" className="text-sm font-medium">
          {note}
        </p>
      )}
      {/* Phones: pick the section from a menu; the editor comes first, the list's form after it. */}
      <div className="lg:hidden">
        <SelectInput label="Section" value={selected ?? ""} options={sections.map((s) => ({ value: s.key, label: `${enText(s.title) || s.key} (${VIS_LABEL[s.visibility]})` }))} onChange={setSelected} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[17rem_1fr]">
        <SectionList sections={sections} selected={selected} onSelect={setSelected} onAdd={add} className="order-2 lg:order-1" />
        {index >= 0 ? (
          <div className="order-1 min-w-0 lg:order-2">
          <SectionEditor
            key={index}
            section={sections[index]}
            index={index}
            doc={doc}
            bangla={bangla}
            update={draft.update}
            onDeleted={() => setSelected(sections.find((s) => s.key !== selected)?.key ?? null)}
            onRenamed={setSelected}
          />
          </div>
        ) : (
          <p className="card order-1 p-5 text-muted lg:order-2">Pick a section, or add one.</p>
        )}
      </div>
      {importing && <ImportDialog slug={slug} draft={draft} doc={doc} ai={ai} onClose={() => setImporting(false)} />}
    </div>
  );
}
