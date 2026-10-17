import { adminGuard, isResponse } from "@/server/admin-api";
import { cookieHeader, json } from "@/server/http";
import { PREVIEW_COOKIE } from "@/server/persona/preview";

/** DELETE: ends the draft preview in this browser (the "Exit preview" button on the site). */
export async function DELETE(req: Request) {
  const auth = await adminGuard(req, { write: true });
  if (isResponse(auth)) return auth;
  return json({ ok: true }, 200, { "set-cookie": cookieHeader(PREVIEW_COOKIE, "", { maxAge: 0, sameSite: "Strict" }) });
}
