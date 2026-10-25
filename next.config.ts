import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  poweredByHeader: false,
  serverExternalPackages: ["pg", "@sparticuz/chromium", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/*": [
      "./migrations/**/*.sql",
      "./public/Mekin-Jemal-CV.pdf",
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/pdfjs-dist/legacy/build/**/*",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/Mekin-Jemal-CV.pdf",
          destination: "/d/Mekin-Jemal-CV.pdf",
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
  async headers() {
    const longCache = (seconds: number) => [
      {
        key: "Cache-Control",
        value: `public, max-age=${seconds}, stale-while-revalidate=86400`,
      },
    ]
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          ...(process.env.ENABLE_HSTS === "1"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
      ...(isDev
        ? []
        : [
            { source: "/images/:path*", headers: longCache(604800) },
            { source: "/icon.svg", headers: longCache(86400) },
          ]),
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]
  },
}

export default function config(phase: string): NextConfig {
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    !process.env.NEXT_PUBLIC_SITE_URL &&
    !process.env.SITE_URL_WARNED
  ) {
    process.env.SITE_URL_WARNED = "1"
    console.warn(
      "[next.config] NEXT_PUBLIC_SITE_URL is not set; canonical URLs will use localhost.",
    )
  }
  return nextConfig
}
