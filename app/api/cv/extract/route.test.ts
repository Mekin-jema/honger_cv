import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("CV extraction route", () => {
  it("falls back to the existing parser endpoint when /extract is not deployed", async () => {
    vi.stubEnv("RESUME_PARSER_API_URL", "http://localhost:8000");
    vi.stubEnv("RESUME_PARSER_API_KEY", "test-parser-key");
    vi.stubEnv("NODE_ENV", "development");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response('{"detail":"Not Found"}', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          personal_info: { name: "Daniel Bekele", label: "Senior Software Engineer" },
          experience: [{ company: "Example Corp", title: "Engineer", start_date: "2024" }],
          skills: [{ skill: "TypeScript", category: "Languages" }],
        },
        metadata: {
          processing_time_ms: 1200,
          usage: [{ step: "parse", model: "llama3.2", input_tokens: 100, output_tokens: 50 }],
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const request = new Request("http://localhost:3000/api/cv/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: "# Daniel Bekele", filename: "cv2.md" }),
    });
    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data.identity.name).toBe("Daniel Bekele");
    expect(result.data.title).toBe("Senior Software Engineer");
    expect(result.data.experience[0].company).toBe("Example Corp");
    expect(result.data.skills).toEqual([{ k: "Languages", v: "TypeScript" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBeInstanceOf(URL);
    expect((fetchMock.mock.calls[0][0] as URL).pathname).toBe("/api/v1/extract");
    const extractRequest = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(extractRequest).toMatchObject({
      markdown: "# Daniel Bekele",
      filename: "cv2.md",
      parse_models: "openai_compatible/llama3.2",
    });
    expect(fetchMock.mock.calls[1][0]).toBeInstanceOf(URL);
    expect((fetchMock.mock.calls[1][0] as URL).pathname).toBe("/api/v1/parse");

    const fallbackRequest = fetchMock.mock.calls[1][1];
    expect(fallbackRequest?.headers).toMatchObject({ "X-API-Key": "test-parser-key" });
    const form = fallbackRequest?.body as FormData;
    expect(form.get("file")).toBeInstanceOf(Blob);
    expect(JSON.parse(String(form.get("options")))).toEqual({
      parse_models: "openai_compatible/llama3.2",
      ocr: "skip",
    });
  });
});
