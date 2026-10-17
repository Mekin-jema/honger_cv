"use client";

import { enText } from "@/lib/persona/edit";
import { IdListPicker, LTextInput, Panel, SelectInput, TextInput, Toggle } from "./controls";
import { AccessCodes } from "./access-codes";
import { CvEditor } from "./cv-editor";
import { AccessRequests } from "./access-requests";
import type { TabProps } from "./studio";

const MODES = {
  open: "Open: no codes. Anything marked 'With access code' stays hidden from everyone.",
  code: "Access code: visitors with a code you gave them see the 'With access code' parts.",
  request: "Code or request: visitors can also ask for access; you approve requests and send a code.",
} as const;

export function DocumentTab({ slug, draft, doc, bangla }: TabProps) {
  const set = draft.update;
  const d0 = doc.document ?? {};
  const access = doc.access ?? {};
  const printable = (doc.sections ?? []).filter((s) => s.visibility !== "private").map((s) => ({ id: s.key, label: `${enText(s.title) || s.key}${s.visibility === "unlocked" ? " (with access code)" : ""}` }));
  const needsGate = (d0.sections ?? []).some((k) => doc.sections?.find((s) => s.key === k)?.visibility === "unlocked");

  return (
    <div className="space-y-5">
      <Panel title="Document" description="The CV or biodata: its web page and the PDF visitors download.">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectInput
            label="Kind"
            value={d0.kind ?? "cv"}
            options={[
              { value: "cv", label: "CV" },
              { value: "biodata", label: "Biodata" },
            ]}
            onChange={(v) => set((d) => void ((d.document ??= {}).kind = v))}
          />
          <TextInput label="Web page address" hint={`The page: /${d0.slug ?? "cv"}/`} value={d0.slug} onChange={(v) => set((d) => void ((d.document ??= {}).slug = v.toLowerCase()))} mono />
          <TextInput label="PDF file name" hint="Letters, digits, dots, dashes; ends with .pdf" value={d0.fileName} onChange={(v) => set((d) => void ((d.document ??= {}).fileName = v))} mono />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <LTextInput label="Title" value={d0.title} onChange={(v) => set((d) => void ((d.document ??= {}).title = v ?? ""))} bangla={bangla} className="md:col-span-2" />
          <TextInput label="Language note" hint="Shown on the document card." value={d0.language} onChange={(v) => set((d) => void ((d.document ??= {}).language = v))} />
        </div>
        <TextInput label="Last updated (optional)" hint="Free text, for example October 2026." value={d0.updated} onChange={(v) => set((d) => void ((d.document ??= {}).updated = v || undefined))} className="max-w-sm" />
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Toggle label="With photo" checked={d0.showPhoto ?? true} onChange={(v) => set((d) => void ((d.document ??= {}).showPhoto = v))} />
          <Toggle label="Only with an access code" hint="The page and the PDF need a code (needed when it prints 'With access code' sections)." checked={d0.gated ?? false} onChange={(v) => set((d) => void ((d.document ??= {}).gated = v))} />
        </div>
        {doc.legacy ? (
          <p className="text-sm text-muted">The CV has its own two-page layout: edit it below.</p>
        ) : (
          <IdListPicker
            label="Printed sections, in order"
            hint={needsGate && !d0.gated ? "Some chosen sections are 'With access code': turn on 'Only with an access code' or remove them." : "Sections marked 'Only me' can't be printed."}
            value={d0.sections}
            options={printable}
            max={60}
            onChange={(v) => set((d) => void ((d.document ??= {}).sections = v))}
          />
        )}
      </Panel>

      {doc.legacy && <CvEditor draft={draft} data={d0.data} />}

      <Panel title="Access to private details" description="How visitors may unlock the parts marked 'With access code'.">
        <SelectInput
          label="Mode"
          hint={MODES[access.mode ?? "open"]}
          value={access.mode ?? "open"}
          options={[
            { value: "open", label: "Open (no codes)" },
            { value: "code", label: "Access code" },
            { value: "request", label: "Code or request" },
          ]}
          onChange={(v) => set((d) => void ((d.access ??= {}).mode = v))}
          className="max-w-md"
        />
        {(access.mode ?? "open") !== "open" && (
          <div className="grid gap-4 md:grid-cols-2">
            <LTextInput label="Hint next to the code box" hint="For example: Ask my family for the code." value={access.codeHint} onChange={(v) => set((d) => void ((d.access ??= {}).codeHint = v))} bangla={bangla} optional />
            {access.mode === "request" && (
              <LTextInput label="Text above the request form" value={access.requestIntro} onChange={(v) => set((d) => void ((d.access ??= {}).requestIntro = v))} bangla={bangla} multiline rows={3} optional />
            )}
          </div>
        )}
      </Panel>

      {access.mode === "request" && <AccessRequests slug={slug} siteUrl={doc.site?.url} />}
      {(access.mode ?? "open") !== "open" && <AccessCodes slug={slug} siteUrl={doc.site?.url} />}
    </div>
  );
}
