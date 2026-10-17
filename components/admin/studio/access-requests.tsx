"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, Mail, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminFetch } from "./api";
import { Panel, smallBtn } from "./controls";

type Request = { id: string; name: string; relation: string | null; phone: string | null; email: string | null; message: string; status: "new" | "approved" | "declined"; codeId: string | null; createdAt: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** People who asked for access: approve with a new code (shown once, to send them) or decline. */
export function AccessRequests({ slug, siteUrl }: { slug: string; siteUrl?: string }) {
  const [list, setList] = useState<Request[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const res = await adminFetch<{ requests: Request[] }>(`/api/admin/personas/${slug}/requests/`);
    if (res.ok) setList(res.data.requests);
    else setError(res.error);
  }, [slug]);
  useEffect(() => {
    // Loads once; state is set when the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const decide = async (r: Request, action: "approve" | "decline") => {
    if (action === "decline" && !window.confirm(`Decline the request from ${r.name}?`)) return;
    setBusy(r.id);
    const res = await adminFetch<{ code?: string }>(`/api/admin/personas/${slug}/requests/`, { body: { id: r.id, action } });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    if (res.data.code) {
      setFresh({ id: r.id, code: res.data.code });
      setCopied(false);
    }
    void load();
  };

  const share = (code: string) => `Here is your access code: ${code}\nOpen ${(siteUrl || window.location.origin).replace(/\/$/, "")}/unlock/?code=${code} or type the code in the chat box.`;

  return (
    <Panel title="Access requests" description="People who asked to see the details shared with a code. Approving makes a code for them (5 uses, 60 days); send it yourself by phone or message.">
      {error && (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      )}
      {list === null ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">No requests yet.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className={cn("space-y-2 rounded-xl border border-line p-3.5", r.status !== "new" && "opacity-75")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{r.name}</span>
                {r.relation && <span className="text-sm text-muted">{r.relation}</span>}
                <span className="text-xs text-faint">{when(r.createdAt)}</span>
                <span
                  className={cn(
                    "ml-auto rounded-md px-1.5 py-0.5 text-xs font-semibold",
                    r.status === "new" && "bg-accent-soft text-accent",
                    r.status === "approved" && "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
                    r.status === "declined" && "bg-surface text-muted",
                  )}
                >
                  {r.status === "new" ? "New" : r.status === "approved" ? "Approved" : "Declined"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {r.phone && (
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Phone className="size-3.5" aria-hidden="true" /> {r.phone}
                  </a>
                )}
                {r.email && (
                  <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Mail className="size-3.5" aria-hidden="true" /> {r.email}
                  </a>
                )}
              </div>
              {r.message && r.message !== "(no message)" && <p className="text-[15px] whitespace-pre-line text-muted">{r.message}</p>}
              {fresh?.id === r.id && (
                <div role="status" className="space-y-2 rounded-lg border border-accent/40 bg-accent-soft/50 p-3">
                  <p className="text-sm font-semibold">Code for {r.name} (shown only now):</p>
                  <p className="font-mono text-lg font-semibold tracking-wider select-all">{fresh.code}</p>
                  <button type="button" className={smallBtn} onClick={() => void navigator.clipboard?.writeText(share(fresh.code)).then(() => setCopied(true))}>
                    {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy with a message"}
                  </button>
                </div>
              )}
              {r.status === "new" && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary px-3.5 py-1.5 text-sm" disabled={busy === r.id} onClick={() => void decide(r, "approve")}>
                    {busy === r.id ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Approve and make a code
                  </button>
                  <button type="button" className={smallBtn} disabled={busy === r.id} onClick={() => void decide(r, "decline")}>
                    <X className="size-4" /> Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
