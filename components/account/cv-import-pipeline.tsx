"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileCode,
  FileUp,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import type { CvData } from "@/lib/persona/cv";
import { mergeCvData, type MergeResult } from "@/server/services/cv-mapper/safe-merge";
import type { StructuredCvData } from "@/server/services/cv-extractor/schema";
import { cn, withBase } from "@/lib/utils";

export type PipelineStage =
  | "idle"
  | "uploading"
  | "parsing_docling"
  | "converting_markdown"
  | "extracting_ai"
  | "validating"
  | "conflict_review"
  | "success"
  | "error";

const STAGES: { id: PipelineStage; label: string; desc: string }[] = [
  { id: "uploading", label: "Uploading document", desc: "Transmitting file safely" },
  { id: "parsing_docling", label: "Docling document parsing", desc: "Reading document layout & tables" },
  { id: "converting_markdown", label: "Markdown conversion", desc: "Generating normalized structured content" },
  { id: "extracting_ai", label: "AI CV extraction", desc: "Extracting structured experience & skills" },
  { id: "validating", label: "Schema validation", desc: "Mapping directly to CV form schema" },
];

export interface CvImportPipelineProps {
  slug?: string;
  currentCv: CvData;
  onApplyCv: (nextCv: CvData, meta: { filename: string; markdown?: string }) => void;
  disabled?: boolean;
}

