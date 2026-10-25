# CV PDF import: how it works and how to troubleshoot it

This guide covers the **customer CV editor's document import** (the Upload CV action in the design studio). It does not describe PDF export/download.

## Request flow

1. `components/account/profile-design-studio.tsx` uploads the selected document as `FormData` to:
   ```text
   POST /api/account/personas/<slug>/studio/cv-import/
   ```
2. `app/api/account/personas/[slug]/studio/[...parts]/route.ts` checks the signed-in owner, same-origin request, AI configuration, per-user rate limit (10 attempts per 10 minutes), upload size, and document signature.
3. `doclingParser` converts the document to Markdown. `CvExtractor` sends that text to the ordered structured-extraction model chain and validates the returned data against the CV schema. The result is previewed/applied in the editor; the import route itself does not save or publish the CV.
4. When `CV_EXTRACTION_MODELS` is unset, development prefers local Ollama, then tries configured OpenRouter and Gemini providers. Production uses configured hosted providers. If a provider is rate-limited or unavailable, the next configured provider is attempted. Each model request has a 60-second timeout; the route declares Node.js runtime and `maxDuration = 120` seconds.

## Required Vercel variables

Set these in **Vercel → Project → Settings → Environment Variables** for every environment you test (Production, Preview, and/or Development):

| Name | Suggested value | Required? |
| --- | --- | --- |
| `CV_EXTRACTION_MODELS` | `ollama/llama3.2,openrouter/mistralai/mistral-small-24b-instruct-2501` | Optional ordered `provider/model` chain; when unset, development prefers Ollama and production uses configured hosted providers |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Needed when Ollama is not at the local default URL |
| `OLLAMA_CV_MODEL` | `llama3.2` | Optional local model override |
| `OLLAMA_API_KEY` | Empty for local Ollama | Optional; only needed for an authenticated OpenAI-compatible endpoint |
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Optional hosted provider |
| `OPENROUTER_CV_MODEL` | `mistralai/mistral-small-24b-instruct-2501` | Optional OpenRouter model override |
| `GEMINI_API_KEY` | Your valid Google AI Studio / Gemini API key | Optional hosted fallback and other AI features |
| `AI_MODEL` | `gemini-3.8-flash` | Used for general Gemini AI and as a Gemini CV fallback |
| `AI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | Preferred Gemini model for CV extraction |

Model and key values are exact strings, with no comments or quotes. `CV_EXTRACTION_MODELS` accepts `ollama`, `openrouter`, and `google` entries, for example `ollama/llama3.2,openrouter/mistralai/mistral-small-24b-instruct-2501`. OpenRouter capacity and quotas can change; when it is rate-limited, extraction proceeds to the next configured model. For production, explicitly choose the hosted model chain you want rather than relying on development defaults. After changing deployment variables, **redeploy**.

CV extraction uses the structured output schema and does not change the saved profile until the user applies the preview. Local Ollama uses its OpenAI-compatible `/chat/completions` endpoint with JSON Schema output. The separate Resume Parser API setting is used by the standalone CV parse endpoint, not this design-studio import route.

Never paste an API key into an issue, chat, source file, or `NEXT_PUBLIC_*` variable. If a key has been exposed, rotate it in Google AI Studio and update Vercel.

## Diagnose an import failure

1. Open the app server logs for the environment that received the failed request, and find the line beginning with:
   ```text
   [customer-cv-import]
   ```
2. Read the provider error after the profile slug and check for `[CvExtraction] Provider failed; trying the next configured model.` A rate-limit response should move to the next model in `CV_EXTRACTION_MODELS`. If all configured providers fail, the final provider error is returned.
   ```text
   AI_APICallError: This model models/gemini-2.5-flash is no longer available to new users...
   ```
   This means a retired model is still configured in the running environment. Replace that model in `CV_EXTRACTION_MODELS` or the corresponding provider setting, then restart/redeploy. Confirm the log belongs to the latest process; environment changes do not update a running deployment.
3. For local extraction, confirm `ollama list` includes the configured `OLLAMA_CV_MODEL`, and that `OLLAMA_BASE_URL` is reachable from the Next.js server.
4. For hosted fallback, check that the corresponding API key is present and has model access/quota. Do not print keys when debugging.
5. Retry a small, non-sensitive document first. Provider quota/rate limits, unsupported content, and slow local inference can still fail; the route limits each user to ten attempts per ten minutes.

The API deliberately returns a generic timeout/network response for errors it cannot classify safely. The server log is the source of the underlying provider error. Do not repeatedly retry before checking it; retries can hit the import rate limit.

### Vercel deployment packaging

The CV route uses PDF.js locally. Its Node worker file must be available in the deployed function, and the app's SQL migrations must be included for startup migration. `next.config.ts` externalizes `pdfjs-dist` and includes its legacy build worker plus `migrations/**/*.sql` in server output tracing. After changing this configuration, redeploy and confirm the startup log no longer reports a missing `pdf.worker.mjs` or missing `/var/task/migrations` directory.

## Error messages at the route

| Response/error | Likely cause / next check |
| --- | --- |
| `CV import needs a configured local Ollama model or hosted OpenRouter/Gemini provider.` | No model provider is available in the current environment. |
| `Failed to extract structured CV information: ... rate-limited ...` | Check the `[CvExtraction]` fallback logs and configure another model in `CV_EXTRACTION_MODELS`; otherwise wait for the provider's quota to recover. |
| `Ollama CV extraction failed ...` | Check that Ollama is running, the configured model is downloaded, and `OLLAMA_BASE_URL` is reachable from the app. |
| `The AI couldn't extract editable fields...` | The model did not return valid structured CV data; try a simpler document or another configured model. |
| `CV import timed out or could not reach the parser service...` | Inspect `[customer-cv-import]` logs. It may be an unavailable model, network issue, timeout, or other provider failure. |

## Running the Resume Parser API locally

The parser is a separate service and is not started by this app. Clone it and run it with Docker:

```bash
git clone https://github.com/theresumeparser/resume-parser-api.git
cd resume-parser-api
cp .env.example .env      # add OPENROUTER_API_KEY and API_KEYS
docker run --rm -p 8000:8000 --env-file .env ghcr.io/theresumeparser/resume-parser-api:latest
```

Then point this app at it and use the same key in both places:

```env
RESUME_PARSER_API_URL=http://localhost:8000
RESUME_PARSER_API_KEY=sk-parse-abc123
```

The parser service needs its own `OPENROUTER_API_KEY`, and `API_KEYS` must contain the value you put in `RESUME_PARSER_API_KEY`. Its own rate limit and timeout settings apply. In production, host it on a stable HTTPS URL.

## Local verification

The app's standard checks are:

```bash
bun run typecheck
bun run lint
bun run test
```

A successful local typecheck/test does **not** prove that the deployed Gemini key, model access, quota, or Vercel environment variables are correct. To verify the live integration, upload a small synthetic or non-sensitive PDF in the target deployment and inspect its function log if it fails.
