# Honger CV — Project Guide

> **A CV builder, public portfolio, and source-grounded AI guide in one product.**

Honger CV lets people turn career information into a polished CV, a shareable portfolio, and an assistant that helps visitors explore that work. The bundled **Mekin** persona keeps the site useful as a demo even before PostgreSQL or AI credentials are configured.

```text
Create CV → edit a draft → publish & train → share portfolio + downloadable CV
                                      └────→ visitors ask grounded questions
```

## At a glance

| Area | What it does |
| --- | --- |
| **CV Studio** | Presents 25+ visual designs and printable/downloadable CVs. |
| **Public portfolio** | Renders About, Experience, Projects, Skills, Contact, and focused project pages from persona content. |
| **Portfolio assistant** | Starts with curated answers and can use Gemini for unanswered, source-grounded questions. |
| **Customer workspace** | Lets signed-in owners create CVs, edit drafts, choose a design, train, and publish a profile. |
| **Admin workspace** | Manages personas, drafts, versions, jobs, visitor activity, and platform analytics. |
| **Access controls** | Supports private/gated persona sections and access-code requests. |

## How the application is organized

```text
app/                   Routes, layouts, and HTTP API handlers
components/            UI by product area (account, admin, chat, document, site)
content/               Typed content for the bundled Mekin demo
lib/persona/           Shared schemas, content transforms, templates, and browser-safe helpers
server/persona/        Drafts, publishing, public resolution, PDF generation, caching
server/brain/          Grounded answers, retrieval, embeddings, leakage checks, model setup
server/access/         Access-code cookies and gated-content logic
migrations/            Ordered PostgreSQL schema migrations
scripts/               Database, admin-account, PDF, IndexNow, and import utilities
```

The project uses the Next.js App Router. Server-only domain behavior lives in `server/`; reusable validation and presentation logic lives in `lib/`; route handlers in `app/api/` stay deliberately thin.

## The two content modes

### Demo mode — no services required

With no `DATABASE_URL` and no `GEMINI_API_KEY`, the public site still renders from the typed files in `content/`. Visitors can explore the curated portfolio and its listed chat topics. Database-backed actions return an unavailable response rather than preventing the public demo from loading.

### Published-persona mode — database-backed

With PostgreSQL configured, a persona has a saved draft and immutable published versions. Public profiles are served at `/u/<slug>/`; the owner can change content without exposing the draft. Gemini and pgvector improve generated answers and retrieval, but publishing still works when AI is unavailable.

## Key visitor journeys

### 1. Create and publish a CV

1. A customer registers or signs in, then creates a CV from `/account/`.
2. The workspace starts from the demo information as editable sample content.
3. The owner edits the profile, CV, questions, access rules, and selected design in the training studio.
4. **Publish & train** validates the draft, compiles the visitor-facing knowledge, snapshots a new version, indexes it when possible, runs checks, and makes that version live.
5. The profile is available at `/u/<slug>/`; `/u/<slug>/cv/` serves the selected design and its PDF download.

A publish failure does **not** replace the current live version. Ready versions can be activated again for a quick rollback.

### 2. Ask the portfolio

1. The browser first matches curated questions and answers.
2. For a question that does not have a written match, it calls `POST /api/ask/` only when `GEMINI_API_KEY` is available.
3. The server builds the answer context from the current published persona and the visitor's visibility tier. Large knowledge bases use retrieved relevant chunks.
4. The model must return a structured route: a curated topic, a concise grounded answer, a gated response, or a decline.
5. The response is filtered again: cards must be visible, suggested topics must exist, and potential private-detail leaks are blocked before the answer reaches the browser.

Free-form questions are rate-limited per visitor and per day. Preview questions are answered from the draft but are not logged.

### 3. Request gated information

A persona can mark content as private. When a public visitor reaches it, the portfolio displays a request-access card instead of the content. Access-code verification is handled through the access endpoints and a signed cookie; the AI is given only the visitor's resulting tier, never the code itself.

### 4. Choose a billing plan

Customer billing is available at `/account/billing/`. The first CV includes the full design collection, editing, PDF export, the public CV, and curated visitor topics for free. A one-time **ETB 100 Chapa** or **USD 1 PayPal** payment unlocks additional CV creation and the full design collection for life. **Portfolio Pro** is a **USD 4.99/month PayPal subscription**; it enables advanced visitor AI and aggregated profile insights, while the basic public CV remains available.

Each customer can create one CV for free, with all templates available. Creating additional CVs requires a lifetime CV Design Pass; deleting a CV does not remove the paid requirement if another CV already exists. Existing accounts with multiple CVs keep them, but cannot create more until they have the pass. Owners can permanently delete a CV from `/account/`; this also removes its visitor history, drafts, published profile, and stored files where cleanup succeeds. Deletion is blocked while a CV publish or processing job is active.

The server chooses prices and verifies provider-side payment status before granting entitlements. Chapa uses transaction verification on its callback and the customer return page. PayPal uses order capture, subscription verification, and signed webhooks for subscription lifecycle events. The application never accepts a client-provided amount and does not store payment credentials.

For local setup, add Chapa's secret key and PayPal sandbox credentials to the ignored `.env.local` file. Chapa's public key is not needed for the hosted redirect checkout. To enable Portfolio Pro, create and activate a **USD 4.99 monthly** plan in PayPal, set its plan ID, register `/api/billing/paypal/webhook/` as a PayPal webhook, and set the matching webhook ID. Keep `PAYPAL_ENVIRONMENT` aligned with the credentials and webhook environment. The database migration creates the order, subscription, and webhook-idempotency tables automatically.

## Publishing pipeline

