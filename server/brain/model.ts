import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Gemini through the Vercel AI SDK. Model ids come from the environment, so switching models (or later
 * providers) needs no code change. GEMINI_BASE_URL exists for tests (a local fake Gemini); leave it unset.
 */

export const aiEnabled = () => !!process.env.GEMINI_API_KEY?.trim();

export const chatModelId = () => process.env.AI_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
/** Tried as well when the first model is slow, busy or gone. "" turns it off. */
export const fallbackModelId = () => (process.env.AI_FALLBACK_MODEL ?? process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite").trim();
export const embeddingModelId = () => process.env.AI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";
export const EMBEDDING_DIMS = 768;

let provider: ReturnType<typeof createGoogleGenerativeAI> | undefined;
let providerKey = "";

export function google() {
  const key = process.env.GEMINI_API_KEY?.trim() ?? "";
  if (!provider || providerKey !== key) {
    provider = createGoogleGenerativeAI({ apiKey: key, baseURL: process.env.GEMINI_BASE_URL?.trim() || undefined });
    providerKey = key;
  }
  return provider;
}
