"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LABEL_DEFAULTS, LABEL_KEYS, type LabelKey } from "@/lib/persona/labels";
import { enText, move } from "@/lib/persona/edit";
import { cn } from "@/lib/utils";
import { LTextInput, ListInput, NumberInput, Panel, RowActions, SelectInput, TextInput, Toggle, VisSelect, inputCls, smallBtn, type Vis } from "./controls";
import type { TabProps } from "./studio";

const LINK_KINDS = ["website", "linkedin", "github", "facebook", "instagram", "whatsapp", "x", "other"] as const;

/** What each label is, for the "Words on the site" table. */
const LABEL_HELP: Record<LabelKey, string> = {
  askAbout: "Heading of the question list in the sidebar",
  newChat: "Button that starts a new chat",
  composerPlaceholder: "Placeholder in the question box (AI off)",
  composerPlaceholderAi: "Placeholder in the question box (AI on)",
  composerAria: "Screen-reader name of the question box",
  composerNoMatch: "Hint when the typed question matches nothing",
  askHint: "Small hint under the box while typing",
  askHintNoMatch: "Hint while typing something no answer matches",
  thinking: "Shown while the AI writes",
  thinkingStatus: "Screen-reader text while the AI writes",
  aiDisclaimer: "Line under every AI answer",
  footerAi: "Footer note when AI answers are on",
  footerNoAi: "Footer note when AI answers are off",
  pickHintBefore: "Landing hint, before the / key",
  pickHintAfter: "Landing hint, after the / key",
  aiStopped: "Shown when the visitor stops an AI answer",
  aiLabel: "Badge on AI answers",
  documentButton: "Top-bar button for the document (CV / Biodata)",
  documentDownload: "Download button on the document card",
  documentWeb: "Link to the document's web page",
  availability: "The pill in the top bar ([brackets] = only on wide screens)",
  availabilityTitle: "Tooltip of the pill",
  notFoundTitle: "Title of the page-not-found screen",
  notFoundText: "Text of the page-not-found screen",
  notFoundBack: "Link back from the page-not-found screen",
  gatedText: "Answer when a question needs an access code",
  requestAccess: "Button to ask for access",
  enterCode: "Placeholder of the access code box",
  unlockedBadge: "Badge once private details are unlocked",
  languageSwitch: "Link to the other language",
  unlockButton: "Button that unlocks with a code",
  codeWrong: "When a code is wrong",
  codeLimited: "After too many wrong codes",
  codeUnlocked: "Chat reply after a code works",
  lockAgain: "Link that hides the private details again",
  requestTitle: "Heading of the request form",
  requestName: "Request form: name",
  requestRelation: "Request form: connection",
  requestPhone: "Request form: phone",
  requestEmail: "Request form: email",
  requestMessage: "Request form: message",
  requestSend: "Request form: send button",
  requestSent: "After a request is sent",
  requestNeedContact: "When the request has no phone or email",
  documentLocked: "Document page for visitors without a code",
  printButton: "Print button on the document page",
};

