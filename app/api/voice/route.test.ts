import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/voice", () => {
  it("rejects cross-origin requests", async () => {
    const request = new Request("http://localhost/api/voice", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({ question: "Tell me about your work." }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it("rejects malformed JSON requests", async () => {
    const request = new Request("http://localhost/api/voice", {
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
