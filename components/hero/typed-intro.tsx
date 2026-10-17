"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePersona } from "@/lib/persona/context";

type Seg = { text: string; typing: boolean };

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

// Types whole characters as a reader sees them (grapheme clusters), so a Bangla conjunct or a vowel sign
// never shows half-formed while typing.
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const graphemes = (text: string) => (segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : [...text]);

/** Splits "Oh,^250 hi." into typed chunks and pauses. */
function parse(line: string): (string | number)[] {
  return line.split(/(\^\d+)/).flatMap<string | number>((part) => (part.startsWith("^") ? [Number(part.slice(1))] : graphemes(part)));
}
const clean = (line: string) => line.replace(/\^\d+/g, "");

/** Lines the longest sentence may take: 4 on wider screens; 8 on phones, so the text is about twice as big there. */
const PHONE = "(max-width: 40rem)";
const maxLines = () => (window.matchMedia(PHONE).matches ? 8 : 4);
const LINE_HEIGHT = 1.06;

/** Largest font size (px) at which `text` wraps into at most `lines` lines inside `el`. */
function fitFontSize(el: HTMLElement, text: string, lines: number): number {
  const cs = getComputedStyle(el);
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    left: "-9999px",
    top: "0",
    width: `${el.clientWidth}px`,
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    letterSpacing: "-0.035em",
    lineHeight: String(LINE_HEIGHT),
    whiteSpace: "normal",
    // With reduced motion every element gets a tiny transition (globals.css), and a transitioning font size
    // still reads as the old one right after it is set: the probe must never animate.
    transitionProperty: "none",
  });
  // Room for the blinking caret. A letter of the heading font, not the caret glyph itself: a glyph from
  // another font changes the line height while that font loads, and the line count (and size) with it.
  probe.textContent = `${text} l`;
  document.body.appendChild(probe);
  // 16px floor: at 320-360px wide the longest combination still fits the line budget.
  let lo = 16;
  let hi = 84;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    probe.style.fontSize = `${mid}px`;
    const used = Math.round(probe.offsetHeight / (mid * LINE_HEIGHT));
    if (used <= lines) lo = mid;
    else hi = mid;
  }
  probe.remove();
  return Math.floor(lo);
}

export function TypedIntro() {
  const { hero } = usePersona();
  const {
    pools: introPools,
    schedule: introSchedule,
    staticIntro,
    longest: longestIntro,
  } = hero;
  const [segs, setSegs] = useState<Seg[]>(() => introPools.map(() => ({ text: "", typing: false })));
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLHeadingElement>(null);

  // Size the heading once per width so the longest sentence still fits in its line budget: no jumping while typing.
  // Layout effect: measured before the first client paint, so the size never visibly changes after hydration.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      // Not laid out yet: a measurement now would be nonsense; the observer below fires once it is.
      if (!el.clientWidth) return;
      el.style.setProperty("--intro-size", `${fitFontSize(el, longestIntro, maxLines())}px`);
    };
    fit();
    // Measure again once layout has settled (the sidebar's opening animation can change the width).
    const raf = requestAnimationFrame(fit);
    const later = setTimeout(fit, 400);
    // The heading font may still be loading (fonts.ready can resolve before it even starts): measure again
    // whenever a font finishes, so the size never stays based on the fallback font's widths.
    document.fonts?.ready.then(fit).catch(() => {});
    document.fonts?.addEventListener("loadingdone", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(later);
      ro.disconnect();
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [longestIntro]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const current: string[] = introPools.map(() => "");

    const update = (i: number, text: string, typing: boolean) =>
      setSegs((prev) => prev.map((s, j) => (j === i ? { text, typing } : s)));

    const type = async (i: number, line: string) => {
      setActive(i);
      let out = "";
      for (const tok of parse(line)) {
        if (typeof tok === "number") {
          update(i, out, false);
          await sleep(tok, signal);
        } else {
          out += tok;
          update(i, out, true);
          await sleep(28 + Math.random() * 38, signal);
        }
      }
      update(i, out, false);
      current[i] = line;
    };

    const erase = async (i: number) => {
      setActive(i);
      const chars = graphemes(clean(current[i]));
      while (chars.length) {
        chars.pop();
        update(i, chars.join(""), true);
        await sleep(14, signal);
      }
    };

    (async () => {
      await sleep(350, signal);
      // First pass: line 0 of every part - a short, real introduction.
      for (const [i, pool] of introPools.entries()) {
        if (pool.firstPass === false) continue;
        await type(i, pool.lines[0]);
        await sleep(420, signal);
      }
      // Then swap one part at a time in a fixed order; each part steps through its own lines.
      const next: number[] = introPools.map((p) => (p.firstPass === false ? 0 : 1));
      for (let step = 0; ; step = (step + 1) % introSchedule.length) {
        await sleep(2600, signal);
        const i = introPools.findIndex((p) => p.id === introSchedule[step]);
        if (i < 0) continue;
        const pool = introPools[i];
        if (current[i]) await erase(i);
        await sleep(160, signal);
        await type(i, pool.lines[next[i] % pool.lines.length]);
        next[i] = (next[i] + 1) % pool.lines.length;
      }
    })().catch(() => {});

    return () => ctrl.abort();
  }, [introPools, introSchedule]);

  return (
    <h1 ref={ref} className="intro display w-full text-fg">
      <span className="intro-static">{staticIntro}</span>
      <span className="intro-typing" aria-hidden="true">
        {segs.map((s, i) =>
          s.text || i === active ? (
            <span key={i}>
              <span className="seg" data-active={i === active} data-typing={s.typing}>
                {clean(s.text)}
              </span>{" "}
            </span>
          ) : null,
        )}
      </span>
      {/* Screen readers get the stable sentence, not the typing loop. */}
      <span className="sr-only intro-typing">{staticIntro}</span>
    </h1>
  );
}
