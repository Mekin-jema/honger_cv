"use client";

import { CheckCircle2, LoaderCircle, Play, Plus, XCircle } from "lucide-react";
import { enText } from "@/lib/persona/edit";
import { cn } from "@/lib/utils";
import { IdListPicker, ListInput, Panel, RowActions, SelectInput, TextInput, smallBtn } from "./controls";
import { JobProgress, useJob } from "./job";
import type { TabProps } from "./studio";

type Result = { kind: "golden" | "leak" | "injection"; question: string; tier: string; ok: boolean; route?: string; note?: string };
type Report = { results: Result[]; leaks: number; warnings: number; skipped?: string; calls: number };

const KIND: Record<Result["kind"], string> = { golden: "Your test", leak: "Privacy", injection: "Trick" };

export function ChecksTab({ slug, draft, doc, ai }: TabProps) {
  const set = draft.update;
  const checks = doc.checks ?? [];
  const job = useJob();
  const report = job.job?.progress.result?.checks as Report | undefined;
  const questions = (doc.questions ?? []).map((q) => ({ id: q.id, label: enText(q.label) || q.id }));

  const run = async () => {
    if (!(await draft.flush())) return job.fail("Save the draft first.");
    await job.start(`/api/admin/personas/${slug}/checks/`, {});
  };

  return (
    <div className="space-y-5">
      <Panel
        title="Run the checks on this draft"
        description="Asks your test questions, tries to get hidden values out (privacy), and tries a few tricks, against the draft - the site isn't touched. The same checks run when you publish; a privacy failure blocks the publish."
        actions={
          <button type="button" className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={!ai || job.running || draft.status.issues.length > 0} onClick={() => void run()}>
            {job.running ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />} Run checks
          </button>
        }
      >
        {!ai && <p className="text-sm text-muted">Needs AI on this server (GEMINI_API_KEY).</p>}
        <JobProgress view={job} title="Checks" />
        {report && !report.skipped && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              {report.results.filter((r) => r.ok).length} of {report.results.length} as expected
              {report.leaks ? <span className="text-accent"> · {report.leaks} privacy problem(s)</span> : ""}
            </p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {report.results.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 px-3 py-2 text-sm">
                  {r.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="As expected" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-label="Not as expected" />}
                  <span className="min-w-0 flex-1">
                    <span className="block">{r.question}</span>
                    <span className="text-xs text-muted">
                      {KIND[r.kind]} · {r.tier === "unlocked" ? "with a code" : "visitor"}
                      {r.route ? ` · answered: ${r.route}` : ""}
                      {r.note ? ` · ${r.note}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel title="Your test questions" description="Questions with the answer you expect. They run on every publish, so a change that breaks an answer is caught.">
        <div className="space-y-3">
          {checks.map((c, i) => (
            <fieldset key={i} className="space-y-3 rounded-xl border border-line p-3">
              <legend className="sr-only">Test question {i + 1}</legend>
              <div className="flex flex-wrap items-end gap-3">
                <TextInput label={`Question ${i + 1}`} value={c.q} onChange={(v) => set((d) => void (d.checks![i].q = v))} className="min-w-64 flex-1" />
                <SelectInput
                  label="Asked by"
                  value={c.tier ?? "public"}
                  options={[
                    { value: "public", label: "A visitor" },
                    { value: "unlocked", label: "A visitor with a code" },
                  ]}
                  onChange={(v) => set((d) => void (d.checks![i].tier = v))}
                />
                <SelectInput
                  label="Expected"
                  value={c.expect.route ?? ""}
                  options={[
                    { value: "", label: "Any answer" },
                    { value: "topic", label: "A ready-made question" },
                    { value: "answer", label: "A written answer" },
                    { value: "gated", label: "Needs an access code" },
                    { value: "decline", label: "A polite no" },
                  ]}
                  onChange={(v) => set((d) => void (d.checks![i].expect.route = (v || undefined) as typeof c.expect.route))}
                />
                <RowActions index={i} count={checks.length} what={`test ${i + 1}`} onMove={(dir) => set((d) => void ([d.checks![i], d.checks![i + dir]] = [d.checks![i + dir], d.checks![i]]))} onRemove={() => set((d) => void d.checks!.splice(i, 1))} />
              </div>
              {c.expect.route === "topic" && <IdListPicker label="One of these questions" value={c.expect.intentIdIn} options={questions} max={10} onChange={(v) => set((d) => void (d.checks![i].expect.intentIdIn = v.length ? v : undefined))} />}
              <div className="grid gap-3 md:grid-cols-2">
                <ListInput label="The answer must mention" hint="Comma-separated words or phrases." value={c.expect.mustInclude} onChange={(v) => set((d) => void (d.checks![i].expect.mustInclude = v.length ? v : undefined))} />
                <ListInput label="The answer must never mention" value={c.expect.mustNotInclude} onChange={(v) => set((d) => void (d.checks![i].expect.mustNotInclude = v.length ? v : undefined))} />
              </div>
            </fieldset>
          ))}
          <button type="button" className={cn(smallBtn)} onClick={() => set((d) => void (d.checks ??= []).push({ q: "", tier: "public", lang: "en", expect: {} }))}>
            <Plus className="size-4" /> Add a test question
          </button>
        </div>
      </Panel>
    </div>
  );
}
