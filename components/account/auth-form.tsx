"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { safeAccountNext } from "@/lib/account-next";
import { withBase } from "@/lib/utils";

type Props = { mode: "login" | "register"; next?: string; adminNext?: string; pendingAdminVerification?: boolean };

export function AccountAuthForm({
  mode,
  next = "/account/",
  adminNext = "/admin/",
  pendingAdminVerification = false,
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

  const sendVerificationCode = async () => {
    const sent = await getAuthClient().twoFactor.sendOtp({ trustDevice: false });
    if (sent.error) setError("Couldn't send the verification code. Please try again.");
    else setError(undefined);
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
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-on-accent transition hover:brightness-105 disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <>{verificationRequired ? "Verify and continue" : isRegister ? "Create account" : "Sign in"} <ArrowRight className="size-4" /></>}
      </button>
      {!verificationRequired && <p className="text-center text-sm text-muted">
        {isRegister ? "Already have an account? " : "New to Honger CV? "}
        <Link href={`${isRegister ? "/login/" : "/register/"}?next=${encodeURIComponent(redirectTo)}`} className="font-semibold text-fg underline-offset-4 hover:underline">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>}
    </form>
  );
}
