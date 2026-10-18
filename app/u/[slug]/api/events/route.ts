import { bad } from "@/server/http";
import { publicPersona } from "@/server/persona/public";
import { POST as events } from "@/app/api/events/route";

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!(await publicPersona(slug))) return bad("Profile not found.", 404);
  const headers = new Headers(req.headers);
  headers.set("x-public-persona", slug);
  return events(new Request(req, { headers }));
}
