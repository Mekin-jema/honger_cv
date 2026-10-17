"use client";

import { useEffect } from "react";

/**
 * Keeps the chat inside the part of the screen the visitor can actually see, so the on-screen keyboard
 * never covers the question box.
 *
 * Android Chrome shrinks the page itself (viewport `interactive-widget=resizes-content`, set in the root
 * layout). iOS Safari doesn't: the keyboard slides over the page and Safari scrolls the page up instead.
 * There the visual viewport API tells us the visible height; it goes into `--app-h` (used for the chat's
 * height), the page is held at the top, and `data-keyboard` drops the home-bar padding while the
 * keyboard is open.
 */
export function useVisibleHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--app-h", `${Math.round(vv.height)}px`);
        // A keyboard takes well over 120px; pinch-zoom changes the scale instead.
        const keyboard = vv.scale <= 1.01 && window.innerHeight - vv.height > 120;
        if (keyboard) root.dataset.keyboard = "open";
        else delete root.dataset.keyboard;
        // iOS scrolls the whole page up to show the focused box; the chat already fits, so undo that.
        if (keyboard && window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--app-h");
      delete root.dataset.keyboard;
    };
  }, []);
}
