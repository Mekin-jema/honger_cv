import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";

// The link preview for every page (served at /og.png): name and role only, in the site's light palette.
// A route handler instead of the opengraph-image file convention: that one is served at
// /opengraph-image, which trailingSlash 308-redirects; a path with an extension is not redirected.
// layout.tsx points openGraph.images and twitter.images here.
export const dynamic = "force-static";

const size = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#f6f4ef",
          color: "#1f1d1a",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            background: "#b5400f",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 700,
            marginBottom: 48,
          }}
        >
          {profile.initials}
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{profile.name}</div>
        <div style={{ fontSize: 44, marginTop: 20, color: "#b5400f" }}>{profile.role}</div>
      </div>
    ),
    size,
  );
}
