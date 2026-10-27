import { generateSpeech } from "ai";
import { bad, clientKey, limited, readJson, sameOrigin, str } from "@/server/http";
import { google } from "@/server/brain/model";
import { personaForRequest } from "@/server/persona/resolve";
import { customerPersonaHasAiVoiceAccess } from "@/server/billing";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return bad("Cross-origin requests are not allowed.", 403);
  if (limited(`voice-audio:${clientKey(request)}`, 20, 10 * 60_000)) {
    return bad("Too many voice requests. Please wait a few minutes and try again.", 429);
  }

  const body = await readJson(request, 5_000);
  if (!body) return bad("Invalid speech request.");
  const text = str(body.text, 4_000);
  if (!text || text.length < 2) return bad("Speech text is required.");

  const persona = await personaForRequest(request);
  const hasVoice = await customerPersonaHasAiVoiceAccess(persona.compiled.slug);
  if (!hasVoice) {
    return bad("AI voice audio is available exclusively on paid plans. Upgrade your plan to activate AI sound.", 402);
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return bad("Spoken audio is unavailable because Gemini is not configured.", 503);
  }

  try {
    const result = await generateSpeech({
      model: google().speech("gemini-3.8-flash-lite-tts"),
      text,
      voice: "Kore",
    });
    return new Response(Buffer.from(result.audio.uint8Array), {
      headers: {
        "Content-Type": result.audio.mediaType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "[api/voice/speech] Audio generation failed:",
      error instanceof Error ? error.message : error,
    );
    return bad("Could not generate spoken audio. Please try again.", 502);
  }
}
