# CV PDF import: how it works and how to troubleshoot it

This guide covers the **customer CV editor's document import** (the Upload CV action in the design studio). It does not describe PDF export/download.

## Request flow

1. `components/account/cv-import-pipeline.tsx` uploads the selected document as `FormData` to:
   ```text
   POST /api/cv/parse
   ```
2. The Next.js route calls the Python parser API at `POST /api/v1/extract`. If the running parser version returns 404 because it predates this endpoint, Next.js retries via the compatible `POST /api/v1/parse` endpoint by uploading the Markdown as a file.
3. In non-production environments, Next.js explicitly requests `openai_compatible/${OLLAMA_CV_MODEL}` (default `llama3.2`). The Python service performs structured extraction and validates its response; Next.js maps it into the CV editor schema.
4. The extracted fields are merged into the draft. The known Mekin/Jordan starter CV is replaced automatically. Existing user data is preserved unless a conflict is explicitly resolved in favor of the import. Importing does not publish the CV.

## Required variables

Configure the Next.js app with the parser API URL and key. Configure the Python parser with its model provider:

| Name | Suggested value | Required? |
| --- | --- | --- |
| Next.js `RESUME_PARSER_API_URL` | `http://localhost:8000` | Yes |
| Next.js `RESUME_PARSER_API_KEY` | A key also present in parser `API_KEYS` | Yes |
| Next.js `OLLAMA_CV_MODEL` | `llama3.2` | Optional local model override |
| Parser `OPENAI_COMPATIBLE_BASE_URL` | `http://localhost:11434/v1` on host, `http://ollama:11434/v1` in Compose | Required for local Ollama |
| Parser `DEFAULT_PARSE_MODELS` | `openai_compatible/llama3.2` | Default when no request model is supplied |
| Parser `OPENAI_COMPATIBLE_NUM_CTX` | `8192` | Set for Ollama to fit larger structured extraction prompts |
| Parser `OPENAI_COMPATIBLE_MAX_TOKENS` | `2048` | Optional Ollama output cap to keep local extraction within the route timeout |

In production, configure the provider and model chain on the Python parser API, then restart/redeploy that service. The Next.js extraction route supports parser versions that do not yet have `/api/v1/extract` by falling back to `/api/v1/parse`.

Never paste an API key into an issue, chat, source file, or `NEXT_PUBLIC_*` variable. If a key has been exposed, rotate it in Google AI Studio and update Vercel.

## Diagnose an import failure

1. Open the app server logs for the environment that received the failed request, and find the line beginning with:
   ```text
   [customer-cv-import]
   ```
2. A 404 from `/api/v1/extract` should fall back to `/api/v1/parse`. If the fallback also returns 404, check that `RESUME_PARSER_API_URL` points to the expected Python parser service.
   ```text
   {"detail":"Not Found"}
   ```
3. Check Python parser logs for provider failures. In local development, extraction explicitly selects `openai_compatible/${OLLAMA_CV_MODEL}`; verify the model is installed and the parser can reach its Ollama URL.
4. Use `public/cv2.md` as a repeatable test document. Longer documents or slow local inference may exceed the request timeout.

Do not repeatedly retry before checking the server logs; retries can hit the import rate limit.

### Vercel deployment packaging

The CV route uses PDF.js locally. Its Node worker file must be available in the deployed function, and the app's SQL migrations must be included for startup migration. `next.config.ts` externalizes `pdfjs-dist` and includes its legacy build worker plus `migrations/**/*.sql` in server output tracing. After changing this configuration, redeploy and confirm the startup log no longer reports a missing `pdf.worker.mjs` or missing `/var/task/migrations` directory.

## Error messages at the route

| Response/error | Likely cause / next check |
| --- | --- |
| `{"detail":"Not Found"}` | Next.js falls back to `/api/v1/parse`; if that is also 404, check the parser URL/service. |
| Parser provider error or timeout | Check parser logs, Ollama availability, configured model, and parser-to-Ollama connectivity. |
| Extracted fields do not appear in the editor | Check the response mapping and conflict review. Starter data should be replaced automatically. |

## Running the Resume Parser API locally

The parser is a separate service. In this repository, start the API and Ollama with Docker Compose:

```bash
cd parser-api
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
```

Then point this app at it and use the same key in both places:

```env
RESUME_PARSER_API_URL=http://localhost:8000
RESUME_PARSER_API_KEY=sk-parse-abc123
```

Set parser `API_KEYS` to include the key used by `RESUME_PARSER_API_KEY`. The parser container uses `http://ollama:11434/v1`; when running the parser on the host, configure it to use `http://localhost:11434/v1`. In production, host the parser on a stable HTTPS URL and configure its deployment model provider.

## Local verification

The app's standard checks are:

```bash
bun run typecheck
bun run lint
bun run test
```

A successful local typecheck/test does **not** prove that the deployed Gemini key, model access, quota, or Vercel environment variables are correct. To verify the live integration, upload a small synthetic or non-sensitive PDF in the target deployment and inspect its function log if it fails.
