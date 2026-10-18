import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? `?next=${encodeURIComponent(sp.next)}` : "";
  redirect(`/login/${next}`);
}
