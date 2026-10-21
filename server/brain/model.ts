import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Gemini through the Vercel AI SDK. Model ids come from the environment, so switching models (or later
 * providers) needs no code change. GEMINI_BASE_URL exists for tests (a local fake Gemini); leave it unset.
 */

export const aiEnabled = () => !!process.env.GEMINI_API_KEY?.trim();
export const cvImportEnabled = () => aiEnabled() || !!process.env.OPENROUTER_API_KEY?.trim();
export const openRouterCvModelId = () => process.env.OPENROUTER_CV_MODEL?.trim() || "openrouter/free";

export const chatModelId = () => process.env.AI_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
/** Tried as well when the first model is slow, busy or gone. "" turns it off. */
// Keep the built-in fallback on a currently available multimodal Gemini model. It is also used
// for PDF CV extraction, so it must accept document file parts as well as text prompts.
export const fallbackModelId = () => (process.env.AI_FALLBACK_MODEL ?? process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite").trim();
export const embeddingModelId = () => process.env.AI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";
export const EMBEDDING_DIMS = 768;

let provider: ReturnType<typeof createGoogleGenerativeAI> | undefined;
let providerKey = "";
let openRouterProvider: ReturnType<typeof createOpenRouter> | undefined;
let openRouterKey = "";

export function google() {
  const key = process.env.GEMINI_API_KEY?.trim() ?? "";
  if (!provider || providerKey !== key) {
    provider = createGoogleGenerativeAI({ apiKey: key, baseURL: process.env.GEMINI_BASE_URL?.trim() || undefined });
    providerKey = key;
  }
  return provider;
}

export function openRouter() {
  const key = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  if (!openRouterProvider || openRouterKey !== key) {
    openRouterProvider = createOpenRouter({ apiKey: key });
    openRouterKey = key;
  }
  return openRouterProvider;
}
