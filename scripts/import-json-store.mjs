// Copies an old JSON store (data/feedback.json, or a JSON export from the inbox) into the Postgres
// database. Rows that are already there (same id) are skipped, so it is safe to run again.
//   npm run db:import                         (reads data/feedback.json)
//   npm run db:import -- path/to/export.json
// The tables must exist: start the app once (or open /api/health/) before the first import.
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2] ?? "data/feedback.json";
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set (the npm script loads .env.local).");
  process.exit(1);
}

const list = (x) => (Array.isArray(x) ? x : []);
const db = JSON.parse(readFileSync(file, "utf8"));
const pool = new pg.Pool({ connectionString: url.replace(/sslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full"), max: 2 });

async function copy(label, rows, sql, values) {
  let added = 0;
  for (const r of rows) {
    const res = await pool.query(`${sql} ON CONFLICT DO NOTHING`, values(r));
    added += res.rowCount ?? 0;
  }
  console.log(`${label}: ${added} added, ${rows.length - added} already there`);
}

try {
  await copy("contacts", list(db.contacts), "INSERT INTO contacts (id, created_at, visitor, name, email, company, message) VALUES ($1,$2,$3,$4,$5,$6,$7)", (c) => [
    c.id, c.createdAt, c.visitor, c.name, c.email, c.company ?? null, c.message,
  ]);
  await copy("feedback", list(db.feedback), "INSERT INTO feedback (id, created_at, visitor, rating, message, name, email) VALUES ($1,$2,$3,$4,$5,$6,$7)", (f) => [
    f.id, f.createdAt, f.visitor, f.rating ?? null, f.message ?? "", f.name ?? null, f.email ?? null,
  ]);
  await copy("votes", list(db.votes), "INSERT INTO votes (id, created_at, updated_at, visitor_id, visitor, intent_id, variant, answer_id, value) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", (v) => [
    v.id, v.createdAt, v.updatedAt ?? v.createdAt, v.visitor?.visitorId ?? "", v.visitor ?? {}, v.intentId, v.variant ?? 0, v.answerId ?? "", v.value,
  ]);
  await copy("events", list(db.events), "INSERT INTO events (id, at, type, intent_id, path, consent, visitor) VALUES ($1,$2,$3,$4,$5,$6,$7)", (e) => [
    e.id, e.at, e.type, e.intentId ?? null, e.path ?? null, e.consent === true, e.visitor ?? null,
  ]);
  await copy("ai_answers", list(db.aiAnswers), "INSERT INTO ai_answers (id, created_at, visitor, question, route, intent_id, answer, cards, model, ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", (a) => [
    a.id, a.createdAt, a.visitor ?? null, a.question, a.route, a.intentId ?? null, a.answer ?? null, a.cards ? JSON.stringify(a.cards) : null, a.model ?? null, a.ms ?? 0,
  ]);
} finally {
  await pool.end();
}
