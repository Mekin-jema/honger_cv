<div align="center">

# Honger CV

### A portfolio you can explore like a conversation.

An interactive portfolio and CV with a conversational assistant, project stories, and a private admin workspace — built with Next.js, React, Tailwind CSS, and shadcn/ui.

<br />

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-optional-4169E1?logo=postgresql)

</div>

---

## The idea

Most portfolios are a stack of pages. **Honger CV is a portfolio you can ask questions of.**

Visitors can follow curated topics or ask the assistant about work, skills, projects, and experience. Each answer can include useful details and a link to the corresponding public page. A separate dashboard provides a career overview, while the protected admin workspace brings visitor messages, feedback, votes, analytics, and persona editing together.

The portfolio and curated answers work without a database or AI credentials. PostgreSQL unlocks persistent features; a Gemini API key enables optional generated answers.

## Explore

| Route | What you’ll find |
| --- | --- |
| `/` | CV Studio landing page with 25+ CV design options |
| `/ask/` | AI-powered conversational portfolio |
| `/ask/[intent]/` | Shareable chat answer for a topic |
| `/dashboard/` | Career summary and selected work |
| `/about/` | Profile and background |
| `/experience/` | Professional experience |
| `/projects/` | Project cards and case studies |
| `/skills/` | Technologies and capabilities |
| `/contact/` | Contact details and message form |
| `/cv/` | Printable CV and PDF download |
| `/admin/` | Private inbox, analytics, and visitor activity |
| `/admin/personas/` | Persona management and content studio |

The CV Studio landing page is the public home page. The **Open CV Studio** action opens the template picker and PDF preview; **Ask AI** opens the conversational portfolio. The public portfolio pages use their own site navigation rather than the dashboard sidebar; **Summary** opens the career dashboard.

## What’s inside

- **Conversational portfolio** — curated, source-grounded answers, follow-up prompts, feedback controls, and optional AI responses.
- **Project storytelling** — full-width project covers, summaries, technology stacks, and detailed case studies.
- **CV Studio** — 25+ layouts, custom accent colors, live previews, and print-ready PDF export.
- **CV and public pages** — responsive About, Experience, Projects, Skills, and Contact pages, plus a downloadable PDF.
- **Admin inbox** — review messages, feedback, answer votes, AI answers, and visitor activity.
- **Privacy-first analytics** — aggregated traffic and engagement insights; visitor-level analytics are available only when consent is given.
- **Persona Studio** — edit persona content, review changes, run checks, manage access, and publish.
- **Light and dark themes** — theme-aware components throughout the portfolio and admin.
- **Accessible interactions** — keyboard focus, reduced-motion support, labels, and responsive layouts.

## Quick start

### Requirements

