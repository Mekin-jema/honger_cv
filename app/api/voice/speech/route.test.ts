import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/server/billing", () => ({
  customerPersonaHasAiVoiceAccess: vi.fn().mockImplementation(async (slug: string) => slug !== "unpaid-persona"),
}));

vi.mock("@/server/persona/resolve", () => ({
  personaForRequest: vi.fn().mockImplementation(async (req: Request) => {
    const slug = req.headers.get("x-test-slug") || "job";
    return {
      slug,
      compiled: { slug },
      tier: "public",
      lang: "en",
    };
  }),
}));

describe("POST /api/voice/speech", () => {
  it("rejects cross-origin requests", async () => {
    const request = new Request("http://localhost/api/voice/speech", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({ text: "Hello there." }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it("rejects malformed requests", async () => {
    const request = new Request("http://localhost/api/voice/speech", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
      },
      body: "{",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects requests for unpaid customer personas with 402", async () => {
    const request = new Request("http://localhost/api/voice/speech", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        "x-test-slug": "unpaid-persona",
      },
      body: JSON.stringify({ text: "Hello there." }),
    });

    const response = await POST(request);
    expect(response.status).toBe(402);
  });
});
