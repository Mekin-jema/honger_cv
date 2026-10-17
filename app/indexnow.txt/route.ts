// IndexNow key file (Bing, Yandex, Seznam...). `npm run seo:indexnow` pings with keyLocation pointing here.
// The key is public by design; it only proves the pings come from the site owner. 404 when unset.
export const dynamic = "force-dynamic";

export function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
