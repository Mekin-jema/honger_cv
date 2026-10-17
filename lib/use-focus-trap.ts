"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Visible, tabbable elements inside `root`, in DOM order. */
export function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.closest("[inert]") && el.getClientRects().length > 0,
  );
}

/** True when focus sits in a different modal dialog stacked above `root` (e.g. the photo viewer over the drawer). */
export function focusInOtherModal(root: HTMLElement): boolean {
  const modal = (document.activeElement as HTMLElement | null)?.closest('[aria-modal="true"]');
  return !!modal && modal !== root && !root.contains(modal);
}

/** Keeps Tab and Shift+Tab inside `ref` while `active` (for modal dialogs). */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const root = ref.current;
      if (e.key !== "Tab" || !root || focusInOtherModal(root)) return;
      const els = focusables(root);
      if (!els.length) {
        e.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const current = document.activeElement as HTMLElement | null;
      const inside = !!current && root.contains(current);
      if (e.shiftKey && (!inside || current === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || current === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ref, active]);
}
