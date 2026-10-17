// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver...) that pages changed.
// Usage, after a deploy: SITE_URL=https://your-domain INDEXNOW_KEY=<key> npm run seo:indexnow
// The key must also be set in the server env so https://your-domain/indexnow.txt serves it.
const site = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const key = process.env.INDEXNOW_KEY;
if (!site.startsWith("https://") || !key) {
  console.error("Set SITE_URL (https://...) and INDEXNOW_KEY.");
  process.exit(1);
}

const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(site));
if (!urlList.length) {
  console.error("No URLs found in the sitemap.");
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/indexnow.txt`, urlList }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URLs`);
if (!res.ok && res.status !== 202) process.exit(1);
