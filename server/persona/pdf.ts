import "server-only";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { signToken, verifyToken } from "../access/cookie";
import type { CompiledPersona } from "./compile";

/**
 * The persona's document as a PDF, printed by headless Chrome from the site's own document page (so the
 * PDF always matches the page). Runs after a publish; a missing Chrome only skips the PDF (the page and
 * its Print button still work). Files live in DOCS_DIR (default var/documents), outside public/: they are
 * served by /d/<file> only to visitors allowed to see the document.
 */

export const docsDir = () => path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DOCS_DIR?.trim() || "var/documents");

export function chromePath(): string | null {
  const candidates = [
    process.env.CHROME_PATH?.trim(),
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((x): x is string => !!x);
  return candidates.find((c) => existsSync(c)) ?? null;
}

const PRINT_SECONDS = 120;

/**
 * A short-lived token that lets this server's own Chrome render the live version of a persona's
 * document as a visitor with an access code. It travels as ?print=..., which the proxy turns into the
 * x-print-token header (src/proxy.ts); the resolver only honours it for the live version.
 */
export const printToken = (slug: string, versionId: string) => signToken("print", `${slug}.${versionId}.${Math.floor(Date.now() / 1000) + PRINT_SECONDS}`);

export function readPrintToken(value: string | null | undefined): { slug: string; versionId: string } | null {
  const payload = verifyToken("print", value ?? undefined);
  if (!payload) return null;
  const [slug, versionId, exp] = payload.split(".");
  if (!slug || !versionId || !/^\d+$/.test(exp ?? "") || Number(exp) * 1000 <= Date.now()) return null;
  return { slug, versionId };
}

/** Prints the live version's document page to DOCS_DIR/<slug>/v<number>.pdf. */
export async function renderDocumentPdf(c: CompiledPersona, selfOrigin: string): Promise<{ path: string; bytes: number; pages: number } | { skipped: string }> {
  if (!c.versionId) return { skipped: "Not a published version." };
  // The job persona prints its CV (/cv/); others print the sections chosen for their document.
  if (!c.doc.legacy && !c.doc.document.sections.length) return { skipped: "The document has no sections to print." };
  const chrome = chromePath();
  if (!chrome) return { skipped: "No Chrome or Edge on this server (set CHROME_PATH): the PDF was not made. The document page still works." };
  const token = printToken(c.slug, c.versionId);
  if (!token) return { skipped: "PERSONA_SIGNING_SECRET is not set: the PDF was not made." };

  const rel = `${c.slug}/v${c.number}.pdf`;
  const out = path.join(docsDir(), rel);
  mkdirSync(path.dirname(out), { recursive: true });
  const origin = (process.env.PDF_BASE_URL?.trim() || selfOrigin).replace(/\/+$/, "");
  const url = `${origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/${c.doc.document.slug}/?print=${encodeURIComponent(token)}`;
  const profile = mkdtempSync(path.join(tmpdir(), "persona-pdf-"));
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        /*turbopackIgnore: true*/ chrome,
        [
          "--headless=new",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          ...(process.platform === "linux" ? ["--no-sandbox"] : []),
          `--user-data-dir=${profile}`,
          "--no-pdf-header-footer",
          "--force-color-profile=srgb",
          "--virtual-time-budget=5000",
          `--print-to-pdf=${out}`,
          url,
        ],
        { stdio: "ignore" },
      );
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Chrome took longer than 60 seconds"));
      }, 60_000);
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0 && existsSync(out)) resolve();
        else reject(new Error(`Chrome exited with code ${code}`));
      });
    });
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
  // Pages: one "/Type /Page" object each (not "/Pages", the page tree).
  const pages = (readFileSync(out, "latin1").match(/\/Type\s*\/Page(?![a-z])/g) ?? []).length;
  return { path: rel, bytes: statSync(out).size, pages };
}
