<div align="center">
  <a href="https://github.com/Mekin-jema/honger_cv">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="public/honger-cv-logo.webp" />
      <img src="public/honger-cv-logo-light.webp" alt="Honger CV logo" width="108" height="108" />
    </picture>
  </a>

  # Honger CV

  ### Build a CV. Publish a portfolio. Let your work speak.

  An open-source CV builder and conversational portfolio platform. Create a polished CV, publish the work behind it, and give visitors an AI guide grounded in your own content.

  [Explore the demo](https://honger-cv.vercel.app/ask/) · [Read the project guide](docs/PROJECT_GUIDE.md) · [Report an issue](https://github.com/Mekin-jema/honger_cv/issues)

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
  ![License](https://img.shields.io/badge/license-private-lightgrey)
</div>

---

## Why Honger CV?

A traditional CV is useful, but it cannot explain the decisions, context, and outcomes behind your work. Honger CV combines a professional document, a public portfolio, and a conversational guide so recruiters, clients, and collaborators can explore the story at their own pace.

The repository ships with **Mekin Jemal's** portfolio as a working demo. You can browse it without an account or use it as a starting point for your own profile.

## Features

<table>
<tr>
<td width="50%" valign="top">

### ✦ CV Studio
Choose from 25+ CV layouts, set an accent colour, preview changes live, and print or download a professional PDF.

</td>
<td width="50%" valign="top">

### ◌ Public portfolio
Publish profile, experience, projects, skills, and contact pages from a single structured persona document.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ✦ Grounded portfolio AI
Start with curated answers, then optionally use Gemini for concise answers based only on published content.

</td>
<td width="50%" valign="top">

### ◌ Safe publishing
Draft privately, validate and test content, publish immutable versions, and roll back to a ready version when needed.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ✦ Customer workspace
Owners can create CVs, edit their content, train their assistant, select a design, and share a public profile.

</td>
<td width="50%" valign="top">

### ◌ Admin tools
Manage personas, jobs, messages, feedback, access requests, platform events, and analytics in a protected workspace.

</td>
</tr>
</table>

Additional product details include dark mode, responsive layouts, accessibility-minded interactions, privacy-aware analytics, content gates with access codes, and optional Google/GitHub sign-in.

## Product flow

```text
Create a CV → Edit a private draft → Publish & train → Share a portfolio and CV
                                            │
                                            └─ Visitors explore curated answers
                                               or ask the AI about published work
```

The public demo and curated portfolio work without a database or an AI key. Add PostgreSQL to enable persistence, accounts, publishing, and administration. Add Gemini to enable generated answers, source-PDF mapping, and semantic retrieval.

## Quick start

### Prerequisites

- [Bun](https://bun.sh/) **1.4.3**
- Node.js **20.11** or newer
- PostgreSQL 17 (optional for the public demo; required for accounts, publishing, and admin features)

### Run locally

```bash
# Clone the project
git clone https://github.com/Mekin-jema/honger_cv.git
cd honger_cv

# Install dependencies
bun install

# Create your local environment file
cp .env.example .env.local

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Demo-first design:** You can explore the landing page, Mekin's portfolio, CV Studio, and curated assistant topics without configuring any credentials.

### Add a local database

The included Docker Compose file starts PostgreSQL with pgvector support:

```bash
docker compose up -d
```

Add this to `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:local_dev_password@localhost:5432/myapp
```

Then apply the schema:

```bash
bun run db:migrate
```

The application also attempts to apply pending migrations when its Node.js server starts. Running migrations explicitly is recommended before deployment and in CI.

## Configuration

Copy `.env.example` to `.env.local`. Only configure the integrations you plan to use.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for personas, accounts, admin data, messages, jobs, and analytics. |
| `BETTER_AUTH_SECRET` | Private secret for authentication; use at least 32 characters. |
| `BETTER_AUTH_URL` | Application origin used by authentication, e.g. `http://localhost:3000`. |
| `PERSONA_SIGNING_SECRET` | Private secret for persona access and preview tokens; use at least 32 characters. |
| `NEXT_PUBLIC_SITE_URL` | Public canonical site URL used for metadata and the sitemap. |
| `GEMINI_API_KEY` | Enables generated assistant answers, content mapping, embeddings, and Gemini fallback for CV mapping. |
| `OPENROUTER_API_KEY` | Optional; enables OpenRouter CV PDF mapping (preferred when configured). |
| `OPENROUTER_CV_MODEL` | Optional OpenRouter model override; defaults to `openrouter/free`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google sign-in for customers. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional GitHub sign-in for customers. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for customer photos and durable generated PDFs. |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Server-only Cloudinary credentials. |
| `MAIL_PROVIDER` | Sign-in-code delivery strategy: `resend`, `log`, or `none`. |
| `RESEND_API_KEY` / `MAIL_FROM` | Required when `MAIL_PROVIDER=resend`. |
| `ADMIN_OTP_STATIC` | Local-development convenience code. **Do not use in production.** |
| `NEXT_PUBLIC_BASE_PATH` | Optional deployment path prefix. |

Generate secrets with a secure random source, for example:

```bash
openssl rand -base64 32
```

Never commit `.env.local`, credentials, or tokens. Variables prefixed with `NEXT_PUBLIC_` are sent to the browser; never use that prefix for a secret.

## Main routes

| Route | Description |
| --- | --- |
| `/` | Honger CV landing page and template overview. |
| `/ask/` | Mekin's public conversational portfolio demo. |
| `/cv/` | CV Studio, template previews, and PDF/print experience. |
| `/about/`, `/experience/`, `/projects/`, `/skills/`, `/contact/` | Bundled public portfolio pages. |
| `/u/<slug>/` | A customer's published portfolio. |
| `/u/<slug>/ask/` | A customer's published portfolio assistant. |
| `/u/<slug>/cv/` | A customer's chosen CV design and PDF download. |
| `/account/` | Authenticated customer workspace. |
| `/admin/` | Protected administration dashboard. |
| `/api/health/` | Database health endpoint (`200` when ready; `503` otherwise). |

## Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start the development server. |
| `bun run build` | Create a production build. |
| `bun run start` | Serve the production build. |
| `bun run typecheck` | Run TypeScript without emitting files. |
| `bun run lint` | Run ESLint. |
| `bun run test` | Run the Vitest suite. |
| `bun run check` | Run typecheck, lint, tests, and a production build. |
| `bun run db:migrate` | Apply pending PostgreSQL migrations. |
| `bun run db:migrate -- --check` | Check migration status. |
| `bun run admin:create -- --email you@example.com` | Create the initial admin account. |
| `bun run cv:pdf` | Generate the bundled CV PDF after building the app. |

Run the complete quality gate before opening a pull request or deploying:

```bash
bun run check
```

## Architecture

```text
app/                   Next.js App Router pages, layouts, and API routes
components/            Interface components grouped by feature
content/               Typed content for the bundled Mekin demo
lib/persona/           Persona schemas, templates, transforms, and shared helpers
server/persona/        Drafts, versions, publication, caching, and PDF generation
server/brain/          Grounded AI, retrieval, embeddings, and safety checks
server/access/         Gated-content and access-code logic
migrations/            Ordered PostgreSQL migrations
scripts/               Admin, migration, import, PDF, and IndexNow utilities
```

For a guided tour of the product architecture, publishing lifecycle, AI safety model, API groups, and deployment decisions, see **[docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)**.

## Publishing and AI safety

Publishing does more than save a form. Honger CV validates the persona, compiles visitor-facing knowledge, snapshots a version, optionally indexes content for retrieval, runs expected-answer and privacy checks, then activates the release. A failed publication leaves the currently live version unchanged.

Generated answers are optional. When enabled, they are structured by the server and limited to the current persona's visible knowledge. Returned cards and topics are validated again, and a leak filter blocks details that do not belong to the visitor's access tier.

## Deployment

Honger CV is designed for a Node.js or serverless deployment with a Neon-compatible PostgreSQL database.

- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the exact public HTTPS origin.
- Use a pooled PostgreSQL connection string in serverless environments.
- Configure Cloudinary to keep customer-uploaded images and generated PDFs durable across instances.
- Allocate at least **512 MB** of function memory for serverless PDF generation.
- Use `GET /api/health/` for infrastructure readiness checks.
- Enable `ENABLE_HSTS=1` only when the application is served exclusively over HTTPS.

## Security notes

- Authentication and administrative authorization are enforced server-side, not only hidden in the UI.
- The application sends a Content Security Policy, anti-framing headers, `nosniff`, a restrictive permissions policy, and a strict referrer policy.
- Access codes are handled outside AI prompts; the assistant receives only the resulting visibility tier.
- Keep `ADMIN_OTP_STATIC` limited to local development. Use verified email delivery in production.

## Contributing

Contributions and improvements are welcome. Before submitting a pull request:

1. Keep changes focused and documented.
2. Do not include secrets, local database data, or generated build output.
3. Run `bun run check`.
4. Describe user-visible changes and any required configuration updates.

## Author

Built by **[Mekin Jemal](https://github.com/Mekin-jema)** — Software Engineer, Full-Stack Developer, and AI Engineer.

---

<div align="center">
  <sub>Made with care for people who want their work to be understood, not just listed.</sub>
</div>
