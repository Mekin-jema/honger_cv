import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { APICallError, NoObjectGeneratedError } from "ai";
import { PersonaDocShape, formatIssues } from "@/lib/persona/schema";
import { CvPdfTextRequiredError, draftAnswer, missingBangla, structureText, suggestQuestions, translateToBangla } from "@/server/brain/assist";
import { ResumeParserError } from "@/server/brain/resume-parser";
import { doclingParser } from "@/server/services/document-parser";
import { cvExtractor } from "@/server/services/cv-extractor";
import { compileBrain } from "@/server/brain/compile";
import { aiEnabled, cvImportEnabled, resumeParserConfigured } from "@/server/brain/model";
import { bad, forbidden, json, limited, readJson, sameOrigin, str } from "@/server/http";
import { customerSession } from "@/server/admin-session";
import { cloudinaryCredentials } from "@/server/cloudinary-config";
import { createCode, listCodes, resetAccess, revokeCode } from "@/server/access/codes";
import { query } from "@/server/db";
import { compilePersona } from "@/server/persona/compile";
import { activateVersion, PublishError } from "@/server/persona/publish";
import { listOwnedPersonas, loadDraft, personaOwnedBy, saveDraft } from "@/server/persona/repo";
import { recordPlatformEventSafely } from "@/server/platform-events";
import { hasCvPass, CV_PASS_TEMPLATE } from "@/server/billing";
import { isCvTemplateId } from "@/lib/persona/cv-templates";
import {
  accessRequests,
  decideAccessRequest,
  draftReport,
  editableDraft,
  markReviewed,
  reviewEntries,
  startDraftChecks,
  studioOverview,
} from "@/server/persona/studio";

type Context = { params: Promise<{ slug: string; parts: string[] }> };
const SLUG = /^[a-z][a-z0-9-]{1,31}$/;
const positive = (value: unknown, max: number) => (typeof value === "number" && Number.isInteger(value) && value > 0 && value <= max ? value : null);
const MAX_PROFILE_IMAGE_BYTES = 3_000_000;
// PDF extraction uses Buffer, multipart FormData, and the Gemini document API. Keep this route
// on the Node runtime in serverless deployments rather than allowing an Edge deployment.
export const runtime = "nodejs";
export const maxDuration = 120;

function profileImageFormat(bytes: Buffer): { mime: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg" };
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp" };
  }
  return null;
}

async function owned(req: Request, context: Context) {
  const session = await customerSession(req);
  if (!session) return { response: bad("Sign in to manage your profile.", 401) } as const;
  const { slug } = await context.params;
  if (!SLUG.test(slug) || !(await personaOwnedBy(slug, session.userId))) return { response: bad("Profile not found.", 404) } as const;
  return { session, slug, parts: (await context.params).parts } as const;
}

function isJobProfile(doc: { document?: { kind?: string } }) {
  return doc.document?.kind !== "biodata";
}

export async function GET(req: Request, context: Context) {
  const access = await owned(req, context);
  if ("response" in access) return access.response;
  const { slug, parts } = access;
  const endpoint = parts.join("/");

  if (endpoint === "draft") {
    const state = await editableDraft(slug);
    return state ? json({ ok: true, ...state }) : bad("This profile has no editable draft.", 404);
  }
  if (endpoint === "overview") return json({ ok: true, ...(await studioOverview(slug)) });
  if (endpoint === "review") return json({ ok: true, entries: await reviewEntries(slug) });
  if (endpoint === "codes") return json({ ok: true, codes: await listCodes(slug) });
  if (endpoint === "requests") return json({ ok: true, requests: await accessRequests(slug) });
  return bad("Studio endpoint not found.", 404);
}

