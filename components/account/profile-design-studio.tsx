"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Save } from "lucide-react";
import { CvStudio, type CvDesign } from "@/app/cv/cv-studio";
import type { CvData } from "@/lib/persona/cv";
import type { PersonaDoc } from "@/lib/persona/schema";
import type { CvTemplateId } from "@/lib/persona/cv-templates";
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
      setStatus("Your CV design is saved to your private draft.");
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
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save design
          </button>
        </div>
      </div>
      <CvStudio
        cv={cv}
        initialTemplate={initialDesign.template}
        initialAccentColor={initialDesign.accentColor}
        onDesignChange={setDesign}
        onPrint={() => {
          void fetch(withBase(`/api/account/personas/${slug}/pdf/`), { method: "POST" })
            .catch((err: unknown) => console.error("[platform-analytics] Could not record PDF print request:", err));
        }}
        showSidebarToggle={false}
      />
    </div>
  );
}