- [Bun](https://bun.sh/) 1.4.3 (the project’s package manager)
- Node.js 20.9 or later
- PostgreSQL for persistent data and admin features

### Install and run

```bash
git clone https://github.com/Mekin-jema/honger_cv.git
cd honger_cv
bun install
cp .env.example .env.local
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The portfolio and curated chat work without filling in the optional environment settings. Add PostgreSQL and admin settings to `.env.local` to enable persistence and the admin workspace.

> **Keep `.env.local` private.** Never commit credentials or expose server secrets through a `NEXT_PUBLIC_` variable.

## Configuration

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Persistent features and admin | PostgreSQL connection string. Schema migrations are applied automatically when the server starts; you can also run them explicitly. |
| `BETTER_AUTH_SECRET` | Admin authentication | Use a private secret of at least 32 characters. |
| `BETTER_AUTH_URL` | Admin authentication | Public app origin, for example `http://localhost:3000` locally. |
| `PERSONA_SIGNING_SECRET` | Signed persona access and preview tokens | Use a private secret of at least 32 characters. |
| `NEXT_PUBLIC_SITE_URL` | Canonical metadata and sitemap | Public HTTPS origin in production. Defaults to localhost for local development. |
| `GEMINI_API_KEY` | Optional generated answers | Without it, curated answers remain available. |
| `MAIL_PROVIDER` | Email delivery for sign-in codes | `resend`, `log`, or `none`. Production email needs `RESEND_API_KEY` and `MAIL_FROM`. |
| `RESEND_API_KEY` | Resend email delivery | Needed when `MAIL_PROVIDER=resend`. |
| `MAIL_FROM` | Resend email delivery | Verified sender address for outgoing sign-in codes. |
| `ADMIN_OTP_STATIC` | Local-only sign-in convenience | Fixed code for development only. Remove it for production and configure email delivery. |
| `NEXT_PUBLIC_BASE_PATH` | Sub-path deployments | Optional URL prefix when hosting below the domain root. |

To generate strong signing secrets, use a secure random generator, for example:

```bash
openssl rand -base64 32
```

Set the generated value for each secret independently. Do not reuse a production secret in development or commit it to the repository.

### Create the admin account

With `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` configured, create the single admin account:

```bash
bun run admin:create -- --email you@example.com
```

The script prompts for a password without displaying it, enables two-factor authentication, and prints backup codes once. Save those codes securely. Sign in at `/admin/login/`.

Admin links are hidden from non-admin visitors, but authorization is also enforced on admin pages and API routes.

### Customer accounts and profiles

Customers can register at `/register/`, sign in at `/login/`, and manage their CVs from `/account/`. Each customer can create Job CVs by entering a professional role; the role names the CV (for example, “Product Engineer CV” or “Product Engineer CV 2”), and the signed-in user's name seeds the CV identity. The customer Studio uses all nine Persona Studio tabs, including JSON, with owner-scoped APIs for drafts, AI helpers, checks, access management, and publishing. Their sidebar includes the public Portfolio navigation plus links to their own dashboard, AI, training, and CV form/design. The CV form saves to that customer's draft and is used by their own CV page and AI knowledge; it does not use the demo portfolio's data. Admins keep the same Portfolio sidebar and receive the administration links; the admin navigation label is **User**.

The private assistant uses the selected customer's saved draft. If its Job CV has no personal training information yet, opening Ask AI redirects to the Knowledge training tab. Customers can publish explicitly; published profiles are available at `/u/<profile-slug>/`, where their CV and public AI assistant use the saved profile and design. The existing Mekin portfolio remains the public demo. Customer requests cannot access the shared `/admin/personas/job/` editor or another owner's persona.

Persona ownership is checked on customer APIs, publishing jobs, and profile pages. Platform event totals are visible only to administrators in the `/admin/` dashboard. Apply the pending migrations before enabling customer registration in an existing deployment.

### Database migrations

The server applies pending migrations at startup. To run them manually or check migration status:

```bash
bun run db:migrate
bun run db:migrate -- --check
```

## Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start the local development server |
| `bun run build` | Create a production build |
| `bun run start` | Serve the production build |
| `bun run typecheck` | Run the TypeScript compiler without emitting files |
| `bun run lint` | Run ESLint |
| `bun run test` | Run the test suite |
| `bun run check` | Run typecheck, lint, tests, and production build |
| `bun run db:migrate` | Apply pending PostgreSQL migrations |
| `bun run admin:create -- --email you@example.com` | Create the admin account |
| `bun run cv:pdf` | Generate the downloadable CV PDF |

To generate the PDF, build the app first and then run `bun run cv:pdf`. The script uses Chrome or Edge when available, or Firefox with geckodriver. Set `CHROME_PATH` or `GECKODRIVER_PATH` if the browser executable is not on the standard path.

## Project map

```text
app/            Next.js routes, API handlers, and public pages
components/     Chat, dashboard, admin, site, and UI components
content/        Typed portfolio, project, experience, and skills content
lib/            Shared browser utilities, chat state, and persona types
server/         Authentication, database, AI, analytics, and persona services
migrations/     PostgreSQL schema migrations
public/         Static assets, images, and downloadable CV
scripts/        Admin, database, and PDF utilities
```

Portfolio content is maintained in the typed modules under `content/`. Persona-based pages and admin editing are implemented in `server/persona/` and `components/admin/studio/`.

## Tech stack

**App:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui<br />
**Interface:** Base UI · Motion · GSAP · Lucide<br />
**Services:** PostgreSQL · Better Auth · Vercel AI SDK · Google Gemini<br />
**Quality:** Vitest · ESLint · TypeScript

## Security notes

- Keep database credentials, auth secrets, and AI keys on the server.
- `NEXT_PUBLIC_` variables are bundled for browser use; never use that prefix for secrets.
- `ADMIN_OTP_STATIC` is for local development only.
- Admin routes and API handlers enforce authorization independently of sidebar visibility.
- The app sets security headers, including a Content Security Policy and anti-framing protections.

---

<div align="center">

Built by **Mekin Jemal** · [GitHub](https://github.com/Mekin-jema/honger_cv)

</div>
