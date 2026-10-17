"use client";

import { postApi } from "./visitor";

/** Unlocks the persona's private details with an access code (sets a signed cookie). */
export async function unlockWithCode(code: string): Promise<{ ok: boolean; limited: boolean }> {
  const res = await postApi("/api/access/unlock/", { code });
  return { ok: res.ok, limited: res.status === 429 };
}

/** Hides the private details again in this browser. */
export async function lockAgain(): Promise<void> {
  await postApi("/api/access/unlock/", {}, "DELETE");
}

/** "7KQ2-••••-••••-••••-F5FF": shown in the chat instead of the code itself. */
export const maskCode = (code: string) => {
  const c = code.toUpperCase().replace(/[\s-]/g, "");
  return `${c.slice(0, 4)}-••••-••••-••••-${c.slice(-4)}`;
};
