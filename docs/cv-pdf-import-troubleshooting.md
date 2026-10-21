# CV PDF import: how it works and how to troubleshoot it

This guide covers the **customer CV editor's PDF import** (the Upload CV action in the design studio). It does not describe PDF export/download.

## Request flow

1. `components/account/profile-design-studio.tsx` validates the selected file in the browser (PDF type/extension and maximum 8 MB), creates `FormData` with a `file` field, and sends it to:
   ```text
   POST /api/account/personas/<slug>/studio/cv-import/
   ```
2. `app/api/account/personas/[slug]/studio/[...parts]/route.ts` checks the signed-in owner, same-origin request, AI configuration, per-user rate limit (5 attempts per 10 minutes), upload size, and `%PDF-` signature.
3. `mapCvPdf` in `server/brain/assist.ts` first extracts selectable text locally with `pdfjs-dist`, then sends that text to Gemini for structured mapping into contact details, experience, skills, education, and other CV fields. This avoids provider-side PDF parsing failures for ordinary text PDFs. If local text extraction yields no text (for example, a scanned PDF), the original PDF is sent as a Gemini file part instead. The result is previewed/applied in the editor; the import route itself does not save or publish the CV.
4. The model selection order for PDF import is `AI_FALLBACK_MODEL` (or `GEMINI_FALLBACK_MODEL`, default `gemini-3.5-flash-lite`) first, followed by `AI_MODEL` (or `GEMINI_MODEL`, default `gemini-3.8-flash`) if the first model fails. Each attempt has a 55-second timeout. The route declares Node.js runtime and `maxDuration = 120` seconds.

## Required Vercel variables

Set these in **Vercel → Project → Settings → Environment Variables** for every environment you test (Production, Preview, and/or Development):

| Name | Suggested value | Required? |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Recommended; when set, OpenRouter is tried first for CV mapping |
| `OPENROUTER_CV_MODEL` | `openrouter/free` | Optional model override; default is a free-tier OpenRouter model |
| `GEMINI_API_KEY` | Your valid Google AI Studio / Gemini API key | Optional if using OpenRouter; enables Gemini fallback and other AI features |
| `AI_MODEL` | `gemini-3.8-flash` | Used for general Gemini AI and as CV import's Gemini fallback |
| `AI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | First Gemini model tried when OpenRouter isn't configured or Gemini fallback is needed |

Model and key values are exact strings, with no comments or quotes. If the older aliases `GEMINI_MODEL` or `GEMINI_FALLBACK_MODEL` are set, unset them or update them too: the `AI_*` values take precedence when set. OpenRouter's free model availability, capacity, and quotas can change; check [OpenRouter models](https://openrouter.ai/models) and use `OPENROUTER_CV_MODEL` to select another model. After changing variables, **redeploy**; an existing deployment does not pick up changed environment variables.

OpenRouter is currently wired into **CV PDF mapping only**. Other generated assistant/AI features and embeddings still use Gemini and require `GEMINI_API_KEY`. PDF.js extracts selectable text locally before OpenRouter sees the CV. If no text can be extracted (such as a scan), OpenRouter-only setup returns a clear text-required error; use OCR or configure Gemini as a fallback for scanned PDFs.

Never paste an API key into an issue, chat, source file, or `NEXT_PUBLIC_*` variable. If a key has been exposed, rotate it in Google AI Studio and update Vercel.

## Diagnose an import failure

1. Open **Vercel → Logs → Functions**, select the deployment/environment that received the failed request, and find the line beginning with:
   ```text
   [customer-cv-import]
   ```
2. Read the provider error after the profile slug. For example:
   ```text
   AI_APICallError: This model models/gemini-2.5-flash is no longer available to new users...
   ```
   This means a retired model is still configured in the running environment or code deployment. Set `AI_MODEL=gemini-3.8-flash` and `AI_FALLBACK_MODEL=gemini-3.5-flash-lite`, verify the variables are assigned to the environment being tested, and redeploy. If the log names a different retired model, replace that exact configured value with a currently supported Gemini model.
3. Confirm that the log belongs to the latest deployment. Environment changes alone do not update an already-running deployment.
4. Check that `GEMINI_API_KEY` is present in that same environment, is valid, and has Gemini API access/billing/quota as required. Do not print the key when debugging.
5. Retry with a small, text-based, unencrypted PDF under 8 MB. Text PDFs are parsed locally before sending their extracted text to Gemini. Scanned/image-only PDFs still rely on Gemini's PDF support; password-protected PDFs, provider quota/rate limits, and slow provider responses can fail. The route limits each user to five attempts per ten minutes.

The API deliberately returns a generic timeout/network response for errors it cannot classify safely. The server log is the source of the underlying provider error. Do not repeatedly retry before checking it; retries can hit the import rate limit.

## Error messages at the route

| Response/error | Likely cause / next check |
| --- | --- |
| `CV import needs the AI service to be enabled.` | `GEMINI_API_KEY` is missing in the deployed environment. |
| `CV import AI credentials were rejected...` | Gemini rejected the key; verify/rotate `GEMINI_API_KEY`. |
| `The CV import service is busy...` | Gemini rate limit/quota; inspect Google AI Studio usage/quota and wait before retrying. |
| `The AI service could not accept this PDF...` | Unsupported, protected, or too-large PDF; try a text-based PDF below 8 MB. |
| `The AI couldn't extract editable fields...` | Gemini returned no valid structured CV; try a simpler/text-based PDF. |
| `CV import timed out or could not reach the AI service...` | Inspect `[customer-cv-import]` in Vercel function logs. It may be an unavailable model, network issue, timeout, or other provider failure. |

## Local verification

The app's standard checks are:

```bash
bun run typecheck
bun run lint
bun run test
```

A successful local typecheck/test does **not** prove that the deployed Gemini key, model access, quota, or Vercel environment variables are correct. To verify the live integration, upload a small synthetic or non-sensitive PDF in the target deployment and inspect its function log if it fails.
