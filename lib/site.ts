// The public address of the site, for metadata, robots.txt and sitemap.xml. Set NEXT_PUBLIC_SITE_URL in
// production (next.config.ts warns when it's missing); locally it falls back to the dev server.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Absolute URL for a path on this site, e.g. absoluteUrl("/cv/"). */
export const absoluteUrl = (path: string) => `${siteUrl}${basePath}${path}`;
