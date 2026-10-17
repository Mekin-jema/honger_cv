"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ShieldCheck } from "lucide-react";
import { setConsent, useConsent } from "@/lib/consent";
import { cn } from "@/lib/utils";

/**
 * First-visit choice. Rejecting keeps analytics anonymous; nothing about the device is stored.
 * While no choice is made it never blocks the page: "How I use data" (or the Privacy answer being on screen,
 * where the same Accept/Reject live) folds it into a small pill, without storing anything.
 */
export function ConsentBanner({ onLearnMore, hidden = false }: { onLearnMore?: () => void; hidden?: boolean }) {
  const consent = useConsent();
  const [collapsed, setCollapsed] = useState(false);
  // Publishes the banner's height as --consent-h so the chat can add that much room at the end of the log.
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--consent-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--consent-h");
    };
  }, [el]);

  const open = consent === null && !hidden;

  // Remembers where focus was outside the banner, so choosing Accept/Reject (which removes the banner) hands focus back
  // there instead of dropping it to <body>. Falls back to the question box.
  const lastFocus = useRef<HTMLElement | null>(null);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    if (!open) return;
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && t !== document.body && !el?.contains(t)) lastFocus.current = t;
    };
    const current = document.activeElement;
    if (current instanceof HTMLElement && current !== document.body) lastFocus.current = current;
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [open, el]);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(""), 4000);
    return () => window.clearTimeout(t);
  }, [saved]);
  const choose = (value: "granted" | "denied") => {
    const prev = lastFocus.current;
    const target =
      prev && prev.isConnected && !el?.contains(prev) && !prev.closest("[inert]")
        ? prev
        : document.querySelector<HTMLElement>("#question-box input");
    target?.focus({ preventScroll: true });
    setConsent(value);
    setSaved(value === "granted" ? "Privacy choice saved: accepted." : "Privacy choice saved: rejected.");
  };
  const motionProps = {
    ref: setEl,
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  };
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {saved}
      </p>
      {/* "wait": the old element is gone (and its --consent-h cleared) before the next one measures itself. */}
      <AnimatePresence mode="wait">
        {open && collapsed && (
          <motion.button
            key="pill"
            type="button"
            {...motionProps}
            onClick={() => setCollapsed(false)}
            aria-label="Privacy choices: not set yet"
            className="fixed right-3 bottom-[calc(var(--dock-h,9.5rem)+0.25rem)] z-50 inline-flex items-center gap-1.5 rounded-full border border-line bg-card/95 px-3.5 py-2 text-sm font-semibold text-muted shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)] backdrop-blur-xl hover:text-fg pointer-coarse:min-h-11 sm:right-4"
          >
            <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
            Privacy choices
          </motion.button>
        )}
        {open && !collapsed && (
          <motion.div
            key="banner"
            role="dialog"
            aria-label="Privacy choices"
            {...motionProps}
            // Sits just above the composer (--dock-h is set by the chat); the chat pads its log by --consent-h so nothing ends up under it.
            // Short desktop windows (max-height 46rem) dock it as a compact full-width strip, as on phones, so it stays clear of the hero heading.
            className="fixed inset-x-3 bottom-[calc(var(--dock-h,9.5rem)-0.25rem)] z-50 rounded-2xl border border-line bg-card/95 px-3 py-2.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.3)] backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:w-[23rem] sm:p-4 lg:w-[27rem] [@media(min-width:40rem)_and_(max-height:46rem)]:left-4 [@media(min-width:64rem)_and_(max-height:46rem)]:left-[calc(var(--side-w,17.5rem)+1rem)] [@media(min-width:40rem)_and_(max-height:46rem)]:flex [@media(min-width:40rem)_and_(max-height:46rem)]:w-auto [@media(min-width:40rem)_and_(max-height:46rem)]:items-center [@media(min-width:40rem)_and_(max-height:46rem)]:gap-4 [@media(min-width:40rem)_and_(max-height:46rem)]:px-4 [@media(min-width:40rem)_and_(max-height:46rem)]:py-2.5"
          >
            <div className="flex min-w-0 items-start gap-3 [@media(min-width:40rem)_and_(max-height:46rem)]:flex-1">
              <span className="hidden size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent sm:grid">
                <ShieldCheck className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[15px] leading-tight font-semibold sm:text-base sm:leading-normal">
                  <ShieldCheck className="size-4 text-accent sm:hidden" aria-hidden="true" />
                  Your privacy
                </p>
                {/* Short screens: two lines here, the full story is one tap away in "How I use data" (screen readers get all of it). */}
                <p className="mt-0.5 text-[13px] leading-snug text-muted sm:mt-1 sm:text-sm [@media(max-height:46rem)]:line-clamp-2">
                  I count visits and questions anonymously. With your OK, I also keep basic device details (browser, screen, timezone, where you came from) so I know who visits. No ads, no third parties.
                </p>
              </div>
            </div>
            {/* Accept and Reject look the same: neither choice is pushed. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mt-3 [@media(min-width:40rem)_and_(max-height:46rem)]:mt-0 [@media(min-width:40rem)_and_(max-height:46rem)]:shrink-0 [@media(min-width:40rem)_and_(max-height:46rem)]:flex-nowrap">
              <button type="button" onClick={() => choose("granted")} className="btn btn-ghost bg-card py-2.5 text-sm max-sm:px-3.5 pointer-coarse:min-h-11">
                Accept
              </button>
              <button type="button" onClick={() => choose("denied")} className="btn btn-ghost bg-card py-2.5 text-sm max-sm:px-3.5 pointer-coarse:min-h-11">
                Reject
              </button>
              {onLearnMore && (
              <button
                type="button"
                onClick={() => {
                  // The Privacy answer has the same choices, so fold the banner out of its way (nothing is stored).
                  setCollapsed(true);
                  onLearnMore();
                }}
                className="ml-auto py-2.5 text-sm font-semibold pointer-coarse:min-h-11 text-muted underline-offset-4 hover:text-fg hover:underline [@media(min-width:40rem)_and_(max-height:46rem)]:ml-2"
              >
                How I use data
              </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Shown in the "Privacy" answer: what's stored, and a way to change the choice. */
export function PrivacyChoice() {
  const consent = useConsent();
  const rows = [
    { k: "Always, anonymously", v: "Which pages are opened and which questions are asked - no id, no device details." },
    { k: "Only if you accept", v: "Browser, OS, screen and window size, timezone, language, colour scheme, touch support, the page you came from and campaign link, visit count." },
    { k: "Only if you send it", v: "Messages, feedback and thumbs up/down you choose to send, with the details you type in." },
    { k: "Only if you ask it", v: "A question none of my listed answers covers is sent, with the last few turns of this chat, to Google's Gemini API to write an answer from my CV. The question and answer are kept so I can improve the site; no device details go with them." },
    { k: "Never", v: "Ads, third-party trackers, selling data, or your IP address." },
  ];
  return (
    <div className="card overflow-hidden">
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.k} data-gs="row" className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-5 md:px-5">
            <dt className="shrink-0 text-sm font-semibold sm:w-40">{r.k}</dt>
            <dd className="text-[15px] leading-relaxed text-muted">{r.v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-4 md:px-5">
        <span className="mr-auto text-sm text-muted">
          Your choice: <span className="font-semibold text-fg">{consent === "granted" ? "accepted" : consent === "denied" ? "rejected" : "not set"}</span>
        </span>
        {(["granted", "denied"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setConsent(v)}
            aria-pressed={consent === v}
            className={cn("btn py-2 text-sm pointer-coarse:min-h-11", consent === v ? "btn-primary" : "btn-ghost")}
          >
            {consent === v && <Check className="size-4" />}
            {v === "granted" ? "Accept" : "Reject"}
          </button>
        ))}
      </div>
    </div>
  );
}