export async function PUT(req: Request, context: Context) {
  if (!sameOrigin(req)) return forbidden();
  const access = await owned(req, context);
  if ("response" in access) return access.response;
  if (access.parts.join("/") !== "draft") return bad("Studio endpoint not found.", 404);
  const body = await readJson(req, 2_000_000);
  const parsed = PersonaDocShape.safeParse(body?.doc);
  if (!body || !parsed.success) {
    return bad(
      `Fix the profile fields before saving: ${parsed.success ? "Missing profile data." : formatIssues(parsed.error, 8).join("; ")}`,
      422,
    );
  }
  if (!isJobProfile(parsed.data)) return bad("Customer profiles must remain Job CVs.", 422);
  const rev = typeof body.rev === "number" && Number.isInteger(body.rev) && body.rev >= 0 ? body.rev : -1;
  if (rev < 0) return bad("Missing the draft revision. Reload before saving.");
  const previousDraft = await loadDraft(access.slug);
  const previousDoc = PersonaDocShape.safeParse(previousDraft?.doc);
  const previousDesign = previousDoc.success ? previousDoc.data.document?.data : undefined;
  const nextDesign = parsed.data.document?.data;
  const isFirstCv = (await listOwnedPersonas(access.session.userId))[0]?.slug === access.slug;
  if (
    isCvTemplateId(nextDesign?.cvTemplate) &&
    nextDesign?.cvTemplate !== previousDesign?.cvTemplate &&
    nextDesign?.cvTemplate !== CV_PASS_TEMPLATE &&
    !isFirstCv &&
    !(await hasCvPass(access.session.userId))
  ) {
    return bad("Upgrade with a lifetime CV Design Pass to unlock all designs for additional CVs.", 402);
  }
  const next = await saveDraft(access.slug, parsed.data, rev);
  if (next === null) return bad("This draft changed in another tab. Reload and try again.", 409);
  await query("UPDATE personas SET name = $3, updated_at = now() WHERE slug = $1 AND owner_user_id = $2", [
    access.slug,
    access.session.userId,
    parsed.data.name,
  ]);
  await recordPlatformEventSafely(access.session.userId, "draft_saved", access.slug);
  if (
    previousDesign?.cvTemplate !== nextDesign?.cvTemplate ||
    previousDesign?.cvAccent !== nextDesign?.cvAccent
  ) {
    if (nextDesign?.cvTemplate && typeof nextDesign.cvAccent === "string") {
      await recordPlatformEventSafely(access.session.userId, "template_saved", access.slug, {
        template: String(nextDesign.cvTemplate),
        accent: nextDesign.cvAccent,
      });
    }
  }
  return json({ ok: true, rev: next, ...(await draftReport(access.slug, parsed.data)) });
}

