"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonaDocInput } from "@/lib/persona/schema";
import { adminFetch } from "./api";

export type Doc = PersonaDocInput;
export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
export type DraftStatus = { state: SaveState; error?: string; issues: string[]; changed: boolean | null; rev: number };

const SAVE_AFTER_MS = 800;
const RETRY_AFTER_MS = 5000;

/**
 * The persona draft being edited, saved automatically a moment after each change (one save at a time).
 * Each save names the revision it started from; if another tab saved in between, the server refuses
 * (409) and editing stops until the page is reloaded, so nobody overwrites anybody.
 */
export function useDraft(slug: string, initial: { doc: Doc; rev: number; issues: string[]; changed: boolean | null }) {
  const [doc, setDoc] = useState<Doc>(initial.doc);
  const [status, setStatus] = useState<DraftStatus>({ state: "saved", issues: initial.issues, changed: initial.changed, rev: initial.rev });
  const st = useRef({ doc: initial.doc, rev: initial.rev, dirty: false, conflict: false, inflight: null as Promise<void> | null, timer: undefined as ReturnType<typeof setTimeout> | undefined });
  const saveRef = useRef<() => Promise<boolean>>(async () => true);
  /** Saves after `ms` (a newer edit restarts the wait). */
  const schedule = useCallback((ms: number) => {
    const s = st.current;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => void saveRef.current(), ms);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const s = st.current;
    clearTimeout(s.timer);
    while (s.inflight) await s.inflight;
    if (s.conflict) return false;
    if (!s.dirty) return true;
    s.dirty = false;
    setStatus((x) => ({ ...x, state: "saving", error: undefined }));
    let ok = false;
    const run = (async () => {
      const res = await adminFetch<{ rev: number; issues: string[]; changed: boolean | null }>(`/api/admin/personas/${slug}/draft/`, { method: "PUT", body: { doc: s.doc, rev: s.rev } });
      if (!res.ok && res.status === 409) {
        s.conflict = true;
        setStatus((x) => ({ ...x, state: "conflict", error: res.error }));
        return;
      }
      if (!res.ok) {
        s.dirty = true;
        setStatus((x) => ({ ...x, state: "error", error: res.error }));
        // Network trouble: try again shortly (the change is kept in the page meanwhile).
        if (res.status === 0 || res.status >= 500) schedule(RETRY_AFTER_MS);
        return;
      }
      s.rev = res.data.rev;
      ok = true;
      setStatus({ state: s.dirty ? "dirty" : "saved", issues: res.data.issues, changed: res.data.changed, rev: s.rev });
    })();
    s.inflight = run;
    await run;
    s.inflight = null;
    // Edited while saving: save again.
    if (ok && s.dirty) schedule(SAVE_AFTER_MS);
    return ok && !s.dirty;
  }, [slug, schedule]);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  /** Applies an edit to a copy of the draft and schedules the save. */
  const update = useCallback(
    (fn: (d: Doc) => void) => {
      const s = st.current;
      if (s.conflict) return;
      const next = structuredClone(s.doc);
      fn(next);
      s.doc = next;
      s.dirty = true;
      setDoc(next);
      setStatus((x) => (x.state === "saving" ? x : { ...x, state: "dirty" }));
      schedule(SAVE_AFTER_MS);
    },
    [schedule],
  );

  /** Replaces the whole draft (JSON tab, discarding changes). */
  const replace = useCallback(
    (next: Doc) =>
      update((d) => {
        for (const k of Object.keys(d)) delete (d as Record<string, unknown>)[k];
        Object.assign(d, structuredClone(next));
      }),
    [update],
  );

  /** Saves now (before publishing or running checks). True when everything is saved. */
  const flush = useCallback(() => save(), [save]);

  /** Re-reads "differs from live" and the problems (after a publish or a rollback). */
  const refreshReport = useCallback(async () => {
    const res = await adminFetch<{ rev: number; issues: string[]; changed: boolean | null }>(`/api/admin/personas/${slug}/draft/`);
    const s = st.current;
    if (res.ok && res.data.rev === s.rev && !s.dirty) setStatus((x) => ({ ...x, issues: res.data.issues, changed: res.data.changed }));
  }, [slug]);

  useEffect(() => {
    const s = st.current;
    const onUnload = (e: BeforeUnloadEvent) => {
      if (s.dirty || s.inflight) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("keydown", onKey);
      clearTimeout(s.timer);
    };
  }, [save]);

  return { doc, status, update, replace, flush, refreshReport, retry: save };
}

export type DraftApi = ReturnType<typeof useDraft>;
