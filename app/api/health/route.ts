import { json } from "@/server/http";
import { checkStore } from "@/server/store";

export const dynamic = "force-dynamic";

/** For uptime checks and load balancers: 200 when the database answers (on a fresh database this also creates the tables). */
export async function GET() {
  try {
    await checkStore();
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 503);
  }
}
