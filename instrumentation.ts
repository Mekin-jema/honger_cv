/** Runs once when the Next.js server starts: applies database migrations and warns about easy-to-miss settings. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { proxyWarning } = await import("@/server/http");
  const warning = proxyWarning();
  if (warning) console.warn(warning);
  const { signingWarning } = await import("@/server/access/cookie");
  const signing = signingWarning();
  if (signing) console.warn(signing);
  const { authWarnings } = await import("@/server/auth");
  for (const w of authWarnings()) console.warn(w);

  const { dbConfigured, ensureSchema } = await import("@/server/db");
  if (!dbConfigured()) {
    console.error("[db] DATABASE_URL is not set: messages, feedback, votes, analytics, personas and the admin will answer 503. The job persona is served from the code content.");
    return;
  }
  // Apply pending migrations now rather than on the first request, then load the default persona, so the
  // first visitor doesn't wait. Failures are logged and retried on the next query; the site keeps
  // serving the code content meanwhile.
  try {
    await ensureSchema();
    const { getPersona, DEFAULT_PERSONA } = await import("@/server/persona/cache");
    await getPersona(DEFAULT_PERSONA());
    const { sweepInterruptedJobs } = await import("@/server/jobs");
    await sweepInterruptedJobs();
    const { query } = await import("@/server/db");
    const { rows } = await query<{ n: number }>("SELECT count(*)::int AS n FROM admin_users");
    if (!rows[0]?.n) console.warn("[auth] No admin account yet: run `npm run admin:create -- --email you@example.com`.");
  } catch (err) {
    console.error("[db] Startup migration failed (it is retried on the next request):", err instanceof Error ? err.message : err);
  }
}
