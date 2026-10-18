"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { withBase } from "@/lib/utils";

export function SignOutButton({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await getAuthClient().signOut();
      if (result.error) {
        setError("Couldn't sign out. Please try again.");
        return;
      }
      window.location.assign(withBase("/"));
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={variant === "sidebar" ? "w-full" : "text-right"}>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        className={
          variant === "sidebar"
            ? "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60"
            : "inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-card px-3 text-sm font-semibold text-fg disabled:opacity-60"
        }
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" aria-hidden="true" />}
        Sign out
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
