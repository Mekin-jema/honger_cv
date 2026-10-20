import "server-only";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import chromium from "@sparticuz/chromium";
import { signToken, verifyToken } from "../access/cookie";
import type { Tier } from "@/lib/persona/types";
import { documentOpen } from "./compile";
import type { CompiledPersona } from "./compile";

/**
 * The persona's document as a PDF, printed by headless Chrome from the site's own document page (so the
 * PDF always matches the page). Runs after a publish; a missing Chrome only skips the PDF (the page and
 * its document page still works). Files live in DOCS_DIR (default var/documents), outside public/: they
 * are served by /d/<file> or /u/<slug>/d/<file> only to visitors allowed to see the document.
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

export async function servePersonaPdf(file: string, compiled: CompiledPersona, tier: Tier): Promise<Response> {
  const { doc, pdfPath } = compiled;
  const missing = () => new Response("Not found", {
    status: 404,
    headers: { "x-robots-tag": "noindex", "cache-control": "no-store" },
  });
  if (file !== doc.document.fileName || !documentOpen(doc, tier)) return missing();

  let body: Buffer;
  if (pdfPath) {
    if (pdfPath.startsWith("https://")) {
      let remote: URL;
      try {
        remote = new URL(pdfPath);
      } catch {
        return missing();
      }
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
      if (
        !cloudName ||
        remote.protocol !== "https:" ||
        remote.hostname !== "res.cloudinary.com" ||
        remote.port ||
        remote.username ||
        remote.password ||
        !remote.pathname.startsWith(`/${cloudName}/raw/upload/`)
      ) return missing();
      try {
        const response = await fetch(remote, { cache: "force-cache" });
        const contentLength = Number(response.headers.get("content-length") ?? 0);
        if (contentLength > 20_000_000) return missing();
        body = Buffer.from(await response.arrayBuffer());
        if (!response.ok || body.length > 20_000_000 || body.subarray(0, 5).toString("ascii") !== "%PDF-") return missing();
      } catch (error) {
        console.error(`[persona-pdf] Could not fetch stored PDF for ${compiled.slug}:`, error instanceof Error ? error.message : error);
        return new Response("PDF download is temporarily unavailable. Please try again.", {
          status: 502,
          headers: { "cache-control": "no-store", "x-robots-tag": "noindex" },
        });
      }
    } else {
      const root = docsDir();
      const full = path.resolve(root, pdfPath);
      if (!full.startsWith(root + path.sep)) return missing();
      try {
        body = await readFile(full);
      } catch {
        return missing();
      }
    }
  } else if (doc.legacy) {
    try {
      body = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", doc.document.fileName));
    } catch {
      return missing();
    }
  } else return missing();

  const filename = doc.document.fileName.replace(/["\\\r\n]/g, "_");
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "x-robots-tag": "noindex",
      "cache-control": doc.document.gated ? "private, no-store" : "public, max-age=3600",
    },
  });
}

/** Persists generated PDFs outside the ephemeral filesystem when Cloudinary is configured. */
export async function storePersonaPdf(
  localPath: string,
  slug: string,
  version: number,
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return localPath;

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const uploaded = await cloudinary.uploader.upload(localPath, {
    resource_type: "raw",
    public_id: `honger-cv/customers/${slug}/cv/v${version}.pdf`,
    overwrite: true,
    invalidate: true,
    tags: ["customer-cv-pdf"],
  });
  if (!uploaded.secure_url) throw new Error("Cloudinary returned no secure PDF URL.");
  return uploaded.secure_url;
}

/** Prints the live version's document page to DOCS_DIR/<slug>/v<number>.pdf. */
export async function renderDocumentPdf(c: CompiledPersona, selfOrigin: string): Promise<{ path: string; bytes: number; pages: number } | { skipped: string }> {
  if (!c.versionId) return { skipped: "Not a published version." };
  // The job persona prints its CV (/cv/); others print the sections chosen for their document.
  if (!c.doc.legacy && c.doc.document.kind !== "cv" && !c.doc.document.sections.length) return { skipped: "The document has no sections to print." };
  const localChrome = chromePath();
  const chrome = localChrome ?? await chromium.executablePath();
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
          ...(!localChrome ? chromium.args : []),
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
