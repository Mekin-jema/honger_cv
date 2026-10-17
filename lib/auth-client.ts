"use client";

import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { withBase } from "./utils";

/** The admin login's browser client (sign in, two-factor code, sign out, sessions, password). */
function make() {
  return createAuthClient({
    baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
    basePath: withBase("/api/auth"),
    plugins: [twoFactorClient()],
  });
}

let client: ReturnType<typeof make> | undefined;
/** Created on first use in the browser (never while rendering on the server). */
export const getAuthClient = () => (client ??= make());
