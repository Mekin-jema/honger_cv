import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { projectById, projects } from "@/content/projects";

// One link-preview image per project, served at /og/<project-id>.png (the extension skips the
// trailingSlash redirect). Generated at build time in the site's light palette.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ file: `${p.id}.png` }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const p = projectById(file.replace(/\.png$/, ""));
  if (!p) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "80px 96px", background: "#f6f4ef", color: "#1f1d1a" }}>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: "#6b665d" }}>
          {`${p.kind} · ${p.year}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{p.name}</div>
          <div style={{ fontSize: 36, marginTop: 24, lineHeight: 1.3, color: "#57524a", maxWidth: 980 }}>{p.tagline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 32 }}>
          <div style={{ display: "flex", width: 56, height: 56, borderRadius: 16, background: "#b5400f", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, marginRight: 20 }}>
            {profile.initials}
          </div>
          <div style={{ display: "flex" }}>{`${profile.name} · ${profile.role}`}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
