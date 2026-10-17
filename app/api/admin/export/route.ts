import { adminSession } from "@/server/admin-session";
import { bad } from "@/server/http";
import { readDb, type Db } from "@/server/store";

export async function GET(req: Request) {
  if (!(await adminSession(req))) return bad("Sign in first.", 401);
  let db: Db;
  try {
    db = await readDb();
  } catch (err) {
    console.error("[export] Could not read the store:", err);
    return bad("Could not read the store right now.", 503);
  }
  // Every table as JSON, in the shape the old file store used (`npm run db:import` reads it back in).
  return new Response(JSON.stringify(db), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="feedback-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