export function IdentityTab({ draft, doc, bangla }: TabProps) {
  const id = doc.identity;
  const site = doc.site ?? {};
  const set = draft.update;
  const [onlyChanged, setOnlyChanged] = useState(false);
  const labels = doc.labels ?? {};
  const questions = (doc.questions ?? []).map((q) => ({ value: q.id, label: enText(q.label) || q.id }));
  const languages = site.languages ?? ["en"];

  return (
    <div className="space-y-5">
      <Panel title="Name and role" description="Who this persona is about. The short name is used in the chat; the full name on the document and for search engines.">
        <div className="grid gap-4 md:grid-cols-3">
          <TextInput label="Full name" value={id.name} onChange={(v) => set((d) => void (d.identity.name = v))} />
          <TextInput label="Short name" hint="Used in the chat (Maruf)." value={id.shortName} onChange={(v) => set((d) => void (d.identity.shortName = v))} />
          <TextInput label="Initials" hint="The avatar letters (1-4)." value={id.initials} onChange={(v) => set((d) => void (d.identity.initials = v.slice(0, 4)))} />
          <TextInput label="Given name" value={id.givenName} onChange={(v) => set((d) => void (d.identity.givenName = v || undefined))} />
          <TextInput label="Family name" value={id.familyName} onChange={(v) => set((d) => void (d.identity.familyName = v || undefined))} />
          <ListInput label="Other spellings of the name" hint="Comma-separated; helps search engines." value={id.alternateNames} onChange={(v) => set((d) => void (d.identity.alternateNames = v))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <LTextInput label="Role" hint="One line: Lead Software Engineer." value={id.role} onChange={(v) => set((d) => void (d.identity.role = v))} bangla={bangla} optional />
          <LTextInput label="Location" value={id.location} onChange={(v) => set((d) => void (d.identity.location = v))} bangla={bangla} optional />
          <LTextInput label="Headline" hint="A short line for the top of the page and search results." value={id.headline} onChange={(v) => set((d) => void (d.identity.headline = v))} bangla={bangla} optional />
          <LTextInput label="Summary" hint="Two or three sentences the AI and search engines use as the introduction." value={id.summary} onChange={(v) => set((d) => void (d.identity.summary = v))} bangla={bangla} multiline optional />
        </div>
        <TextInput label="Persona name (admin only)" hint="How this persona is called in the admin." value={doc.name} onChange={(v) => set((d) => void (d.name = v))} className="max-w-sm" />
      </Panel>

      <Panel title="Contact and links" description="Shown to everyone. Keep private numbers in a Knowledge section marked 'With access code' instead.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Email" type="email" value={id.email} onChange={(v) => set((d) => void (d.identity.email = v || undefined))} />
          <TextInput label="Phone" type="tel" value={id.phone} onChange={(v) => set((d) => void (d.identity.phone = v || undefined))} />
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Links</legend>
          {(id.links ?? []).map((l, i, all) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line p-2.5 md:grid-cols-[9rem_1fr_2fr_auto] md:items-end md:border-0 md:p-0">
              <SelectInput label="Kind" value={l.kind} options={LINK_KINDS.map((k) => ({ value: k, label: k }))} onChange={(v) => set((d) => void (d.identity.links![i].kind = v))} />
              <TextInput label="Label" value={l.label} onChange={(v) => set((d) => void (d.identity.links![i].label = v))} />
              <TextInput label="Address" type="url" value={l.href} placeholder="https://" onChange={(v) => set((d) => void (d.identity.links![i].href = v))} />
              <RowActions index={i} count={all.length} what={`link ${l.label || i + 1}`} onMove={(dir) => set((d) => move(d.identity.links!, i, dir))} onRemove={() => set((d) => void d.identity.links!.splice(i, 1))} />
            </div>
          ))}
          <button type="button" className={smallBtn} onClick={() => set((d) => void (d.identity.links ??= []).push({ kind: "website", label: "", href: "https://" }))}>
            <Plus className="size-4" /> Add a link
          </button>
        </fieldset>
      </Panel>

      <Panel title="Photos" description="Files under public/ (for example /images/me.webp). Photos marked 'With access code' only show after a visitor unlocks.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Avatar image" placeholder="/images/avatar.webp" value={id.avatar?.src} onChange={(v) => set((d) => void (d.identity.avatar = v ? { src: v, alt: d.identity.avatar?.alt ?? d.identity.name } : undefined))} mono />
          <LTextInput label="Avatar description" value={id.avatar?.alt} onChange={(v) => set((d) => d.identity.avatar && (d.identity.avatar.alt = v ?? ""))} bangla={bangla} />
        </div>
        <div className="space-y-3">
          {(id.photos ?? []).map((ph, i, all) => (
            <div key={i} className="space-y-3 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-end gap-3">
                <TextInput label="Image" value={ph.src} onChange={(v) => set((d) => void (d.identity.photos![i].src = v))} className="min-w-56 flex-1" mono />
                <NumberInput label="Width" value={ph.width} onChange={(v) => set((d) => void (d.identity.photos![i].width = v ?? 1))} min={1} />
                <NumberInput label="Height" value={ph.height} onChange={(v) => set((d) => void (d.identity.photos![i].height = v ?? 1))} min={1} />
                <div>
                  <span className="mb-1 block text-sm font-semibold">Who sees it</span>
                  <VisSelect label="Who sees this photo" value={(ph.visibility ?? "public") as Vis} onChange={(v) => set((d) => void (d.identity.photos![i].visibility = v ?? "public"))} />
                </div>
                <RowActions index={i} count={all.length} what={`photo ${i + 1}`} onMove={(dir) => set((d) => move(d.identity.photos!, i, dir))} onRemove={() => set((d) => void d.identity.photos!.splice(i, 1))} />
              </div>
              <LTextInput label="Description" hint="Read aloud by screen readers." value={ph.alt} onChange={(v) => set((d) => void (d.identity.photos![i].alt = v ?? ""))} bangla={bangla} />
            </div>
          ))}
          <button type="button" className={smallBtn} onClick={() => set((d) => void (d.identity.photos ??= []).push({ src: "/images/", width: 800, height: 1000, alt: d.identity.name, visibility: "public" }))}>
            <Plus className="size-4" /> Add a photo
          </button>
        </div>
      </Panel>

      <Panel title="Site and search engines" description="Where this persona lives and how search engines describe it.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Address of the site" hint="Canonical URL, for example https://biodata.example.com. Empty: the main site's address." type="url" value={site.url} onChange={(v) => set((d) => void ((d.site ??= {}).url = v || undefined))} mono />
          <ListInput label="Host names" hint="With PERSONA_ROUTING=host these addresses show this persona (comma-separated)." value={site.hosts} onChange={(v) => set((d) => void ((d.site ??= {}).hosts = v.map((h) => h.toLowerCase())))} mono />
          <LTextInput label="Page title" hint="Shown in the browser tab and search results." value={site.title} onChange={(v) => set((d) => void ((d.site ??= {}).title = v))} bangla={bangla} optional />
          <ListInput label="Keywords" hint="Words people search for (English and Bangla), comma-separated." value={site.keywords} onChange={(v) => set((d) => void ((d.site ??= {}).keywords = v))} />
        </div>
        <LTextInput label="Description" hint="One or two sentences for search results and link previews." value={site.description} onChange={(v) => set((d) => void ((d.site ??= {}).description = v))} bangla={bangla} multiline rows={2} optional />
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Toggle label="Let search engines list it" checked={site.indexable ?? true} onChange={(v) => set((d) => void ((d.site ??= {}).indexable = v))} />
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="sr-only">Languages</legend>
            <span className="text-[15px] font-medium">Languages:</span>
            {(["en", "bn"] as const).map((lang) => (
              <label key={lang} className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={languages.includes(lang)}
                  onChange={(e) =>
                    set((d) => {
                      const s = (d.site ??= {});
                      const next = e.target.checked ? [...new Set([...(s.languages ?? ["en"]), lang])] : (s.languages ?? ["en"]).filter((l) => l !== lang);
                      s.languages = next.length ? next : ["en"];
                      if (!s.languages.includes(s.defaultLang ?? "en")) s.defaultLang = s.languages[0];
                    })
                  }
                />
                {lang === "en" ? "English" : "Bangla (বাংলা)"}
              </label>
            ))}
          </fieldset>
          <SelectInput
            label="Default language"
            value={site.defaultLang ?? "en"}
            options={languages.map((l) => ({ value: l, label: l === "en" ? "English" : "Bangla" }))}
            onChange={(v) => set((d) => void ((d.site ??= {}).defaultLang = v))}
            className="w-44"
          />
        </div>
      </Panel>

      <Panel title="Availability pill" description="The small pill in the top bar (its words are in the table below). Clicking it asks the question you choose.">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <Toggle label="Show the pill" checked={doc.availability?.show ?? false} onChange={(v) => set((d) => void ((d.availability ??= {}).show = v))} />
          <SelectInput
            label="It asks"
            value={doc.availability?.action ?? ""}
            options={[{ value: "", label: "Nothing" }, ...questions]}
            onChange={(v) => set((d) => void ((d.availability ??= {}).action = v || undefined))}
            className="w-72"
          />
        </div>
      </Panel>

      <Panel
        title="Words on the site"
        description="Every button and hint the chat shows. Empty boxes use the default (shown greyed). {shortName} and {name} are filled in; **bold** works in longer texts."
        actions={<Toggle label="Only the changed ones" checked={onlyChanged} onChange={setOnlyChanged} />}
      >
        <div className="divide-y divide-line">
          {LABEL_KEYS.filter((k) => !onlyChanged || labels[k] !== undefined).map((k) => {
            const value = labels[k];
            const en = typeof value === "string" ? value : (value?.en ?? "");
            const bn = typeof value === "string" ? "" : (value?.bn ?? "");
            const write = (e: string, b: string) =>
              set((d) => {
                const l = (d.labels ??= {});
                if (!e.trim() && !b.trim()) delete l[k];
                else l[k] = b.trim() ? { en: e, bn: b } : e;
              });
            return (
              <div key={k} className={cn("grid gap-2 py-3", bangla ? "md:grid-cols-[14rem_1fr_1fr]" : "md:grid-cols-[14rem_1fr]")}>
                <div className="min-w-0">
                  <label htmlFor={`label-${k}`} className="block text-sm font-semibold">
                    {LABEL_HELP[k]}
                  </label>
                  <span className="font-mono text-xs text-faint">{k}</span>
                </div>
                <input id={`label-${k}`} value={en} placeholder={LABEL_DEFAULTS.en[k]} onChange={(e) => write(e.target.value, bn)} className={inputCls} />
                {bangla && <input lang="bn" aria-label={`${LABEL_HELP[k]} (Bangla)`} value={bn} placeholder={LABEL_DEFAULTS.bn[k]} onChange={(e) => write(en, e.target.value)} className={inputCls} />}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
