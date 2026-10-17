"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockOpen } from "lucide-react";
import { lockAgain } from "@/lib/access";
import { usePersona } from "@/lib/persona/context";

/** Shown while this browser has unlocked the private details; a click hides them again. */
export function UnlockedPill() {
  const { tier, access, labels } = usePersona();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (tier !== "unlocked" || access.mode === "open") return null;
  return (
    <button
      type="button"
      disabled={busy}
      title={labels.lockAgain}
      onClick={async () => {
        setBusy(true);
        await lockAgain();
        router.refresh();
        setBusy(false);
      }}
      className="ml-1 flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-semibold text-accent"
    >
      <LockOpen className="size-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">{labels.unlockedBadge}</span>
      <span className="sr-only sm:hidden">{labels.unlockedBadge}</span>
    </button>
  );
}
