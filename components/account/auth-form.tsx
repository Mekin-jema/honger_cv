"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { safeAccountNext } from "@/lib/account-next";
import { withBase } from "@/lib/utils";

type Props = { mode: "login" | "register"; next?: string };

export function AccountAuthForm({ mode, next = "/account/" }: Props) {
  const isRegister = mode === "register";
  const redirectTo = safeAccountNext(next);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);

    try {
      const auth = getAuthClient();
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
      if (data?.twoFactorRedirect || data?.user?.role === "admin") {
        window.location.assign(withBase("/admin/login/"));
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
      {isRegister && (
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
      {error && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-on-accent transition hover:brightness-105 disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <>{isRegister ? "Create account" : "Sign in"} <ArrowRight className="size-4" /></>}
      </button>
      <p className="text-center text-sm text-muted">
        {isRegister ? "Already have an account? " : "New to Honger CV? "}
        <Link href={`${isRegister ? "/login/" : "/register/"}?next=${encodeURIComponent(redirectTo)}`} className="font-semibold text-fg underline-offset-4 hover:underline">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
