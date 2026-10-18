"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { safeAccountNext } from "@/lib/account-next";
import { withBase } from "@/lib/utils";

type SocialProvider = "google" | "github";
type Props = {
  mode: "login" | "register";
  next?: string;
  adminNext?: string;
  pendingAdminVerification?: boolean;
  socialProviders?: SocialProvider[];
  socialError?: string;
};

export function AccountAuthForm({
  mode,
  next = "/account/",
  adminNext = "/admin/",
  pendingAdminVerification = false,
  socialProviders = [],
  socialError,
}: Props) {
  const isRegister = mode === "register";
  const redirectTo = safeAccountNext(next);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(pendingAdminVerification);
  const [verificationCode, setVerificationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const authPage = mode === "register" ? "/register/" : "/login/";

  const sendVerificationCode = async () => {
    const sent = await getAuthClient().twoFactor.sendOtp({ trustDevice: false });
    if (sent.error) setError("Couldn't send the verification code. Please try again.");
    else setError(undefined);
  };

  const signInSocial = async (provider: SocialProvider) => {
    if (busy) return;
    setBusy(true);
    setError(undefined);

    try {
      const result = await getAuthClient().signIn.social({
        provider,
        callbackURL: withBase(redirectTo),
        errorCallbackURL: withBase(`${authPage}?next=${encodeURIComponent(redirectTo)}`),
      });
      if (result.error) setError("Couldn't start social sign-in. Please try again or use your email and password.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);

    try {
      const auth = getAuthClient();
      if (verificationRequired) {
        const code = verificationCode.replace(/\s+/g, "");
        if (!/^\d{4,10}$/.test(code)) {
          setError("Enter the verification code from your email.");
          return;
        }
        const verified = await auth.twoFactor.verifyOtp({ code, trustDevice: false });
        if (verified.error) {
          setError("That code couldn't be verified. Check it and try again.");
          setVerificationCode("");
          return;
        }
        window.location.assign(withBase(adminNext));
        return;
      }

      if (isRegister) {
        const created = await auth.signUp.email({ name: name.trim(), email: email.trim(), password });
        if (created.error) {
          setError("We couldn't create your account. Check the details or try signing in.");
          return;
        }
      }

      const signedIn = await auth.signIn.email({ email: email.trim(), password, rememberMe: true });
      if (signedIn.error) {
        setError(isRegister ? "Your account was created, but sign-in failed. Please sign in." : "Email or password is incorrect.");
        return;
      }

      const data = signedIn.data as { twoFactorRedirect?: boolean; user?: { role?: string } } | null;
      if (data?.twoFactorRedirect) {
        setVerificationRequired(true);
        setPassword("");
        await sendVerificationCode();
        return;
      }
      if (data?.user?.role === "admin") {
        window.location.assign(withBase(adminNext));
        return;
      }
      window.location.assign(withBase(redirectTo));
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {isRegister && !verificationRequired && (
        <label className="block space-y-2 text-sm font-medium">
          Full name
          <input
            autoComplete="name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-line-strong bg-card px-4 py-3 text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
      )}
      {verificationRequired ? (
        <>
          <p className="text-sm leading-6 text-muted">Enter the administrator verification code to finish signing in.</p>
          <label className="block space-y-2 text-sm font-medium">
            Verification code
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              minLength={4}
              maxLength={10}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              className="w-full rounded-xl border border-line-strong bg-card px-4 py-3 text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <button
            type="button"
            onClick={() => void sendVerificationCode()}
            className="text-sm font-semibold text-fg underline-offset-4 hover:underline"
          >
            Resend code
          </button>
        </>
      ) : (
        <>
          <label className="block space-y-2 text-sm font-medium">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-line-strong bg-card px-4 py-3 text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Password
            <input
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-line-strong bg-card px-4 py-3 text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {isRegister && <span className="block text-xs font-normal text-muted">Use at least 12 characters.</span>}
          </label>
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">{error}</p>}
      {socialError && !error && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
        {socialError === "account_not_linked"
          ? "This email is already registered. Sign in with your existing method or use a verified email with this provider."
          : "Social sign-in didn&apos;t complete. Please try again or use your email and password."}
      </p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-on-accent transition hover:brightness-105 disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <>{verificationRequired ? "Verify and continue" : isRegister ? "Create account" : "Sign in"} <ArrowRight className="size-4" /></>}
      </button>
      {!verificationRequired && (
        <>
          <div role="separator" aria-label="Or continue with" className="flex items-center gap-3 text-xs text-muted">
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
            <span>Or continue with</span>
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy || !socialProviders.includes("google")}
              onClick={() => void signInSocial("google")}
              title={socialProviders.includes("google") ? undefined : "Configure Google OAuth credentials to enable sign-in"}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-card px-5 text-base font-semibold text-fg transition hover:bg-bg disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-bg-soft disabled:text-fg"
            >
              <GoogleIcon className="size-5 shrink-0" />
              Continue with Google
            </button>
            <button
              type="button"
              disabled={busy || !socialProviders.includes("github")}
              onClick={() => void signInSocial("github")}
              title={socialProviders.includes("github") ? undefined : "Configure GitHub OAuth credentials to enable sign-in"}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-card px-5 text-base font-semibold text-fg transition hover:bg-bg disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-bg-soft disabled:text-fg"
            >
              <GitHubIcon className="size-5 shrink-0" />
              Continue with GitHub
            </button>
          </div>
          {socialProviders.length === 0 && (
            <p className="text-center text-xs text-muted">Social sign-in is not configured yet.</p>
          )}
        </>
      )}
      {!verificationRequired && <p className="text-center text-sm text-muted">
        {isRegister ? "Already have an account? " : "New to Honger CV? "}
        <Link href={`${isRegister ? "/login/" : "/register/"}?next=${encodeURIComponent(redirectTo)}`} className="font-semibold text-fg underline-offset-4 hover:underline">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>}
    </form>
  );
}

function GoogleIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.57-5.17 3.57-8.64Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.93l-3.87-3c-1.08.72-2.46 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.27a12 12 0 0 0 0 10.72l4-3.09Z" />
      <path fill="#EA4335" d="M12 4.78c1.77 0 3.36.61 4.61 1.82l3.45-3.45C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.27 6.64l4 3.09c.95-2.84 3.6-4.95 6.73-4.95Z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-current`}>
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.7 2.61 1.21 3.25.92.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.65 10.65 0 0 1 5.57 0c2.13-1.45 3.06-1.15 3.06-1.15.61 1.54.23 2.68.12 2.96.71.78 1.14 1.78 1.14 3.01 0 4.29-2.61 5.23-5.1 5.5.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}
