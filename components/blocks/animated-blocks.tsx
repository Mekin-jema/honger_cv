"use client";

import { useLayoutEffect, useRef } from "react";

type Gsap = typeof import("gsap").gsap;

// GSAP is only needed once an answer animates in, so it stays out of the first-load JS and is
// fetched on demand (warmed up while the answer is still "thinking", see loadGsap in messages.tsx).
let gsapLib: Gsap | null = null;
let gsapPromise: Promise<Gsap> | null = null;
export function loadGsap(): Promise<Gsap> {
  gsapPromise ??= import("gsap").then((m) => (gsapLib = m.gsap));
  // A failed download may be retried next time.
  gsapPromise.catch(() => (gsapPromise = null));
  return gsapPromise;
}

/** "1,500+" → { prefix: "", value: 1500, suffix: "+" }; null when there's no number to count. */
function parseCount(text: string) {
  const m = text.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], value: Number(m[2].replace(/,/g, "")), suffix: m[3] };
}

/** Builds the answer timeline inside `root` (runs within a gsap.context, so revert() undoes it). */
function play(gsap: Gsap, root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  const all = (sel: string) => q(sel) as HTMLElement[];

  tl.from(root.children, { y: 26, autoAlpha: 0, scale: 0.985, duration: 0.6, stagger: 0.12, clearProps: "transform,opacity,visibility" });

  const rows = all('[data-gs="row"]');
  if (rows.length)
    tl.from(rows, { y: 16, autoAlpha: 0, duration: 0.45, stagger: { amount: Math.min(0.9, rows.length * 0.07) }, clearProps: "transform,opacity,visibility" }, 0.12);

  const pops = all('[data-gs="pop"]');
  if (pops.length)
    tl.from(pops, { scale: 0.88, autoAlpha: 0, duration: 0.55, stagger: 0.07, ease: "back.out(1.7)", clearProps: "transform,opacity,visibility" }, 0.1);

  const lines = all('[data-gs="line"]');
  if (lines.length) tl.from(lines, { scaleY: 0, transformOrigin: "top center", duration: 1.1, ease: "power2.inOut" }, 0.1);

  const dots = all('[data-gs="dot"]');
  if (dots.length) tl.from(dots, { scale: 0, duration: 0.45, stagger: 0.18, ease: "back.out(3)" }, 0.25);

  const bars = all('[data-gs="bar"]');
  if (bars.length) tl.from(bars, { scaleX: 0, transformOrigin: "left center", duration: 0.35, stagger: 0.05, ease: "power2.out" }, 0.3);

  const tags = all(".tag");
  if (tags.length)
    tl.from(tags, { scale: 0.85, autoAlpha: 0, duration: 0.3, stagger: { amount: Math.min(0.6, tags.length * 0.02) }, clearProps: "transform,opacity,visibility" }, 0.35);

  for (const el of all('[data-gs="count"]')) {
    const parsed = parseCount(el.textContent ?? "");
    if (!parsed) continue;
    const final = el.textContent;
    const counter = { v: 0 };
    tl.to(
      counter,
      {
        v: parsed.value,
        duration: 1.3,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = `${parsed.prefix}${Math.round(counter.v).toLocaleString("en-US")}${parsed.suffix}`;
        },
        onComplete: () => {
          el.textContent = final;
        },
      },
      0.15,
    );
  }
  return tl;
}

/**
 * Plays one GSAP timeline when an answer's cards appear. Elements opt in with data-gs:
 * "row" (slide up in sequence), "pop" (scale in), "count" (number counts up), "line" (draws down),
 * "dot" (pops in), "bar" (fills from the left). Tags (.tag) ripple in. Skipped for reduced motion
 * and for answers that should appear instantly (deep links).
 */
export function AnimatedBlocks({ animate, className, children }: { animate: boolean; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  // Layout effect: runs before paint, so the cards never flash in their final state before animating.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!animate || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let ctx: ReturnType<Gsap["context"]> | null = null;
    const run = (gsap: Gsap) => {
      if (cancelled) return;
      ctx = gsap.context(() => play(gsap, root), root);
      root.style.visibility = "";
    };
    if (gsapLib) run(gsapLib);
    else {
      // Still downloading: hold the cards back for a moment (always shown if the download fails).
      root.style.visibility = "hidden";
      const fallback = setTimeout(() => {
        // Too slow: show the cards as they are rather than animating them late.
        cancelled = true;
        root.style.visibility = "";
      }, 1500);
      loadGsap()
        .then(run, () => (root.style.visibility = ""))
        .finally(() => clearTimeout(fallback));
    }
    return () => {
      cancelled = true;
      root.style.visibility = "";
      ctx?.revert();
    };
  }, [animate]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
