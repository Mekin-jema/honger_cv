import { describe, expect, it } from "vitest";
import { POST } from "./route";

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
});