Publishing is a background job scheduled after the HTTP response. Its progress is stored so the studio can poll it.

```text
validate → compile → snapshot → embed → checks → activate → PDF
```

| Step | Purpose |
| --- | --- |
| **Validate** | Checks the persona schema, content, and host assignment conflicts. |
| **Compile** | Produces public/unlocked knowledge, topics, cards, leak terms, and retrieval chunks. |
| **Snapshot** | Saves a numbered immutable version in `persona_versions`. |
| **Embed** | Stores searchable chunks; vectors are added when pgvector and Gemini embeddings are available. |
| **Checks** | Runs expected-answer, privacy-leak, and prompt-injection probes. Leaks stop the release. |
| **Activate** | Atomically marks the new version live and refreshes the persona cache. |
| **PDF** | Renders and stores a PDF. A PDF failure is reported but never unpublishes the profile. |

## Routes worth knowing

| Route | Audience | Purpose |
| --- | --- | --- |
| `/` | Everyone | Product landing page and CV-template overview. |
| `/ask/` | Everyone | Mekin's conversational portfolio demo. |
| `/cv/` | Everyone | CV Studio and print/download experience. |
| `/about/`, `/experience/`, `/projects/`, `/skills/`, `/contact/` | Everyone | Bundled public portfolio. |
| `/u/<slug>/` | Everyone | A published customer portfolio. |
| `/u/<slug>/ask/` | Everyone | A published customer's assistant. |
| `/u/<slug>/cv/` | Everyone | A published customer's chosen CV design. |
| `/account/` | Customer | CV ownership and workspace. |
| `/account/training/<slug>/` | Customer | Persona and CV editing studio. |
| `/admin/` | Administrator | Operations dashboard. |
| `/admin/personas/` | Administrator | Persona management and publishing. |
| `/api/health/` | Infrastructure | Returns `200` when the database is reachable, otherwise `503`. |

For the customer editor's PDF upload flow, model configuration, and Vercel troubleshooting, see [CV PDF import troubleshooting](./cv-pdf-import-troubleshooting.md).

## Important API groups

| Prefix | Responsibility |
| --- | --- |
| `/api/ask/`, `/api/feedback/`, `/api/vote/` | Conversational portfolio interaction. |
| `/api/access/` | Gated-content access requests and unlocks. |
| `/api/account/` | Customer-owned persona operations. |
| `/api/admin/` | Admin-only content, previews, exports, and AI tooling. |
| `/api/auth/` | Better Auth handlers. |
| `/api/contact/`, `/api/events/` | Contact and privacy-aware analytics events. |
| `/api/billing/` | Customer checkout, verified payment returns, subscription lifecycle, and PayPal webhooks. |

## Local development recipe

```bash
bun install
cp .env.example .env.local
bun run dev
```

Then visit [http://localhost:3000](http://localhost:3000). This is enough for the public demo.

For local persistence, start PostgreSQL with Docker and set the resulting connection string in `.env.local`:

```bash
docker compose up -d
# DATABASE_URL=postgresql://postgres:local_dev_password@localhost:5432/myapp
bun run db:migrate
```

The server also attempts pending migrations during startup. Running the migration command explicitly is useful in CI and before a deployment.

## Configuration map

| Need | Variables |
| --- | --- |
| Database-backed personas, jobs, messages, analytics | `DATABASE_URL` |
| Admin and customer authentication | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| Social sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Signed access/preview flows | `PERSONA_SIGNING_SECRET` |
| Canonical public URLs | `NEXT_PUBLIC_SITE_URL` |
| Generated answers, CV mapping, embeddings | `GEMINI_API_KEY` |
| Chapa CV-pass checkout | `CHAPA_SECRET_KEY` |
| PayPal checkout and Portfolio Pro | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT`, `PAYPAL_PORTFOLIO_PRO_PLAN_ID`, `PAYPAL_WEBHOOK_ID` |
| Durable customer images and PDFs | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Sign-in-code delivery | `MAIL_PROVIDER`, `RESEND_API_KEY`, `MAIL_FROM` |

See [the root README](../README.md#configuration) for the full environment-variable reference and security notes. Never put secrets in a `NEXT_PUBLIC_` variable.

## Quality gates

Run the complete project check before merging or deploying:

```bash
bun run check
```

It runs TypeScript, ESLint, Vitest, and a production build. Individual commands are available when iterating:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Deployment notes

- Use Node.js 20.11+ and Bun 1.4.3 for the project workflow.
- Configure production `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` with the exact HTTPS origin.
- Use a pooled, Neon-compatible PostgreSQL URL for serverless environments.
- Enable Cloudinary for customer-uploaded images and durable generated PDFs. Without it, PDF storage is local and unsuitable for multi-instance/serverless deployments.
- PDF rendering uses bundled serverless Chromium where needed; allocate at least **512 MB** of function memory.
- `GET /api/health/` is the appropriate database readiness check.
- Set `ENABLE_HSTS=1` only when every served environment is HTTPS.

## Security model in brief

- Secrets and data access stay server-side; client-visible variables are explicitly prefixed `NEXT_PUBLIC_`.
- Admin UI visibility is not authorization: admin routes and handlers perform their own access checks.
- The app sets a CSP, anti-framing headers, a restrictive permissions policy, and `nosniff` protection.
- Generated answers are constrained to persona knowledge and rechecked for visibility and leakage.
- `ADMIN_OTP_STATIC` is intended only for local development. Remove it in production and use real mail delivery.

---

**Start here:** run the demo, create a draft, then publish a profile. The shortest path to understanding the code is to follow that journey from `app/account/` through `server/persona/publish.ts` and `server/brain/answer.ts`.
