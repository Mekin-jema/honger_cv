"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2, LockOpen, Send } from "lucide-react";
import { formatAccessCode, looksLikeAccessCode, normalizeAccessCode } from "@/lib/persona/access-code";
import { usePersona } from "@/lib/persona/context";
import { RichText } from "@/components/chat/rich-text";
import { cn } from "@/lib/utils";
import { lockAgain, unlockWithCode } from "@/lib/access";
import { postApi } from "@/lib/visitor";
import { field, label } from "./forms";

/**
 * Shown under an answer that needs details shared only with people the owner trusts (and on a gated
 * document page): enter an access code, or (when the persona allows it) ask for access. With a code
 * already entered, it says so and offers to hide the details again.
 */
export function RequestAccess({ compact }: { compact?: boolean }) {
  const persona = usePersona();
  const { labels, access, tier } = persona;
  const router = useRouter();
  const id = useId();
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ busy?: "unlock" | "lock" | "request"; error?: string; sent?: boolean }>({});
  const [form, setForm] = useState({ name: "", relation: "", phone: "", email: "", message: "" });
  const [showForm, setShowForm] = useState(false);

  if (access.mode === "open") return null;

  if (tier === "unlocked")
    return (
      <div className="card flex flex-wrap items-center gap-3 p-4 md:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <LockOpen className="size-5" />
        </span>
        <span className="font-semibold">{labels.unlockedBadge}</span>
        <button
          type="button"
          className="ml-auto text-sm font-medium text-muted underline-offset-2 hover:text-fg hover:underline"
          disabled={state.busy === "lock"}
          onClick={async () => {
            setState({ busy: "lock" });
            await lockAgain();
            router.refresh();
            setState({});
          }}
        >
          {labels.lockAgain}
        </button>
      </div>
    );

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!looksLikeAccessCode(code)) return setState({ error: labels.codeWrong });
    setState({ busy: "unlock" });
    const res = await unlockWithCode(code);
    if (!res.ok) return setState({ error: res.limited ? labels.codeLimited : labels.codeWrong });
    setState({});
    // The server now renders this visitor's unlocked view (answers, cards, the document).
    router.refresh();
  };

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim() && !form.email.trim()) return setState({ error: labels.requestNeedContact });
    setState({ busy: "request" });
    const res = await postApi("/api/access/request/", form);
    setState(res.ok ? { sent: true } : { error: res.error ?? labels.codeWrong });
  };

  return (
    <div className={cn("card space-y-4 p-4 md:p-5", compact && "p-4")}>
      <form onSubmit={unlock} className="space-y-2" noValidate>
        <label htmlFor={`${id}-code`} className={label}>
          <KeyRound className="mr-1.5 inline size-4 align-[-2px] text-accent" aria-hidden="true" />
          {labels.enterCode}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${id}-code`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => looksLikeAccessCode(code) && setCode(formatAccessCode(normalizeAccessCode(code)))}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            aria-describedby={access.hint ? `${id}-hint` : undefined}
            className={cn(field, "min-w-0 flex-1 font-mono tracking-wider uppercase placeholder:normal-case")}
          />
          <button type="submit" className="btn btn-primary" aria-disabled={state.busy === "unlock"}>
            {state.busy === "unlock" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LockOpen className="size-4" aria-hidden="true" />} {labels.unlockButton}
          </button>
        </div>
        {access.hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {access.hint}
          </p>
        )}
      </form>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-accent">
          {state.error}
        </p>
      )}

      {access.mode === "request" &&
        (state.sent ? (
          <p role="status" className="flex items-center gap-2 text-[15px] font-medium">
            <Check className="size-5 text-accent" aria-hidden="true" /> {labels.requestSent}
          </p>
        ) : !showForm ? (
          <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)} aria-expanded={false}>
            <Send className="size-4" aria-hidden="true" /> {labels.requestAccess}
          </button>
        ) : (
          <form onSubmit={request} className="space-y-3 border-t border-line pt-4" noValidate>
            <p className="font-semibold">{labels.requestTitle}</p>
            {access.requestIntro && (
              <p className="text-[15px] leading-relaxed text-muted">
                <RichText text={access.requestIntro} />
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", labels.requestName, "name", "text"],
                  ["relation", labels.requestRelation, "off", "text"],
                  ["phone", labels.requestPhone, "tel", "tel"],
                  ["email", labels.requestEmail, "email", "email"],
                ] as const
              ).map(([k, text, auto, type]) => (
                <div key={k}>
                  <label htmlFor={`${id}-${k}`} className={label}>
                    {text}
                  </label>
                  <input id={`${id}-${k}`} type={type} autoComplete={auto} maxLength={k === "email" ? 200 : 120} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={field} />
                </div>
              ))}
            </div>
            <div>
              <label htmlFor={`${id}-message`} className={label}>
                {labels.requestMessage}
              </label>
              <textarea id={`${id}-message`} rows={3} maxLength={2000} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={cn(field, "resize-y")} />
            </div>
            <button type="submit" className="btn btn-primary" aria-disabled={state.busy === "request"}>
              {state.busy === "request" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} {labels.requestSend}
            </button>
          </form>
        ))}
    </div>
  );
}
