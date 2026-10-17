"use client";

import { useSyncExternalStore } from "react";
import { apiUrl } from "./utils";
import { visitorInfo } from "./visitor";

/** "granted" | "denied" once the visitor chooses; null until then. */
export type Consent = "granted" | "denied" | null;

const KEY = "portfolio:consent";
const EVENT = "portfolio:consent-changed";

function read(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  memory = value;
  if (value === "granted") saveSession();
  else forgetSession();
  window.dispatchEvent(new Event(EVENT));
}

let memory: Consent | undefined;
const snapshot = () => (memory !== undefined && memory !== null ? memory : read());
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** The visitor's current choice, outside React (null until they choose). */
export const getConsent = (): Consent => snapshot();

/** "pending" during SSR and the first client render, so the banner never flashes. */
export function useConsent(): Consent | "pending" {
  return useSyncExternalStore(subscribe, snapshot, () => "pending" as const);
}

// ---------- analytics ----------
const SESSION_KEY = "portfolio:session";
const VISITS_KEY = "portfolio:visits";

/** This page load's landing page and campaign, kept in memory until the visitor accepts. */
let pending: { landing: string; utm?: string } | undefined;

/** Device details, sent only with consent. */
function details() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  let landing = pending?.landing;
  let utm = pending?.utm;
  let visits: number | undefined;
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as { landing: string; utm?: string } | null;
    if (session) {
      landing = session.landing;
      utm = session.utm;
    }
    visits = Number(localStorage.getItem(VISITS_KEY) || "0") || undefined;
  } catch {
    /* ignore */
  }
  return {
    ...visitorInfo(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    platform: nav.userAgentData?.platform || undefined,
    pixelRatio: Math.round(window.devicePixelRatio * 100) / 100,
    colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    touch: navigator.maxTouchPoints > 0,
    landing,
    utm,
    visits,
  };
}

/** Writes the landing page and campaign for this browser session and counts the session, once. */
function saveSession() {
  if (!pending) return;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(pending));
    localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) || "0") + 1));
  } catch {
    /* storage blocked: the details still go along from memory */
  }
}

/** Removes the stored landing page, campaign and visit count (used when the visitor rejects). */
function forgetSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(VISITS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Notes the landing page and campaign (utm_*) of this page load. They are only kept in memory until
 * the visitor accepts the privacy banner; then (or straight away for a visitor who already accepted)
 * they are saved for the browser session and the visit counter goes up.
 */
export function startSession() {
  if (pending) return;
  try {
    const url = new URL(window.location.href);
    const utm = ["utm_source", "utm_medium", "utm_campaign", "ref"]
      .map((k) => (url.searchParams.get(k) ? `${k.replace("utm_", "")}=${url.searchParams.get(k)}` : ""))
      .filter(Boolean)
      .join("&");
    pending = { landing: url.pathname, utm: utm || undefined };
  } catch {
    return;
  }
  if (snapshot() === "granted") saveSession();
}

/** Anonymous by default; device details only when the visitor accepted. */
export function track(type: "pageview" | "ask", data: { intentId?: string; path?: string } = {}) {
  const granted = snapshot() === "granted";
  const body = JSON.stringify({ type, ...data, consent: granted, visitor: granted ? details() : undefined });
  try {
    // Read the (tiny) response so the connection is released straight away.
    fetch(apiUrl("/api/events/"), { method: "POST", headers: { "content-type": "application/json" }, body })
      .then((r) => r.text())
      .catch(() => {});
  } catch {
    /* never let analytics break the page */
  }
}
