"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminFetch } from "./api";
import { NumberInput, Panel, TextInput, smallBtn } from "./controls";

type Code = { id: string; label: string; maxUses: number | null; uses: number; expiresAt: string | null; revokedAt: string | null; lastUsedAt: string | null; createdAt: string };

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

function status(c: Code): { text: string; live: boolean } {
  if (c.revokedAt) return { text: `Revoked ${day(c.revokedAt)}`, live: false };
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now()) return { text: `Expired ${day(c.expiresAt)}`, live: false };
  if (c.maxUses !== null && c.uses >= c.maxUses) return { text: "Used up", live: false };
  return { text: c.expiresAt ? `Works until ${day(c.expiresAt)}` : "Works", live: true };
}

/** Codes for the "With access code" parts: made here, shown once, revocable. */
export function AccessCodes({ slug, siteUrl }: { slug: string; siteUrl?: string }) {
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState<number | undefined>();
  const [days, setDays] = useState<number | undefined>(30);
  const [fresh, setFresh] = useState<{ code: string; label: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>();

  const load = useCallback(async () => {
    const res = await adminFetch<{ codes: Code[] }>(`/api/admin/personas/${slug}/codes/`);
    if (res.ok) setCodes(res.data.codes);
    else setMessage(res.error);
  }, [slug]);
  useEffect(() => {
    // Loads once; state is set when the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = async () => {
    setBusy("create");
    setMessage(undefined);
    const res = await adminFetch<{ code: string; entry: Code }>(`/api/admin/personas/${slug}/codes/`, { body: { label: label.trim(), maxUses, days } });
    setBusy(null);
    if (!res.ok) return setMessage(res.error);
    setFresh({ code: res.data.code, label: res.data.entry.label });
    setCopied(false);
    setLabel("");
    void load();
  };
  const revoke = async (c: Code) => {
    if (!window.confirm(`Revoke the code for "${c.label}"? Visitors who unlocked with it lose access within a minute.`)) return;
    setBusy(c.id);
    const res = await adminFetch(`/api/admin/personas/${slug}/codes/${c.id}/`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) setMessage(res.error);
    void load();
  };
  const resetAll = async () => {
    if (!window.confirm("Make every visitor who unlocked enter a code again? The codes themselves keep working.")) return;
    setBusy("reset");
    const res = await adminFetch(`/api/admin/personas/${slug}/access-reset/`, { body: {} });
    setBusy(null);
    setMessage(res.ok ? "Done: everyone who unlocked has to enter a code again." : res.error);
  };
  const share = fresh ? `Your access code for my page: ${fresh.code}\nOpen ${(siteUrl || window.location.origin).replace(/\/$/, "")}/unlock/?code=${fresh.code} or type the code in the chat box.` : "";

  return (
    <Panel
      title="Access codes"
      description="Give a code to a family or person you trust. Each code shows only here, once: copy it when it appears."
      actions={
        <button type="button" className={smallBtn} disabled={busy === "reset"} onClick={() => void resetAll()} title="Everyone who unlocked must enter a code again">
          <LogOut className="size-4" /> Sign everyone out
        </button>
      }
    >
      <form
        className="grid items-end gap-3 md:grid-cols-[1fr_9rem_9rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim()) void create();
        }}
      >
        <TextInput label="Who is it for" placeholder="Rahman family" value={label} onChange={setLabel} />
        <NumberInput label="Uses (empty: any)" value={maxUses} onChange={setMaxUses} min={1} max={1000} />
        <NumberInput label="Days (empty: no end)" value={days} onChange={setDays} min={1} max={3650} />
        <button type="submit" className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={!label.trim() || busy === "create"}>
          {busy === "create" ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} New code
        </button>
      </form>

      {fresh && (
        <div role="status" className="space-y-2 rounded-xl border border-accent/40 bg-accent-soft/50 p-3.5">
          <p className="text-sm font-semibold">Code for {fresh.label} (shown only now):</p>
          <p className="font-mono text-lg font-semibold tracking-wider select-all">{fresh.code}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={smallBtn}
              onClick={() => {
                void navigator.clipboard?.writeText(share).then(() => setCopied(true));
              }}
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy with a message"}
            </button>
            <button type="button" className={smallBtn} onClick={() => setFresh(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm font-medium">
          {message}
        </p>
      )}

      {codes === null ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted">No codes yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {codes.map((c) => {
            const s = status(c);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <KeyRound className={cn("size-4", s.live ? "text-emerald-600" : "text-faint")} aria-hidden="true" />
                <span className="font-semibold">{c.label}</span>
                <span className="text-muted">
                  {s.text} · used {c.uses}
                  {c.maxUses !== null ? ` of ${c.maxUses}` : ""}
                  {c.lastUsedAt ? ` · last ${day(c.lastUsedAt)}` : ""}
                </span>
                {!c.revokedAt && (
                  <button type="button" className={cn(smallBtn, "ml-auto hover:text-accent")} disabled={busy === c.id} onClick={() => void revoke(c)}>
                    Revoke
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
