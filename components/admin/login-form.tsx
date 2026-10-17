"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { FieldError, SendError, errProps, field, label } from "@/components/blocks/forms";
import { ThemeToggle } from "@/components/theme-provider";
import { getAuthClient } from "@/lib/auth-client";
import { cn, withBase } from "@/lib/utils";

type Step = "password" | "code";
type Problem = { message: string; retryAfter?: number };

/** m•••@gmail.com */
const mask = (email: string) => {
  const [user, domain] = email.trim().split("@");
  return user && domain ? `${user.slice(0, 1)}•••@${domain}` : "your email";
};

const RESEND_SECONDS = 60;
const CODE_MINUTES = 5;

const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** A Better Auth error as a short, generic sentence (never says whether an email has an account). */
function explain(err: { status?: number; code?: string; message?: string } | null | undefined, retryAfter?: number): Problem {
  const code = err?.code ?? "";
  if (err?.status === 429 || code === "ACCOUNT_TEMPORARILY_LOCKED") {
    const wait = retryAfter && retryAfter > 0 ? ` Try again in ${mmss(Math.ceil(retryAfter))}.` : " Please wait a few minutes.";
    return { message: `Too many attempts.${wait}`, retryAfter };
  }
  // Specific codes first: a wrong sign-in code is also a 401.
  if (code === "INVALID_CODE") return { message: "That code isn't right. Check it and try again." };
  if (code === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE") return { message: "Too many wrong codes. Ask for a new code." };
  if (code === "OTP_HAS_EXPIRED") return { message: "This code has expired. Ask for a new one." };
  if (code === "INVALID_TWO_FACTOR_COOKIE") return { message: "Your sign-in timed out. Enter your password again." };
  if (code === "INVALID_EMAIL_OR_PASSWORD" || err?.status === 401) return { message: "Email or password is incorrect." };
  if (err?.status === 503) return { message: "Sign-in isn't available right now." };
  return { message: "Something went wrong. Please try again." };
}

export function LoginForm({ next, pendingCode, configured }: { next: string; pendingCode: boolean; configured: boolean }) {
  const [step, setStep] = useState<Step>(pendingCode ? "code" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(configured ? null : { message: "Sign-in isn't set up on this server yet." });
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string; code?: string }>({});
  const [resendAt, setResendAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const ids = { email: useId(), password: useId(), code: useId(), emailErr: useId(), passwordErr: useId(), codeErr: useId(), timer: useId() };

  // One clock for the countdowns (resend, code expiry, lockout).
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (step === "code") requestAnimationFrame(() => codeRef.current?.focus());
  }, [step]);

  const secondsLeft = (until: number) => Math.max(0, Math.ceil((until - now) / 1000));
  const blocked = secondsLeft(blockedUntil);

  const fail = (p: Problem) => {
    setProblem(p);
    if (p.retryAfter) setBlockedUntil(Date.now() + p.retryAfter * 1000);
  };
  const done = () => window.location.assign(withBase(next));

  async function sendCode() {
    let retryAfter: number | undefined;
    const res = await getAuthClient().twoFactor.sendOtp(
      { trustDevice: remember },
      { onError: (ctx) => void (retryAfter = Number(ctx.response.headers.get("x-retry-after")) || undefined) },
    );
    if (res.error) {
      // A code already went out moments ago: keep using that one.
      if (res.error.status === 429) {
        setResendAt(Date.now() + (retryAfter ?? RESEND_SECONDS) * 1000);
        return;
      }
      fail(explain(res.error));
      if (res.error.code === "INVALID_TWO_FACTOR_COOKIE" || res.error.status === 401) setStep("password");
      return;
    }
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
    setExpiresAt(Date.now() + CODE_MINUTES * 60_000);
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || blocked) return;
    const errs = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? undefined : "Enter your email address.",
      password: password ? undefined : "Enter your password.",
    };
    setFieldErr(errs);
    if (errs.email || errs.password) return;
    setBusy(true);
    setProblem(null);
    let retryAfter: number | undefined;
    try {
      const res = await getAuthClient().signIn.email(
        { email: email.trim(), password, rememberMe: true },
        { onError: (ctx) => void (retryAfter = Number(ctx.response.headers.get("x-retry-after")) || undefined) },
      );
      if (res.error) return fail(explain(res.error, retryAfter));
      const data = res.data as { twoFactorRedirect?: boolean } | null;
      // A remembered device skips the code.
      if (!data?.twoFactorRedirect) return done();
      setPassword("");
      setCode("");
      setStep("code");
      await sendCode();
    } catch {
      fail({ message: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || blocked) return;
    const value = code.replace(/\s+/g, "");
    if (!/^\d{4,10}$/.test(value)) return setFieldErr({ code: "Enter the code from the email." });
    setFieldErr({});
    setBusy(true);
    setProblem(null);
    let retryAfter: number | undefined;
    try {
      const res = await getAuthClient().twoFactor.verifyOtp(
        { code: value, trustDevice: remember },
        { onError: (ctx) => void (retryAfter = Number(ctx.response.headers.get("x-retry-after")) || undefined) },
      );
      if (res.error) {
        fail(explain(res.error, retryAfter));
        if (res.error.code === "INVALID_TWO_FACTOR_COOKIE") setStep("password");
        setCode("");
        codeRef.current?.focus();
        return;
      }
      done();
    } catch {
      fail({ message: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || secondsLeft(resendAt) > 0) return;
    setBusy(true);
    setProblem(null);
    try {
      await sendCode();
    } finally {
      setBusy(false);
      codeRef.current?.focus();
    }
  }

  const resendIn = secondsLeft(resendAt);
  const expiresIn = secondsLeft(expiresAt);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 md:p-8">
        <div className="flex items-center justify-between gap-2">
          <a href={withBase("/")} className="icon-btn" aria-label="Back to site">
            <ArrowLeft className="size-5" />
          </a>
          <span className="eyebrow">Private</span>
          <ThemeToggle />
        </div>

        {step === "password" ? (
          <form onSubmit={onPassword} noValidate aria-busy={busy} className="mt-6 space-y-4">
            <h1 className="display text-3xl">Sign in</h1>
            <div>
              <label htmlFor={ids.email} className={label}>
                Email
              </label>
              <input
                id={ids.email}
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(field, fieldErr.email && "border-accent")}
                {...errProps(ids.emailErr, fieldErr.email)}
              />
              <FieldError id={ids.emailErr} message={fieldErr.email} />
            </div>
            <div>
              <label htmlFor={ids.password} className={label}>
                Password
              </label>
              <div className="relative">
                <input
                  id={ids.password}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(field, "pr-12", fieldErr.password && "border-accent")}
                  {...errProps(ids.passwordErr, fieldErr.password)}
                />
                <button
                  type="button"
                  className="icon-btn absolute top-1/2 right-1 size-9 -translate-y-1/2"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FieldError id={ids.passwordErr} message={fieldErr.password} />
            </div>
            <label className="flex items-center gap-2.5 text-sm pointer-coarse:min-h-11">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              Remember this device for 30 days
            </label>
            {problem && <SendError message={blocked ? `${problem.message.replace(/ Try again in .*$/, "")} Try again in ${mmss(blocked)}.` : problem.message} />}
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={busy || !!blocked || !configured}>
              {busy ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Checking…
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={onCode} noValidate aria-busy={busy} className="mt-6 space-y-4">
            <h1 className="display text-3xl">Check your email</h1>
            <p className="text-[15px] leading-relaxed text-muted">
              We sent a 6-digit code to <strong className="font-semibold text-fg">{email ? mask(email) : "your email"}</strong>.{" "}
              <span id={ids.timer} aria-live="polite">
                {expiresIn > 0 ? `It expires in ${mmss(expiresIn)}.` : "It expires in a few minutes."}
              </span>
            </p>
            <div>
              <label htmlFor={ids.code} className={label}>
                Sign-in code
              </label>
              <input
                ref={codeRef}
                id={ids.code}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ""))}
                className={cn(field, "text-center font-mono text-2xl tracking-[0.4em]", fieldErr.code && "border-accent")}
                {...errProps(ids.codeErr, fieldErr.code)}
              />
              <FieldError id={ids.codeErr} message={fieldErr.code} />
            </div>
            {problem && <SendError message={blocked ? `${problem.message.replace(/ Try again in .*$/, "")} Try again in ${mmss(blocked)}.` : problem.message} />}
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={busy || !!blocked}>
              {busy ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Checking…
                </>
              ) : (
                "Verify"
              )}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" className="btn btn-ghost py-2 text-sm" onClick={resend} disabled={busy || resendIn > 0}>
                {resendIn > 0 ? `Resend in ${mmss(resendIn)}` : "Resend code"}
              </button>
              <button
                type="button"
                className="font-semibold text-muted underline-offset-4 hover:text-fg hover:underline pointer-coarse:min-h-11"
                onClick={() => {
                  setStep("password");
                  setProblem(null);
                  setCode("");
                }}
              >
                Use a different account
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