export async function POST(req: Request, context: Context) {
  if (!sameOrigin(req)) return forbidden();
  const access = await owned(req, context);
  if ("response" in access) return access.response;
  const { slug, parts, session } = access;
  const endpoint = parts.join("/");

  if (endpoint === "cv-import") {
    if (!cvImportEnabled() && !resumeParserConfigured()) {
      return bad("CV import needs DOCLING_API_URL, OPENROUTER_API_KEY or GEMINI_API_KEY configured on the server.", 503);
    }
    if (limited(`customer:cv-import:${session.userId}`, 10, 10 * 60_000)) {
      return bad("Too many CV imports. Please try again in a few minutes.", 429);
    }
    const size = Number(req.headers.get("content-length") ?? 0);
    if (size > 15_500_000) return bad("This document is too large. Choose a file under 15 MB.", 413);
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return bad("We couldn't read this upload. Choose a document and try again.", 400);
    }
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return bad("Choose a CV document to upload.");
    if (file.size > 15_000_000) return bad("This document is too large. Choose a file under 15 MB.", 413);

    const safeName = file.name.replace(/^.*[/\\]/, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
    const allowed = new Set(["pdf", "docx", "pptx", "txt", "md", "markdown"]);
    if (!allowed.has(ext)) {
      return bad("Upload a PDF, DOCX, PPTX, TXT, or Markdown CV file. You can also edit your CV details directly in the form.", 415);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (ext === "pdf" && new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      return bad("This file doesn't look like a readable PDF.");
    }
    if ((ext === "docx" || ext === "pptx") && (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b)) {
      return bad(`This file doesn't look like a readable ${ext.toUpperCase()} document.`);
    }

    try {
      const mime =
        ext === "pdf"
          ? "application/pdf"
          : ext === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : ext === "pptx"
          ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
          : ext === "md" || ext === "markdown"
          ? "text/markdown"
          : "text/plain";

      // 1. Docling document parsing & markdown normalization
      const parsed = await doclingParser.parse(bytes, safeName, mime);

      // 2. AI CV extraction into strongly-typed schema
      const extraction = await cvExtractor.extract(parsed.markdown);

      return json({
        ok: true,
        cv: extraction.data,
        markdown: parsed.markdown,
        metadata: parsed.metadata,
        warnings: extraction.warnings,
      });
    } catch (error) {
      console.error(`[customer-cv-import] ${slug}:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
      if (APICallError.isInstance(error)) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          return bad("CV import AI credentials were rejected. Check the configured OpenRouter or Gemini API key.", 503);
        }
        if (error.statusCode === 429) {
          return bad("The CV import service is busy. Wait a minute and try again; your CV has not been changed.", 503);
        }
        if (error.statusCode === 400 || error.statusCode === 413 || error.statusCode === 415) {
          return bad("The AI service could not accept this document. Use a standard document under 15 MB, then try again.", 422);
        }
        if (error.statusCode && error.statusCode >= 500) {
          return bad("The CV import service is temporarily unavailable. Try again shortly; your CV has not been changed.", 503);
        }
      }
      if (error instanceof CvPdfTextRequiredError) return bad(error.message, 422);
      if (error instanceof ResumeParserError) return bad(`The CV parser service couldn't read this CV: ${error.message}`, 502);
      if (NoObjectGeneratedError.isInstance(error)) {
        return bad("The AI couldn't extract editable fields from this CV document. Please check the content or enter details manually.", 422);
      }
      return bad(
        error instanceof Error && error.message ? error.message : "CV import timed out or could not reach the parser service. Try again shortly; your CV has not been changed.",
        422,
      );
    }
  }

  if (endpoint === "photo-upload") {
    if (limited(`customer:photo-upload:${session.userId}`, 10, 10 * 60_000)) {
      return bad("Too many image uploads. Please try again in a few minutes.", 429);
    }
    const requestSize = Number(req.headers.get("content-length") ?? 0);
    if (requestSize > MAX_PROFILE_IMAGE_BYTES + 100_000) {
      return bad("Choose an image smaller than 3 MB.", 413);
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return bad("We couldn't read this image upload. Choose a JPG, PNG or WebP image and try again.", 400);
    }
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return bad("Choose an image to upload.");
    if (file.size > MAX_PROFILE_IMAGE_BYTES) return bad("Choose an image smaller than 3 MB.", 413);
    const assetType = form.get("assetType");
    if (assetType !== "profile" && assetType !== "project") return bad("Choose a supported image type.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = profileImageFormat(bytes);
    if (!format || (file.type && file.type !== format.mime)) {
      return bad("Upload a valid JPG, PNG or WebP image. SVG and other file types aren't supported.");
    }

    const credentials = cloudinaryCredentials();
    if (!credentials) {
      return bad("Photo uploads aren't configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.", 503);
    }

    cloudinary.config({ ...credentials, secure: true });
    const folder = `honger-cv/customers/${slug}/${assetType === "profile" ? "profile" : "projects"}`;
    let uploaded: { public_id: string };
    try {
      uploaded = await new Promise<{ public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: randomUUID(),
            resource_type: "image",
            overwrite: false,
            allowed_formats: ["jpg", "png", "webp"],
            transformation: [{ width: 1600, height: 1600, crop: "limit" }],
            tags: [`customer-cv-${assetType}-image`],
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("Cloudinary returned no uploaded image."));
          },
        );
        stream.end(bytes);
      });
    } catch (error) {
      console.error(`[customer-photo-upload] ${slug}:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
      return bad("The image service couldn't store this image. Try again in a moment.", 502);
    }

    const url = cloudinary.url(uploaded.public_id, {
      secure: true,
      transformation: [
        { width: 1600, height: 1600, crop: "limit" },
        { quality: "auto:good", fetch_format: "auto" },
      ],
    });
    return json({ ok: true, url, publicId: uploaded.public_id });
  }

  if (endpoint === "prompt" || endpoint === "ai") {
    if (!aiEnabled()) return bad("AI helpers need GEMINI_API_KEY.", 503);
    if (limited(`customer:studio-ai:${session.userId}`, 40, 10 * 60_000)) return bad("Too many AI requests at once. Try again in a few minutes.", 429);
    const body = await readJson(req, 2_500_000);
    if (!body) return bad("Send the draft and helper action.");
    const parsed = PersonaDocShape.safeParse(body?.doc);
    if (!parsed.success || !isJobProfile(parsed.data)) return bad("Fix the Job CV draft before using this helper.", 422);
    if (endpoint === "prompt") {
      const brain = compileBrain(compilePersona(slug, parsed.data));
      const tier = body?.tier === "unlocked" ? brain.unlocked : brain.public;
      return json({ ok: true, prompt: tier.prompt, tokens: tier.tokens, retrieval: brain.retrieval, gated: tier.gatedTitles, leakTerms: tier.leakTerms.length });
    }
    try {
      switch (body.action) {
        case "structure": {
          const text = str(body.text, 20_000);
          if (!text || text.length < 10) return bad("Paste some text first.");
          return json({ ok: true, markdown: await structureText(parsed.data, text) });
        }
        case "suggest":
          return json({ ok: true, markdown: await suggestQuestions(parsed.data) });
        case "draft-answer": {
          const label = str(body.label, 200);
          const prompt = str(body.prompt, 400) ?? label;
          if (!label || !prompt) return bad("The question needs a label first.");
          return json({ ok: true, answer: await draftAnswer(parsed.data, { label, prompt }) });
        }
        case "translate": {
          if (!parsed.data.site.languages.includes("bn")) return bad("Add Bangla to the site's languages first (Identity & site).");
          const missing = missingBangla(parsed.data);
          if (!missing.length) return json({ ok: true, items: [], total: 0 });
          return json({ ok: true, items: await translateToBangla(parsed.data, missing), total: missing.length });
        }
        default:
          return bad("Unknown AI helper action.");
      }
    } catch (error) {
      console.error(`[customer-studio-ai] ${String(body.action)}:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
      return bad("The AI couldn't do that right now. Try again in a moment.", 502);
    }
  }

  if (endpoint === "checks") {
    try {
      const { job, existing } = await startDraftChecks(slug);
      return json({ ok: true, jobId: job.id, existing }, 202);
    } catch (error) {
      if (error instanceof PublishError) return json({ ok: false, error: error.message, issues: error.issues }, 422);
      throw error;
    }
  }
  if (endpoint === "versions") {
    const body = await readJson(req, 1_000);
    if (!body) return bad("Say which version.");
    const versionId = str(body?.versionId, 64);
    if (!versionId) return bad("Say which version.");
    return (await activateVersion(slug, versionId)) ? json({ ok: true }) : bad("That version can't be made live.", 404);
  }
  if (endpoint === "codes") {
    const body = await readJson(req, 2_000);
    if (!body) return bad("Say who the code is for.");
    const label = str(body?.label, 80);
    if (!label) return bad("Say who the code is for.");
    const { code, entry } = await createCode(slug, { label, maxUses: positive(body.maxUses, 1000), days: positive(body.days, 3650) });
    return json({ ok: true, code, entry }, 201);
  }
  if (endpoint === "access-reset") {
    await resetAccess(slug);
    return json({ ok: true });
  }
  if (endpoint === "requests") {
    const body = await readJson(req, 1_000);
    if (!body) return bad("Send { id, action }.");
    const id = str(body?.id, 64);
    const action = body?.action === "approve" || body?.action === "decline" ? body.action : null;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id) || !action) return bad("Send { id, action }.");
    const result = await decideAccessRequest(slug, id, action);
    return result ? json({ ok: true, ...result }) : bad("No such request.", 404);
  }
  if (endpoint === "review") {
    const body = await readJson(req, 40_000);
    if (!body) return bad("Send { ids }.");
    const ids = Array.isArray(body?.ids) ? body.ids.filter((item): item is string => typeof item === "string" && /^[0-9a-f-]{36}$/i.test(item)).slice(0, 200) : [];
    if (!ids.length) return bad("Send { ids }.");
    const promotedTo = typeof body.promotedTo === "string" ? body.promotedTo.slice(0, 120) : undefined;
    return json({ ok: true, updated: await markReviewed(slug, ids, promotedTo) });
  }
  return bad("Studio endpoint not found.", 404);
}

export async function DELETE(req: Request, context: Context) {
  if (!sameOrigin(req)) return forbidden();
  const access = await owned(req, context);
  if ("response" in access) return access.response;
  const [resource, id, extra] = access.parts;
  if (resource !== "codes" || !id || extra || !/^[0-9a-f-]{36}$/i.test(id)) return bad("Studio endpoint not found.", 404);
  return (await revokeCode(access.slug, id)) ? json({ ok: true }) : bad("No active code found.", 404);
}
