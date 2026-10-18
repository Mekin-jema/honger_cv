"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Save } from "lucide-react";
import { CvStudio, type CvDesign } from "@/app/cv/cv-studio";
import { CvEditor } from "@/components/admin/studio/cv-editor";
import type { CvData } from "@/lib/persona/cv";
import type { PersonaDoc } from "@/lib/persona/schema";
import { withBase } from "@/lib/utils";

export function ProfileDesignStudio({
  slug,
  doc: initialDoc,
  initialRev,
  cv,
  initialDesign,
}: {
  slug: string;
  doc: PersonaDoc;
  initialRev: number;
  cv: CvData;
  initialDesign: CvDesign;
}) {
  const [doc] = useState(initialDoc);
  const [rev, setRev] = useState(initialRev);
  const [design, setDesign] = useState(initialDesign);
  const [cvData, setCvData] = useState(cv);
  const [view, setView] = useState<"content" | "design">("content");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(undefined);
    setError(undefined);
    try {
      const nextDoc = structuredClone(doc);
      nextDoc.document.data = {
        ...(nextDoc.document.data ?? {}),
        ...cvData,
        cvTemplate: design.template,
        cvAccent: design.accentColor,
      };
      const response = await fetch(withBase(`/api/account/personas/${slug}/`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc: nextDoc, rev }),
      });
      const result = (await response.json()) as { rev?: number; error?: string };
      if (!response.ok || typeof result.rev !== "number") {
        setError(result.error || "Couldn't save your CV design.");
        return;
      }
      setRev(result.rev);
      setStatus("Your CV form and design are saved to your private draft.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-8">
        <Link href={`/account/training/${slug}/`} className="text-sm font-semibold text-muted hover:text-fg">
          ← Back to AI training
        </Link>
        <div className="flex items-center gap-3">
          {status && <span role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{status}</span>}
          {error && <span role="alert" className="text-sm text-accent">{error}</span>}
          <div role="group" aria-label="CV editor" className="flex rounded-xl border border-line bg-card p-1">
            <button type="button" aria-pressed={view === "content"} onClick={() => setView("content")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "content" ? "bg-surface" : "text-muted"}`}>CV form</button>
            <button type="button" aria-pressed={view === "design"} onClick={() => setView("design")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "design" ? "bg-surface" : "text-muted"}`}>Design</button>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save CV
          </button>
        </div>
      </div>
      {view === "content" ? (
        <div className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <CvEditor value={cvData} onChange={setCvData} fallbackCv={cv} />
        </div>
      ) : (
        <CvStudio
          cv={cvData}
          initialTemplate={design.template}
          initialAccentColor={design.accentColor}
          onDesignChange={setDesign}
          onPrint={() => {
            void fetch(withBase(`/api/account/personas/${slug}/pdf/`), { method: "POST" })
              .catch((err: unknown) => console.error("[platform-analytics] Could not record PDF print request:", err));
          }}
          showSidebarToggle={false}
        />
      )}
    </div>
  );
}