export function CvImportPipeline({ currentCv, onApplyCv, disabled = false }: CvImportPipelineProps) {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [filename, setFilename] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("");
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, "keep-existing" | "use-imported">>({});
  const [extractedData, setExtractedData] = useState<StructuredCvData | null>(null);
  const [summaryStats, setSummaryStats] = useState<{ fields: number; jobs: number; skills: number } | null>(null);

  const reset = () => {
    setStage("idle");
    setErrorMessage(undefined);
    setMergeResult(null);
    setResolutions({});
    setExtractedData(null);
  };

  const processFile = async (file: File) => {
    if (disabled || stage !== "idle" && stage !== "error" && stage !== "success") return;

    const lower = file.name.toLowerCase();
    const validExtensions = [".pdf", ".docx", ".pptx", ".txt", ".md", ".markdown"];
    const isValidExt = validExtensions.some((ext) => lower.endsWith(ext));

    if (!isValidExt) {
      setErrorMessage("Please choose a supported CV file (PDF, DOCX, PPTX, TXT, or Markdown).");
      setStage("error");
      return;
    }

    if (file.size > 15_000_000) {
      setErrorMessage("This file is too large. Please upload a CV document under 15 MB.");
      setStage("error");
      return;
    }

    setFilename(file.name);
    setErrorMessage(undefined);
    setStage("uploading");
    setStageIndex(0);

    try {
      // Step 1: Upload & Docling Parse (/api/cv/parse)
      setStageIndex(1);
      setStage("parsing_docling");

      const parseForm = new FormData();
      parseForm.set("file", file);

      const parseRes = await fetch(withBase("/api/cv/parse"), {
        method: "POST",
        body: parseForm,
      });

      const parseJson = await parseRes.json().catch(() => ({}));
      if (!parseRes.ok || !parseJson.success || !parseJson.markdown) {
        throw new Error(parseJson.error || "Docling could not parse this document into readable content.");
      }

      const generatedMarkdown = parseJson.markdown;
      setMarkdown(generatedMarkdown);

      // Step 2: Markdown normalization finished
      setStageIndex(2);
      setStage("converting_markdown");
      await new Promise((r) => setTimeout(r, 200));

      // Step 3: AI CV Extraction (/api/cv/extract)
      setStageIndex(3);
      setStage("extracting_ai");

      const extractRes = await fetch(withBase("/api/cv/extract"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: generatedMarkdown, filename: file.name }),
      });

      const extractJson = await extractRes.json().catch(() => ({}));
      if (!extractRes.ok || !extractJson.success || !extractJson.data) {
        throw new Error(extractJson.error || "AI could not extract structured CV fields from the document.");
      }

      const rawExtracted: StructuredCvData = extractJson.data;
      setExtractedData(rawExtracted);

      // Step 4: Schema Validation & Safe Merge Check
      setStageIndex(4);
      setStage("validating");
      await new Promise((r) => setTimeout(r, 200));

      const merge = mergeCvData(currentCv, rawExtracted, { strategy: "safe-preserve" });
      setMergeResult(merge);

      const initialResolutions: Record<string, "keep-existing" | "use-imported"> = {};
      merge.diffs.forEach((d) => {
        if (d.status === "conflict") {
          initialResolutions[d.field] = "keep-existing"; // Safe default: never overwrite without approval
        }
      });
      setResolutions(initialResolutions);

      setSummaryStats({
        fields: merge.populatedCount + (merge.hasConflicts ? merge.conflictCount : 0),
        jobs: rawExtracted.experience.length,
        skills: rawExtracted.skills.length,
      });

      // Step 5: If there are user conflicts, ask for review; otherwise apply directly
      if (merge.hasConflicts) {
        setStage("conflict_review");
      } else {
        onApplyCv(merge.mergedCv, { filename: file.name, markdown: generatedMarkdown });
        setStage("success");
      }
    } catch (err: unknown) {
      console.error("[CvImportPipeline] Error:", err);
      setErrorMessage(err instanceof Error ? err.message : "CV processing failed. Please try another file.");
      setStage("error");
    }
  };

  const applyCustomResolutions = () => {
    if (!extractedData) return;
    const resolved = mergeCvData(currentCv, extractedData, {
      strategy: "selective",
      resolutions,
    });
    onApplyCv(resolved.mergedCv, { filename, markdown });
    setStage("success");
  };

  const acceptAllImported = () => {
    if (!extractedData) return;
    const resolved = mergeCvData(currentCv, extractedData, {
      strategy: "overwrite-all",
    });
    onApplyCv(resolved.mergedCv, { filename, markdown });
    setStage("success");
  };

  const copyMarkdown = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const isProcessing =
    stage === "uploading" ||
    stage === "parsing_docling" ||
    stage === "converting_markdown" ||
    stage === "extracting_ai" ||
    stage === "validating";

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--card-shadow)]" aria-labelledby="cv-pipeline-heading">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/60 px-5 py-4 sm:px-7">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="size-3.5" aria-hidden="true" /> AI CV Import Pipeline
          </div>
          <h2 id="cv-pipeline-heading" className="mt-0.5 text-lg font-semibold text-fg">
            Upload & auto-fill CV with Docling
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Converts PDF, Word (DOCX), PPTX, or Markdown into clean structured data. Your existing entries are protected.
          </p>
        </div>
        {markdown && (
          <button
            type="button"
            onClick={() => setShowMarkdownModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface hover:text-fg"
          >
            <FileCode className="size-3.5 text-accent" /> View Parsed Markdown
          </button>
        )}
      </div>

      <div className="p-5 sm:p-7">
        {/* State: IDLE */}
        {stage === "idle" && (
          <div
            className={cn(
              "relative rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 sm:p-9",
              dragActive
                ? "border-accent bg-accent/10 ring-4 ring-accent/20"
                : "border-line-strong bg-bg-soft/40 hover:border-accent/60 hover:bg-bg-soft",
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void processFile(file);
            }}
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <FileUp className="size-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-fg">Drop your CV document here</h3>
            <p className="mt-1.5 text-sm text-muted">
              or choose from your device · PDF, DOCX, PPTX, TXT, or Markdown · up to 15 MB
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-md border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-muted">PDF</span>
              <span className="rounded-md border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-muted">DOCX</span>
              <span className="rounded-md border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-muted">Markdown</span>
              <span className="rounded-md border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-muted">Docling OCR</span>
            </div>

            <div className="mt-5">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent shadow transition hover:brightness-95 active:scale-[0.98]">
                <FileUp className="size-4" aria-hidden="true" /> Choose CV Document
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={disabled}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (file) void processFile(file);
                  }}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-600" /> Preserves existing data safely
              </span>
              <span>Docling structural analysis</span>
              <span>Full review before saving</span>
            </div>
          </div>
        )}

        {/* State: PROCESSING PIPELINE */}
        {isProcessing && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">Processing {filename}</p>
                <p className="text-xs text-muted">Docling and AI pipeline in progress...</p>
              </div>
            </div>

            {/* Stage Stepper */}
            <div className="grid gap-2.5 sm:grid-cols-5">
              {STAGES.map((s, idx) => {
                const isDone = idx < stageIndex;
                const isCurrent = idx === stageIndex;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-3 text-xs transition-colors",
                      isCurrent && "border-accent bg-accent/5 shadow-sm",
                      isDone && "border-emerald-600/40 bg-emerald-500/5",
                      !isCurrent && !isDone && "border-line bg-bg-soft/50 text-muted opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg">
                        {idx + 1}. {s.label}
                      </span>
                      {isDone && <Check className="size-3.5 text-emerald-600" />}
                      {isCurrent && <LoaderCircle className="size-3.5 animate-spin text-accent" />}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* State: CONFLICT REVIEW */}
        {stage === "conflict_review" && mergeResult && (
          <div className="space-y-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <h3 className="font-semibold text-fg">Review extracted differences</h3>
                <p className="text-sm text-muted">
                  We found {mergeResult.conflictCount} field{mergeResult.conflictCount > 1 ? "s" : ""} where you already entered information.
                  Choose which values to keep. Non-conflicting details have already been populated.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {mergeResult.diffs
                .filter((d) => d.status === "conflict")
                .map((diff) => {
                  const currentChoice = resolutions[diff.field] ?? "keep-existing";
                  const existingStr = typeof diff.existingValue === "string" ? diff.existingValue : JSON.stringify(diff.existingValue);
                  const importedStr = typeof diff.importedValue === "string" ? diff.importedValue : JSON.stringify(diff.importedValue);

                  return (
                    <div key={diff.field} className="rounded-xl border border-line bg-card p-4 text-xs sm:text-sm">
                      <p className="font-semibold text-fg">{diff.label}</p>
                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        {/* Current value */}
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                            currentChoice === "keep-existing"
                              ? "border-accent bg-accent/10 text-fg"
                              : "border-line bg-bg-soft text-muted hover:border-line-strong",
                          )}
                        >
                          <input
                            type="radio"
                            name={`conflict-${diff.field}`}
                            checked={currentChoice === "keep-existing"}
                            onChange={() => setResolutions((r) => ({ ...r, [diff.field]: "keep-existing" }))}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">Current Value</span>
                            <span className="mt-0.5 block truncate font-medium text-fg">{existingStr || "(empty)"}</span>
                          </div>
                        </label>

                        {/* Imported value */}
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                            currentChoice === "use-imported"
                              ? "border-accent bg-accent/10 text-fg"
                              : "border-line bg-bg-soft text-muted hover:border-line-strong",
                          )}
                        >
                          <input
                            type="radio"
                            name={`conflict-${diff.field}`}
                            checked={currentChoice === "use-imported"}
                            onChange={() => setResolutions((r) => ({ ...r, [diff.field]: "use-imported" }))}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">Extracted From CV</span>
                            <span className="mt-0.5 block truncate font-medium text-fg">{importedStr || "(empty)"}</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={acceptAllImported}
                className="text-xs font-semibold text-muted underline-offset-4 hover:underline"
              >
                Accept all imported values
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-muted hover:text-fg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCustomResolutions}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-on-accent hover:brightness-95"
                >
                  Apply & Populate Form <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: SUCCESS */}
        {stage === "success" && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-600/30 bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600/15 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-fg">CV populated from {filename}</h3>
                <p className="text-xs text-muted">
                  {summaryStats
                    ? `Mapped ${summaryStats.fields} fields, ${summaryStats.jobs} work roles, and ${summaryStats.skills} skill groups into your CV form.`
                    : "Document parsed and form fields populated successfully."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {markdown && (
                <button
                  type="button"
                  onClick={() => setShowMarkdownModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg"
                >
                  <Eye className="size-3.5" /> Parsed Markdown
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg"
              >
                <RefreshCw className="size-3.5" /> Upload Another
              </button>
            </div>
          </div>
        )}

        {/* State: ERROR */}
        {stage === "error" && (
          <div className="space-y-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
              <div>
                <h3 className="font-semibold text-fg">Could not extract CV</h3>
                <p className="mt-1 text-sm text-muted">{errorMessage || "An unexpected error occurred during document parsing."}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:brightness-95"
              >
                <RotateCcw className="size-3.5" /> Try Another Document
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Markdown Inspection Modal */}
      {showMarkdownModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-line bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-2">
                <FileCode className="size-5 text-accent" />
                <h3 className="font-semibold text-fg">Docling Parsed Markdown ({filename})</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyMarkdown}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg"
                >
                  {copiedMd ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  {copiedMd ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMarkdownModal(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 font-mono text-xs leading-relaxed text-fg">
              <pre className="whitespace-pre-wrap">{markdown}</pre>
            </div>
            <div className="border-t border-line bg-surface/40 px-6 py-3 text-right">
              <button
                type="button"
                onClick={() => setShowMarkdownModal(false)}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:brightness-95"
              >
                Continue to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Reusable field source badge for the CV form.
 */
export function FieldSourceBadge({ status }: { status?: "imported" | "existing" | "missing" | "needs_review" }) {
  if (!status) return null;
  const config = {
    imported: { label: "Imported", color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" },
    existing: { label: "User entered", color: "text-muted bg-surface border-line" },
    missing: { label: "Not in CV", color: "text-amber-700 bg-amber-500/10 border-amber-500/20" },
    needs_review: { label: "Needs review", color: "text-accent bg-accent/10 border-accent/20" },
  }[status];

  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", config.color)}>
      {config.label}
    </span>
  );
}
