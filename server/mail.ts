import "server-only";

/**
 * Outgoing email. Today nothing is sent: sign-in codes are fixed (ADMIN_OTP_STATIC) or printed to the
 * server log. To send real mail later, set MAIL_PROVIDER and MAIL_FROM (plus the provider's key) and
 * remove ADMIN_OTP_STATIC; nothing else changes.
 *
 *   MAIL_PROVIDER=log      prints the message to the server log (development default)
 *   MAIL_PROVIDER=none     sends nothing (production default; sign-in then needs ADMIN_OTP_STATIC)
 *   MAIL_PROVIDER=resend   https://resend.com via its HTTP API (RESEND_API_KEY)
 */

export type Mail = { to: string; subject: string; text: string; html?: string };
export type MailProviderName = "none" | "log" | "resend";

export function mailProvider(): MailProviderName {
  const p = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (p === "none" || p === "log" || p === "resend") return p;
  return process.env.NODE_ENV === "production" ? "none" : "log";
}

/** Shown at startup when sign-in codes can't reach anyone. */
export function mailWarning(staticCode: boolean): string | null {
  const p = mailProvider();
  if (staticCode) return null;
  if (p === "none") return "[mail] MAIL_PROVIDER is none and ADMIN_OTP_STATIC is not set: sign-in codes can't be delivered, so nobody can sign in.";
  if (p === "log" && process.env.NODE_ENV === "production") return "[mail] MAIL_PROVIDER=log in production: sign-in codes are only printed to the server log.";
  if (p === "resend" && (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)) return "[mail] MAIL_PROVIDER=resend needs RESEND_API_KEY and MAIL_FROM.";
  return null;
}

export async function sendMail(mail: Mail): Promise<void> {
  const provider = mailProvider();
  if (provider === "none") return;
  if (provider === "log") {
    console.info(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  // resend: plain HTTP, no SDK.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Mail provider answered ${res.status}`);
}

/** The second sign-in step's code. */
export async function sendLoginCode(to: string, code: string): Promise<void> {
  await sendMail({
    to,
    subject: "Your sign-in code",
    text: `Your sign-in code is ${code}. It expires in 5 minutes.\n\nIf you didn't try to sign in, change your password.`,
  });
}
