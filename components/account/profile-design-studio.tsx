"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { CvStudio, type CvDesign } from "@/app/cv/cv-studio";
import { CvEditor } from "@/components/admin/studio/cv-editor";
import type { CvData, CvIdentity } from "@/lib/persona/cv";
import type { PersonaDoc } from "@/lib/persona/schema";
import { roleCvName } from "@/lib/persona/training";
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
  const [view, setView] = useState<"content" | "design">("design");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const updateIdentity = (update: (identity: CvIdentity) => void) => {
    setCvData((current) => {
      const next = structuredClone(current);
      const identity = next.identity ?? { name: "", links: [] };
      update(identity);
      next.identity = identity;
      return next;
    });
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(undefined);
    setError(undefined);
    try {
      const nextDoc = structuredClone(doc);
      const identity = cvData.identity;
      if (identity) {
        nextDoc.identity.name = identity.name.trim() || nextDoc.identity.name;
        nextDoc.identity.role = cvData.title;
        nextDoc.identity.headline = cvData.title;
        nextDoc.identity.email = identity.email?.trim() || undefined;
        nextDoc.identity.phone = identity.phone?.trim() || undefined;
        nextDoc.identity.location = identity.location?.trim() || undefined;
        nextDoc.identity.links = identity.links.map((link) => {
          const label = link.label.toLowerCase();
          const existing = nextDoc.identity.links.find((item) => item.href === link.href);
          const kind = existing?.kind ?? (label.includes("github") ? "github" : label.includes("linkedin") ? "linkedin" : "other");
          return { kind, label: link.label, href: link.href };
        });
        if (identity.photo?.trim()) {
          nextDoc.identity.avatar = { src: identity.photo.trim(), alt: nextDoc.identity.avatar?.alt ?? "" };
        } else {
          delete nextDoc.identity.avatar;
          nextDoc.identity.photos = [];
        }
        nextDoc.name = roleCvName(cvData.title);
      }
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
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 pt-4 sm:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft/40 px-3 py-1 text-xs font-medium text-muted">
          <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
          Mekin&apos;s demo CV is included as editable starter content
        </span>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-8">
        <Link href={`/account/training/${slug}/`} className="text-sm font-semibold text-muted hover:text-fg">
          ← Back to AI training
        </Link>
        <div className="flex items-center gap-3">
          {status && <span role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{status}</span>}
          {error && <span role="alert" className="text-sm text-accent">{error}</span>}
          <div role="group" aria-label="CV editor steps" className="flex rounded-xl border border-line bg-card p-1">
            <button type="button" aria-pressed={view === "design"} onClick={() => setView("design")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "design" ? "bg-surface" : "text-muted"}`}>1. Choose template</button>
            <button type="button" aria-pressed={view === "content"} onClick={() => setView("content")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === "content" ? "bg-surface" : "text-muted"}`}>2. Edit CV information</button>
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
          <section className="mb-5 space-y-4 rounded-2xl border border-line bg-card p-4 sm:p-6" aria-labelledby="cv-personal-details">
            <div>
              <h2 id="cv-personal-details" className="text-lg font-semibold">Personal details</h2>
              <p className="mt-1 text-sm text-muted">These details appear in the CV header and contact row.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["name", "Full name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["location", "Location"],
                ["photo", "Photo URL"],
              ] as const).map(([field, label]) => (
                <label key={field} className="space-y-1.5 text-sm font-medium">
                  {label}
                  <input
                    type={field === "email" ? "email" : "text"}
                    required={field === "name"}
                    value={cvData.identity?.[field] ?? ""}
                    onChange={(event) => updateIdentity((identity) => {
                      if (field === "name") identity.name = event.target.value;
                      else identity[field] = event.target.value;
                    })}
                    className="w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              ))}
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Contact links</legend>
              {(cvData.identity?.links ?? []).map((link, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(8rem,0.4fr)_minmax(0,1fr)_auto] sm:items-end">
                  <label className="space-y-1.5 text-sm font-medium">
                    Link label
                    <input
                      value={link.label}
                      onChange={(event) => updateIdentity((identity) => {
                        identity.links[index] = { ...identity.links[index], label: event.target.value };
                      })}
                      className="w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium">
                    Link URL
                    <input
                      type="url"
                      value={link.href}
                      onChange={(event) => updateIdentity((identity) => {
                        identity.links[index] = { ...identity.links[index], href: event.target.value };
                      })}
                      className="w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => updateIdentity((identity) => { identity.links.splice(index, 1); })}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm text-muted hover:bg-surface hover:text-fg"
                    aria-label={`Remove ${link.label || `link ${index + 1}`}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateIdentity((identity) => { identity.links.push({ label: "", href: "https://" }); })}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-muted hover:bg-surface hover:text-fg"
              >
                <Plus className="size-4" aria-hidden="true" /> Add a link
              </button>
            </fieldset>
          </section>
          <CvEditor value={cvData} onChange={setCvData} fallbackCv={cv} />
        </div>
      ) : (
        <CvStudio
          cv={cvData}
          initialTemplate={design.template}
          initialAccentColor={design.accentColor}
          onDesignChange={setDesign}
          onNextStep={() => setView("content")}
          nextStepLabel="Next: edit your CV details"
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
