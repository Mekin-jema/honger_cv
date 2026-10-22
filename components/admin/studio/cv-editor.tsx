"use client";

import { useState } from "react";
import { Eye, FileUp, Plus, Sparkles } from "lucide-react";
import { CvSheet } from "@/components/document/cv-sheet";
import { cv as codeCv } from "@/content/cv";
import { readCv, type CvData, type CvJob } from "@/lib/persona/cv";
import { move } from "@/lib/persona/edit";
import { cn } from "@/lib/utils";
import { CvImportPipeline } from "@/components/account/cv-import-pipeline";
import { Field, Panel, RowActions, TextInput, Toggle, inputCls, smallBtn } from "./controls";
import type { DraftApi } from "./use-draft";

/** Lines of plain text (CV bullets, courses): one box per line, add / move / remove. */
function Lines({ label, value, onChange, rows = 2, addLabel = "Add a line" }: { label: string; value: string[]; onChange: (v: string[]) => void; rows?: number; addLabel?: string }) {
  const set = (fn: (l: string[]) => void) => {
    const next = [...value];
    fn(next);
    onChange(next);
  };
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      {value.map((line, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <textarea aria-label={`${label} ${i + 1}`} value={line} rows={rows} onChange={(e) => set((l) => void (l[i] = e.target.value))} className={cn(inputCls, "flex-1 resize-y text-sm")} />
          <RowActions index={i} count={value.length} what={`${label} ${i + 1}`} onMove={(dir) => set((l) => move(l, i, dir))} onRemove={() => set((l) => void l.splice(i, 1))} />
        </div>
      ))}
      <button type="button" className={smallBtn} onClick={() => set((l) => void l.push(""))}>
        <Plus className="size-4" /> {addLabel}
      </button>
    </fieldset>
  );
}

function TextArea({ label, value, onChange, rows = 3, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return <Field label={label} hint={hint}>{(p) => <textarea {...p} value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "resize-y text-sm")} />}</Field>;
}

const blankJob = (): CvJob => ({ company: "", role: "", period: "", location: "", context: "", bullets: [""], engagements: [] });

/**
 * The job persona's CV: every part of /cv/ and its PDF, with a live preview of the printed sheet next to
 * the form. Changes autosave into the draft; Publish & train makes them live and prints a new PDF.
 */
