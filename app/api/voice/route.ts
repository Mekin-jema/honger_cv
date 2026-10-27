import { bad, clientKey, limited, readJson, sameOrigin, str } from "@/server/http";
import { clientView } from "@/server/persona/compile";
import { personaForRequest } from "@/server/persona/resolve";
import { customerPersonaHasAiVoiceAccess } from "@/server/billing";

export const runtime = "nodejs";
export const maxDuration = 90;

type VoiceTurn = { question: string; answer: string };

function parserConfig(): { endpoint: URL; apiKey: string } {
  const baseUrl = process.env.RESUME_PARSER_API_URL?.trim();
  const apiKey = process.env.RESUME_PARSER_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new Error("Live voice chat needs RESUME_PARSER_API_URL and RESUME_PARSER_API_KEY configured on the server.");
  }

  let endpoint: URL;
  try {
    endpoint = new URL("/api/v1/voice/stream", baseUrl);
  } catch {
    throw new Error("RESUME_PARSER_API_URL must be a valid URL.");
  }
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost") {
    throw new Error("The Resume Parser API URL must use HTTPS.");
  }
  return { endpoint, apiKey };
}

function parseHistory(value: unknown): VoiceTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: VoiceTurn[] = [];
  for (const turn of value.slice(-6)) {
    if (!turn || typeof turn !== "object") continue;
    const record = turn as Record<string, unknown>;
    const question = str(record.question, 600);
    const answer = str(record.answer, 1_200);
    if (question && answer) turns.push({ question, answer });
  }
  return turns;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return bad("Cross-origin requests are not allowed.", 403);
  if (limited(`voice:${clientKey(request)}`, 20, 10 * 60_000)) {
    return bad("Too many voice questions. Please wait a few minutes and try again.", 429);
  }

  const body = await readJson(request, 12_000);
  if (!body) return bad("Invalid voice chat request.");
  const question = str(body.question, 600);
  if (!question || question.length < 2) return bad("Ask a question first.");

  const persona = await personaForRequest(request);
  const hasVoice = await customerPersonaHasAiVoiceAccess(persona.compiled.slug);
  if (!hasVoice) {
    return bad("AI voice interview is available exclusively on paid plans. Upgrade your plan to activate AI sound and voice.", 402);
  }

  let parser: { endpoint: URL; apiKey: string };
  try {
    parser = parserConfig();
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Live voice chat is not configured.", 503);
  }
  const context = JSON.stringify(clientView(persona.compiled, persona.tier, persona.lang));
  if (context.length > 40_000) {
    return bad("The published profile is too large for the live voice assistant.", 413);
  }

  let upstream: Response;
  try {
    upstream = await fetch(parser.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": parser.apiKey,
      },
      body: JSON.stringify({
        question,
        context,
        history: parseHistory(body.history),
      }),
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(85_000)]),
    });
  } catch (error) {
    console.error("[api/voice] Parser API request failed:", error instanceof Error ? error.message : error);
    return bad("Could not connect to the voice assistant. Please try again.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    console.error(`[api/voice] Parser API returned HTTP ${upstream.status}.`);
    return bad("The voice assistant is temporarily unavailable. Please try again.", upstream.status >= 500 ? 502 : upstream.status);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
