<div align="center">
  <img src="public/honger-cv-logo.webp" alt="Honger CV" width="88" height="88" />

  # Honger CV

  ### Build a CV. Publish a portfolio. Let your work speak.

  Turn your experience into a polished CV, a shareable portfolio, and an AI guide that helps people understand your work.

  **[Open the live demo](https://honger-cv.vercel.app/)** ·
  **[Explore the portfolio assistant](https://honger-cv.vercel.app/ask/)** ·
  **[Read the project guide](docs/PROJECT_GUIDE.md)**

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
</div>

---

## Take a look

The previews below use a fictional **John Doe** CV.

<p align="center">
  <img src="docs/images/readme/cv-sample.png" alt="John Doe sample CV in a modern two-column design" width="48%" />
  <img src="docs/images/readme/cv-template-forest.png" alt="John Doe sample CV in a clean, forest-accented template" width="48%" />
</p>

<p align="center">
  <img src="docs/images/readme/portfolio-chat.png" alt="Portfolio assistant answering questions about a sample portfolio" width="72%" />
</p>

## What you can do

- **Create and customize CVs** with 25+ templates, live previews, color palettes, and print-ready PDF export.
- **Build a portfolio** from your profile, experience, projects, skills, and contact information.
- **Add a portfolio assistant** that answers questions from the information you choose to publish.
- **Import an existing CV** and turn its contents into editable profile details.
- **Publish with confidence** using private drafts, content checks, immutable releases, and rollback.
- **Control access** with private sections and visitor access codes.
- **Manage everything in one workspace** with customer tools and a protected admin area.

## Try the demo

Explore the landing page, template previews, sample CV, and curated assistant topics without an account. The public demo works without a database or AI credentials. Database-backed accounts, publishing, and administration require PostgreSQL.

## Plans

Your **first CV includes all 25+ designs for free**. A one-time **ETB 100 Chapa** or **USD 1 PayPal** payment unlocks additional CVs and all designs for life. Optional Portfolio Pro adds advanced visitor AI and profile insights.

## Run locally

### Requirements

- [Bun](https://bun.sh/) 1.4.3
- Node.js 20.11 or newer
- PostgreSQL 17 for accounts and publishing (optional for the public demo)

### Start the app

```bash
git clone https://github.com/Mekin-jema/honger_cv.git
cd honger_cv
bun install
cp .env.example .env
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable accounts and persistence, start PostgreSQL and apply the database migrations:

```bash
docker compose up -d
bun run db:migrate
```

Set `DATABASE_URL` in `.env` to `postgresql://postgres:local_dev_password@localhost:5432/myapp` for the provided local database. Configure only the optional integrations you need; see [.env.example](.env.example) and the [project guide](docs/PROJECT_GUIDE.md).

## Useful commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start the local development server. |
| `bun run typecheck` | Check TypeScript types. |
| `bun run lint` | Run ESLint. |
| `bun run test` | Run the test suite. |
| `bun run build` | Create a production build. |
| `bun run check` | Run typecheck, lint, tests, and build. |
| `bun run db:migrate` | Apply pending database migrations. |

## Built with

Next.js App Router, React, TypeScript, Tailwind CSS, PostgreSQL, and optional Gemini-powered answers and retrieval.

## Documentation

- [Project guide](docs/PROJECT_GUIDE.md) — product behavior, publishing, billing, configuration, and deployment.
- [CV import troubleshooting](docs/cv-pdf-import-troubleshooting.md) — parser setup and import troubleshooting.
- [Report a bug or request a feature](https://github.com/Mekin-jema/honger_cv/issues).

## Contributing

Contributions are welcome. Keep changes focused, avoid committing credentials or local data, and run `bun run check` before submitting a pull request.

---

<div align="center">
  <sub>Made for work that deserves to be understood—not just listed.</sub>
</div>