export function CvEditor({
  draft,
  data,
  fallbackCv = codeCv,
  value,
  onChange,
  onPhotoUpload,
  onProjectImageUpload,
  photoUploadBusy = false,
  projectImageUploadBusy = false,
}: {
  draft?: DraftApi;
  data?: unknown;
  fallbackCv?: CvData;
  value?: CvData;
  onChange?: (next: CvData) => void;
  onPhotoUpload?: (file: File) => void | Promise<void>;
  onProjectImageUpload?: (file: File, projectIndex: number) => void | Promise<void>;
  photoUploadBusy?: boolean;
  projectImageUploadBusy?: boolean;
}) {
  const cv = value ?? readCv(data, fallbackCv);
  const [preview, setPreview] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const set = (fn: (c: CvData) => void) => {
    if (draft) {
      draft.update((d) => {
        const next = readCv(d.document?.data, fallbackCv);
        fn(next);
        (d.document ??= {}).data = next as unknown as Record<string, unknown>;
      });
      return;
    }
    if (onChange) {
      const next = structuredClone(cv);
      fn(next);
      onChange(next);
    }
  };

  return (
    <div className={cn("grid items-start gap-5", preview && "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
      <div className="min-w-0 space-y-5">
        {showImport && (
          <CvImportPipeline
            slug=""
            currentCv={cv}
            onApplyCv={(next) => {
              set((c) => {
                Object.assign(c, next);
              });
              setShowImport(false);
            }}
          />
        )}
        <Panel
          title="CV"
          description="The printed CV (/cv/ and the PDF). Keep it to two A4 pages: the publish step warns when the PDF grows longer."
          actions={
            <div className="flex items-center gap-2">
              <button type="button" className={smallBtn} onClick={() => setShowImport((v) => !v)} aria-pressed={showImport}>
                <Sparkles className="size-4 text-accent" /> {showImport ? "Hide import" : "Import CV document"}
              </button>
              <button type="button" className={smallBtn} onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
                <Eye className="size-4" /> {preview ? "Hide preview" : "Show preview"}
              </button>
            </div>
          }
        >
          <TextInput label="Title under the name" value={cv.title} onChange={(v) => set((c) => void (c.title = v))} />
          <TextInput label="Availability line" value={cv.availability} onChange={(v) => set((c) => void (c.availability = v))} />
          <div className="flex flex-wrap items-end gap-4">
            {onPhotoUpload ? (
              <div className="min-w-64 flex-1 space-y-1.5">
                <p className="text-sm font-semibold">Profile photo</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-fg has-[:disabled]:cursor-wait has-[:disabled]:opacity-50">
                    <FileUp className="size-4" aria-hidden="true" />
                    {photoUploadBusy ? "Uploading photo…" : cv.photo ? "Replace photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={photoUploadBusy}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (file) void onPhotoUpload(file);
                      }}
                    />
                  </label>
                  {cv.photo && (
                    <button
                      type="button"
                      className={smallBtn}
                      onClick={() => set((current) => {
                        current.photo = "";
                        current.photoPublicId = "";
                      })}
                    >
                      Remove photo
                    </button>
                  )}
                  {cv.photo && <span role="status" className="text-sm text-muted">A photo is set.</span>}
                </div>
                <p className="text-xs text-muted">JPG, PNG or WebP, up to 3 MB. Images are optimized for your public CV.</p>
              </div>
            ) : (
              <TextInput label="Photo" value={cv.photo} onChange={(v) => set((c) => void (c.photo = v))} className="min-w-64 flex-1" mono />
            )}
            <Toggle label="Show the photo" hint="Usual in Europe; leave out for UK/US applications." checked={cv.showPhoto} onChange={(v) => set((c) => void (c.showPhoto = v))} />
          </div>
          <TextArea label="Profile" rows={5} value={cv.profile} onChange={(v) => set((c) => void (c.profile = v))} />
          <Lines label="Key achievements" value={cv.highlights} onChange={(v) => set((c) => void (c.highlights = v))} addLabel="Add an achievement" />
        </Panel>

        <Panel title="Core skills">
          {cv.skills.map((s, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[11rem_1fr_auto] md:items-end">
              <TextInput label={`Group ${i + 1}`} value={s.k} onChange={(v) => set((c) => void (c.skills[i].k = v))} />
              <TextInput label="Skills" value={s.v} onChange={(v) => set((c) => void (c.skills[i].v = v))} />
              <RowActions index={i} count={cv.skills.length} what={`skill group ${s.k || i + 1}`} onMove={(dir) => set((c) => move(c.skills, i, dir))} onRemove={() => set((c) => void c.skills.splice(i, 1))} />
            </div>
          ))}
          <button type="button" className={smallBtn} onClick={() => set((c) => void c.skills.push({ k: "", v: "" }))}>
            <Plus className="size-4" /> Add a skill group
          </button>
        </Panel>

        <Panel title="Professional experience">
          {cv.experience.map((job, j) => (
            <fieldset key={j} className="space-y-3 rounded-xl border border-line p-3">
              <legend className="sr-only">Job {j + 1}</legend>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{job.role || "New role"}{job.company ? ` · ${job.company}` : ""}</p>
                <span className="ml-auto">
                  <RowActions index={j} count={cv.experience.length} what={`job ${job.company || j + 1}`} onMove={(dir) => set((c) => move(c.experience, j, dir))} onRemove={() => set((c) => void c.experience.splice(j, 1))} />
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Role" value={job.role} onChange={(v) => set((c) => void (c.experience[j].role = v))} />
                <TextInput label="Company" value={job.company} onChange={(v) => set((c) => void (c.experience[j].company = v))} />
                <TextInput label="Period" value={job.period} onChange={(v) => set((c) => void (c.experience[j].period = v))} />
                <TextInput label="Location" value={job.location} onChange={(v) => set((c) => void (c.experience[j].location = v))} />
              </div>
              <TextInput label="Context (one line)" value={job.context} onChange={(v) => set((c) => void (c.experience[j].context = v))} />
              <Lines label="Bullets" value={job.bullets} onChange={(v) => set((c) => void (c.experience[j].bullets = v))} addLabel="Add a bullet" />
              {job.engagements.map((e, k) => (
                <fieldset key={k} className="space-y-3 rounded-lg bg-bg-soft p-3">
                  <legend className="sr-only">Engagement {k + 1}</legend>
                  <div className="flex flex-wrap items-end gap-3">
                    <TextInput label={`Engagement ${k + 1}`} value={e.title} onChange={(v) => set((c) => void (c.experience[j].engagements[k].title = v))} className="min-w-64 flex-1" />
                    <TextInput label="Period" value={e.period} onChange={(v) => set((c) => void (c.experience[j].engagements[k].period = v))} className="w-36" />
                    <RowActions index={k} count={job.engagements.length} what={`engagement ${k + 1}`} onMove={(dir) => set((c) => move(c.experience[j].engagements, k, dir))} onRemove={() => set((c) => void c.experience[j].engagements.splice(k, 1))} />
                  </div>
                  <Lines label="Bullets" value={e.bullets} onChange={(v) => set((c) => void (c.experience[j].engagements[k].bullets = v))} addLabel="Add a bullet" />
                  <TextInput label="Stack" value={e.stack} onChange={(v) => set((c) => void (c.experience[j].engagements[k].stack = v))} />
                </fieldset>
              ))}
              <button type="button" className={smallBtn} onClick={() => set((c) => void c.experience[j].engagements.push({ title: "", period: "", bullets: [""], stack: "" }))}>
                <Plus className="size-4" /> Add an engagement
              </button>
            </fieldset>
          ))}
          <button type="button" className={smallBtn} onClick={() => set((c) => void c.experience.push(blankJob()))}>
            <Plus className="size-4" /> Add a job
          </button>
        </Panel>

        <Panel title="Selected projects">
          {cv.projects.map((p, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-line p-3">
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <TextInput label={`Project ${i + 1}`} value={p.name} onChange={(v) => set((c) => void (c.projects[i].name = v))} />
                <TextInput label="Technology" value={p.meta} onChange={(v) => set((c) => void (c.projects[i].meta = v))} />
                <RowActions index={i} count={cv.projects.length} what={`project ${p.name || i + 1}`} onMove={(dir) => set((c) => move(c.projects, i, dir))} onRemove={() => set((c) => void c.projects.splice(i, 1))} />
              </div>
              <TextArea label="Description" rows={2} value={p.text} onChange={(v) => set((c) => void (c.projects[i].text = v))} />
                {onProjectImageUpload && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-fg has-[:disabled]:cursor-wait has-[:disabled]:opacity-50">
                      <FileUp className="size-4" aria-hidden="true" />
                      {projectImageUploadBusy ? "Uploading image…" : p.image ? "Replace project image" : "Upload project image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={projectImageUploadBusy}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = "";
                          if (file) void onProjectImageUpload(file, i);
                        }}
                      />
                    </label>
                    {p.image && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt={`${p.name || `Project ${i + 1}`} preview`} className="size-14 rounded-lg border border-line object-cover" />
                        <button
                          type="button"
                          className={smallBtn}
                          onClick={() => set((current) => {
                            current.projects[i].image = undefined;
                            current.projects[i].imagePublicId = undefined;
                          })}
                        >
                          Remove image
                        </button>
                      </>
                    )}
                  </div>
                )}
            </div>
          ))}
          <button type="button" className={smallBtn} onClick={() => set((c) => void c.projects.push({ name: "", meta: "", text: "" }))}>
            <Plus className="size-4" /> Add a project
          </button>
        </Panel>

        <Panel title="Education, courses and languages">
          <div className="grid gap-3 md:grid-cols-[1fr_8rem]">
            <TextInput label="Degree" value={cv.education.degree} onChange={(v) => set((c) => void (c.education.degree = v))} />
            <TextInput label="Year" value={cv.education.year} onChange={(v) => set((c) => void (c.education.year = v))} />
          </div>
          <TextInput label="School" value={cv.education.school} onChange={(v) => set((c) => void (c.education.school = v))} />
          <TextArea label="Note" rows={2} value={cv.education.note} onChange={(v) => set((c) => void (c.education.note = v))} />
          <Lines label="Courses" value={cv.courses} rows={1} onChange={(v) => set((c) => void (c.courses = v))} addLabel="Add a course" />
          {cv.languages.map((l, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <TextInput label={`Language ${i + 1}`} value={l.name} onChange={(v) => set((c) => void (c.languages[i].name = v))} />
              <TextInput label="Level" value={l.level} onChange={(v) => set((c) => void (c.languages[i].level = v))} />
              <RowActions index={i} count={cv.languages.length} what={`language ${l.name || i + 1}`} onMove={(dir) => set((c) => move(c.languages, i, dir))} onRemove={() => set((c) => void c.languages.splice(i, 1))} />
            </div>
          ))}
          <button type="button" className={smallBtn} onClick={() => set((c) => void c.languages.push({ name: "", level: "" }))}>
            <Plus className="size-4" /> Add a language
          </button>
        </Panel>
      </div>

      {preview && (
        <aside aria-label="CV preview" className="min-w-0 xl:sticky xl:top-32">
          <p className="eyebrow mb-2">Live preview</p>
          <div className="cv-preview max-h-[calc(100dvh-10rem)] overflow-auto rounded-2xl border border-line bg-bg-soft p-3">
            {/* The sheet at its print width, scaled to fit next to the form. */}
            <div style={{ zoom: 0.62 }}>
              <CvSheet cv={cv} />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
