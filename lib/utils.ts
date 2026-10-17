import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Prefix a public path with the configured basePath (needed for plain <a> tags and history URLs). */
export const withBase = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

export const askPath = (intentId: string) => withBase(`/ask/${intentId}/`);

let apiBase = "";
/**
 * With PERSONA_ROUTING=prefix every persona lives under its own path ("/biodata"), and its API calls
 * must go through that prefix too so the server knows which persona they are for. PersonaProvider
 * sets it in the browser.
 */
export const setApiBase = (base: string) => {
  if (typeof window !== "undefined") apiBase = base;
};
/** An API path for the current persona: apiUrl("/api/ask/"). */
export const apiUrl = (path: string) => withBase(`${apiBase}${path}`);

/** Plain text of an answer: strips the **bold** markers. */
export const plain = (text: string) => text.replace(/\*\*/g, "");
