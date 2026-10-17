/**
 * Access codes the owner hands out ("7KQ2-M9XD-..."): 20 characters from an alphabet without the easily
 * confused 0/O and 1/I, so 100 random bits. Shared by the server (generate, check) and the chat box
 * (a typed code is sent to the unlock endpoint, never to the AI).
 */

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** XXXX-XXXX-XXXX-XXXX-XXXX; dashes or spaces between groups are optional, any case. */
export const ACCESS_CODE_RE = /^\s*[A-HJ-NP-Z2-9]{4}(?:[\s-]?[A-HJ-NP-Z2-9]{4}){4}\s*$/i;

export const looksLikeAccessCode = (text: string) => ACCESS_CODE_RE.test(text);

/** The 20 characters, upper case, without separators. */
export const normalizeAccessCode = (text: string) => text.toUpperCase().replace(/[\s-]/g, "");

export const formatAccessCode = (normalized: string) => normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
