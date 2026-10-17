# Honger CV

Honger CV combines a shadcn dashboard shell with the portfolio, CV pages, conversational assistant, and admin tools from `resume-main`. Use the dashboard at `/dashboard`; portfolio topics in the sidebar open as chat questions, and the CV web page opens without dashboard chrome.

## Run locally

```bash
bun install
cp .env.example .env.local
# Fill in the server-side values described below.
bun run dev
```

The portfolio works without a database. Database-backed contact, feedback, voting, analytics, personas, and admin features require PostgreSQL.

## Admin access

The Admin item in the shadcn sidebar appears only for an authenticated admin with two-factor sign-in enabled. The `/admin` pages and admin API routes also perform their own server-side authorization checks; hiding the link is not the access-control boundary.

Configure `DATABASE_URL` and `BETTER_AUTH_SECRET` in `.env.local`, then create the single admin account:

```bash
bun run admin:create -- --email you@example.com
```

For local setup only, `ADMIN_OTP_STATIC` can provide a fixed one-time code. Remove it and configure email delivery for production.

## Checks and production build

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin for canonical URLs and metadata. `GEMINI_API_KEY` enables optional AI answers; the assistant's curated answers work without it.

To create or refresh the downloadable CV PDF, build the app, then run `bun run cv:pdf`. This uses Chrome or Edge when available; otherwise it uses Firefox with geckodriver. Set `CHROME_PATH` or `GECKODRIVER_PATH` when either executable is outside the standard locations.

## Important environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string; enables persistence and admin features. |
| `BETTER_AUTH_SECRET` | 32+ character secret for admin sessions and sign-in codes. |
| `BETTER_AUTH_URL` | Public site origin used by the authentication service. |
| `PERSONA_SIGNING_SECRET` | 32+ character secret for access and preview tokens. |
| `ADMIN_OTP_STATIC` | Temporary local-only fixed sign-in code; do not use in production. |
| `MAIL_PROVIDER`, `MAIL_FROM`, `RESEND_API_KEY` | Configure delivery of admin one-time codes. |
| `GEMINI_API_KEY` | Enables optional generated answers for questions outside the curated topics. |
| `NEXT_PUBLIC_SITE_URL` | Public canonical origin used for metadata and sitemap URLs. |
| `NEXT_PUBLIC_BASE_PATH` | Optional deployment prefix when hosting under a sub-path. |

Do not prefix secrets with `NEXT_PUBLIC_`; that prefix makes values available to browser code.
