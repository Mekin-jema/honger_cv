"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { ArrowLeft, KeyRound, LaptopMinimal, LoaderCircle, LogOut, ShieldAlert, ShieldCheck, Smartphone, UserRoundPen } from "lucide-react";
import { FieldError, SendError, errProps, field, label } from "@/components/blocks/forms";
import { ThemeToggle } from "@/components/theme-provider";
import { getAuthClient } from "@/lib/auth-client";
import { cn, withBase } from "@/lib/utils";

type Device = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: string | Date; updatedAt: string | Date; expiresAt: string | Date };

/** "Chrome on Windows" from a user agent (no library: good enough for a devices list). */
function deviceName(ua: string | null | undefined): { name: string; phone: boolean } {
  const s = ua ?? "";
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\//.test(s) ? "Opera" : /Firefox\//.test(s) ? "Firefox" : /Chrome\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : "A browser";
  const os = /Android/.test(s) ? "Android" : /iPhone|iPad/.test(s) ? "iOS" : /Windows/.test(s) ? "Windows" : /Mac OS X/.test(s) ? "macOS" : /Linux/.test(s) ? "Linux" : "an unknown system";
  return { name: `${browser} on ${os}`, phone: /Android|iPhone|iPad|Mobile/.test(s) };
}

const when = (d: string | Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function AdminSettings({ email, currentSessionId, staticCode, mailProvider }: { email: string; currentSessionId: string; staticCode: boolean; mailProvider: string }) {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [devicesError, setDevicesError] = useState<string>();
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getAuthClient().listSessions();
    if (res.error) setDevicesError("Couldn't load your devices.");
    else setDevices((res.data as Device[]).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
  }, []);
  useEffect(() => {
    // Loads once on open; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const revoke = async (d: Device) => {
    setBusy(d.id);
    await getAuthClient().revokeSession({ token: d.token });
    setBusy(null);
    if (d.id === currentSessionId) return window.location.assign(withBase("/admin/login/"));
    void load();
  };
  const everywhere = async () => {
    setBusy("all");
    await getAuthClient().revokeSessions();
    window.location.assign(withBase("/admin/login/"));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 md:px-6">
          <a href={withBase("/admin/")} className="icon-btn shrink-0" aria-label="Back to the admin">
            <ArrowLeft className="size-5" />
          </a>
          <h1 className="text-[15px] font-semibold tracking-tight">Settings</h1>
          <span className="eyebrow ml-1 rounded-md border border-line px-1.5 py-0.5">Private</span>
          <div className="ml-auto flex items-center gap-1.5">
            <a href={withBase("/admin/personas/")} className="icon-btn" aria-label="Personas" title="Personas">
              <UserRoundPen className="size-[18px]" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 md:px-6">
        <section aria-labelledby="security" className={cn("card flex gap-4 p-5", staticCode && "border-accent/40")}>
          {staticCode ? <ShieldAlert className="size-6 shrink-0 text-accent" aria-hidden="true" /> : <ShieldCheck className="size-6 shrink-0 text-emerald-600" aria-hidden="true" />}
          <div className="min-w-0 space-y-1">
            <h2 id="security" className="font-semibold">
              {staticCode ? "Sign-in codes are fixed" : "Sign-in codes are emailed"}
            </h2>
            <p className="text-[15px] leading-relaxed text-muted">
              {staticCode
                ? "ADMIN_OTP_STATIC is set, so every sign-in accepts the same code and no email is sent. Your password is the only real secret: keep it long and unique. To send real codes, set MAIL_PROVIDER (and its key) and remove ADMIN_OTP_STATIC."
                : `Each sign-in sends a new 6-digit code to ${email} (mail provider: ${mailProvider}).`}
            </p>
          </div>
        </section>

        <section aria-labelledby="account" className="card p-5">
          <h2 id="account" className="font-semibold">
            Account
          </h2>
          <p className="mt-1 text-[15px] text-muted">
            Signed in as <span className="font-semibold text-fg">{email}</span>. To change the email, run{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-sm">npm run admin:create -- --set-email new@example.com</code> on the server.
          </p>
          <PasswordForm />
        </section>

        <section aria-labelledby="devices" className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
            <div>
              <h2 id="devices" className="font-semibold">
                Signed-in devices
              </h2>
              <p className="text-sm text-muted">Each sign-in is one device. Sign out any you don&apos;t recognise.</p>
            </div>
            <button type="button" className="btn btn-ghost py-2 text-sm" onClick={everywhere} disabled={busy !== null}>
              {busy === "all" ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />} Sign out everywhere
            </button>
          </div>
          {devicesError && <p className="px-5 pb-4 text-sm text-accent">{devicesError}</p>}
          {!devices && !devicesError && <p className="px-5 pb-5 text-sm text-muted">Loading…</p>}
          {devices && (
            <ul className="divide-y divide-line border-t border-line">
              {devices.map((d) => {
                const { name, phone } = deviceName(d.userAgent);
                const Icon = phone ? Smartphone : LaptopMinimal;
                const current = d.id === currentSessionId;
                return (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Icon className="size-5 shrink-0 text-faint" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-semibold">
                        {name}
                        {current && <span className="tag">This device</span>}
                      </div>
                      <div className="text-sm text-muted">
                        Signed in {when(d.createdAt)} · last active {when(d.updatedAt)}
                        {d.ipAddress ? ` · ${d.ipAddress}` : ""}
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost py-2 text-sm" onClick={() => revoke(d)} disabled={busy !== null} aria-label={`Sign out ${name}${current ? " (this device)" : ""}`}>
                      {busy === d.id ? <LoaderCircle className="size-4 animate-spin" /> : "Sign out"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function PasswordForm() {
  const ids = { current: useId(), next: useId(), again: useId(), err: useId() };
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [state, setState] = useState<{ status: "idle" | "saving" | "done" | "error"; message?: string }>({ status: "idle" });
  const [fieldErr, setFieldErr] = useState<string>();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (next.length < 12) return setFieldErr("Use at least 12 characters.");
    if (next !== again) return setFieldErr("The two new passwords differ.");
    setFieldErr(undefined);
    setState({ status: "saving" });
    const res = await getAuthClient().changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    if (res.error)
      return setState({
        status: "error",
        message: res.error.status === 429 ? "Too many attempts. Please wait a few minutes." : res.error.code === "INVALID_PASSWORD" ? "The current password isn't right." : "Couldn't change the password.",
      });
    setCurrent("");
    setNext("");
    setAgain("");
    setState({ status: "done", message: "Password changed. Every other device was signed out." });
  };

  return (
    <form onSubmit={submit} noValidate className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
        <KeyRound className="size-4 text-faint" aria-hidden="true" /> Change password
      </h3>
      <div className="sm:col-span-2">
        <label htmlFor={ids.current} className={label}>
          Current password
        </label>
        <input id={ids.current} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor={ids.next} className={label}>
          New password
        </label>
        <input id={ids.next} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} {...errProps(ids.err, fieldErr)} />
      </div>
      <div>
        <label htmlFor={ids.again} className={label}>
          New password again
        </label>
        <input id={ids.again} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={field} {...errProps(ids.err, fieldErr)} />
      </div>
      <div className="sm:col-span-2">
        <FieldError id={ids.err} message={fieldErr} />
        {state.status === "error" && <SendError message={state.message} />}
        {state.status === "done" && (
          <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-2" disabled={state.status === "saving" || !current || !next}>
          {state.status === "saving" && <LoaderCircle className="size-4 animate-spin" />} Change password
        </button>
      </div>
    </form>
  );
}
