"use client";

import { useState } from "react";
import { KeyRound, Loader2, LockOpen } from "lucide-react";
import { RequestAccess } from "@/components/blocks/request-access";
import { ThemeToggle } from "@/components/theme-provider";
import { maskCode, unlockWithCode } from "@/lib/access";
import { usePersona } from "@/lib/persona/context";

export function UnlockCard({ code }: { code: string }) {
  const persona = usePersona();
  const { labels, identity, tier } = persona;
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  const go = async () => {
    setState({ busy: true });
    const res = await unlockWithCode(code);
    if (res.ok) window.location.assign(persona.href("/"));
    else setState({ error: res.limited ? labels.codeLimited : labels.codeWrong });
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <a href={persona.href("/")} className="font-semibold tracking-tight">
            {identity.name}
          </a>
          <ThemeToggle />
        </div>
        {tier === "unlocked" ? (
          <div className="card space-y-3 p-6">
            <p className="flex items-center gap-2 font-semibold">
              <LockOpen className="size-5 text-accent" aria-hidden="true" /> {labels.unlockedBadge}
            </p>
            <a href={persona.href("/")} className="btn btn-primary">
              {labels.notFoundBack}
            </a>
          </div>
        ) : code ? (
          <div className="card space-y-4 p-6">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <KeyRound className="size-5 text-accent" aria-hidden="true" /> {labels.enterCode}
            </h1>
            <p className="font-mono text-lg tracking-wider">{maskCode(code)}</p>
            {state.error && (
              <p role="alert" className="text-sm font-medium text-accent">
                {state.error}
              </p>
            )}
            <button type="button" onClick={() => void go()} className="btn btn-primary w-full" aria-disabled={state.busy}>
              {state.busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LockOpen className="size-4" aria-hidden="true" />} {labels.unlockButton}
            </button>
          </div>
        ) : (
          <RequestAccess />
        )}
      </div>
    </main>
  );
}
