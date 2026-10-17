"use client";

import { useState } from "react";
import { Eye, LoaderCircle, X } from "lucide-react";
import { withBase } from "@/lib/utils";

/**
 * Shown on the site while the admin previews a persona's draft (only in their browser): what they're
 * looking at, and a way out.
 */
export function PreviewBar({ name, tier, invalid }: { name: string; tier: "public" | "unlocked"; invalid: boolean }) {
  const [busy, setBusy] = useState(false);
  const exit = async () => {
    setBusy(true);
    await fetch(withBase("/api/admin/preview/"), { method: "DELETE", credentials: "same-origin" }).catch(() => {});
    window.location.reload();
  };
  return (
    <div role="status" className="no-print fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-fg py-1.5 pr-1.5 pl-3.5 text-sm text-bg shadow-lg">
      <Eye className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {invalid ? `The ${name} draft has problems, so the live version shows` : `Draft of ${name}${tier === "unlocked" ? ", with an access code" : ""}`}
      </span>
      <a href={withBase("/admin/personas/")} className="shrink-0 rounded-full px-2 py-1 font-semibold underline-offset-2 hover:underline">
        Studio
      </a>
      <button type="button" onClick={() => void exit()} disabled={busy} className="flex shrink-0 items-center gap-1 rounded-full bg-bg/15 px-2.5 py-1 font-semibold hover:bg-bg/25">
        {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <X className="size-3.5" />} Exit preview
      </button>
    </div>
  );
}
