import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import {
  aiEnabled,
  chatModelId,
  fallbackModelId,
  google,
  openRouter,
  openRouterCvModelId,
} from "@/server/brain/model";

export interface LLMProviderOptions {
  system: string;
  prompt: string;
  schema: z.ZodType<unknown>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LLMProvider {
  name: string;
  isAvailable(): boolean;
  generateStructured<T>(options: LLMProviderOptions): Promise<{ output: T; providerUsed: string }>;
}

export function affordableOutputTokenLimit(error: unknown, requested: number): number | undefined {
  if (!(error instanceof Error)) return undefined;
  const match = error.message.match(/can only afford\s+([\d,]+)/i);
  if (!match) return undefined;
  const affordable = Number(match[1].replaceAll(",", ""));
  if (!Number.isFinite(affordable) || affordable >= requested) return undefined;
  const reduced = Math.min(requested - 1, Math.floor(affordable * 0.9));
  return reduced >= 512 ? reduced : undefined;
}

export function isOpenRouterInFlightCreditError(error: unknown): boolean {
  return error instanceof Error &&
    /available credits/i.test(error.message) &&
    /in[- ]flight requests/i.test(error.message);
}

export class GoogleGeminiProvider implements LLMProvider {
  public readonly name = "google-gemini";

  public isAvailable(): boolean {
    return aiEnabled();
  }

  public async generateStructured<T>(options: LLMProviderOptions): Promise<{ output: T; providerUsed: string }> {
    const primary = fallbackModelId() || chatModelId();
    const fallback = chatModelId();
    const timeoutMs = options.timeoutMs ?? 55_000;

    const run = async (modelId: string, thinkingOff: boolean) =>
      generateText({
        model: google()(modelId),
        system: options.system,
        prompt: options.prompt,
        output: Output.object({ schema: options.schema }),
        temperature: options.temperature ?? 0.1,
        maxOutputTokens: options.maxTokens ?? 7000,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(timeoutMs),
        providerOptions: thinkingOff ? { google: { thinkingConfig: { thinkingBudget: 0 } } } : undefined,
      });

    try {
      const res = await run(primary, true).catch(async (err) => {
        if (APICallError.isInstance(err) && err.statusCode === 400) {
          return run(primary, false);
        }
        throw err;
      });
      return { output: res.output as T, providerUsed: `google:${primary}` };
    } catch (primaryErr) {
      if (
        !fallback ||
        fallback === primary ||
        (APICallError.isInstance(primaryErr) && (primaryErr.statusCode === 401 || primaryErr.statusCode === 403))
      ) {
        throw primaryErr;
      }
      const res = await run(fallback, false);
      return { output: res.output as T, providerUsed: `google:${fallback}` };
    }
  }
}

export class OpenRouterProvider implements LLMProvider {
  public readonly name = "openrouter";

  public isAvailable(): boolean {
    return !!process.env.OPENROUTER_API_KEY?.trim();
  }

  public async generateStructured<T>(options: LLMProviderOptions): Promise<{ output: T; providerUsed: string }> {
    const modelId = openRouterCvModelId();
    const timeoutMs = options.timeoutMs ?? 55_000;
    let maxOutputTokens = options.maxTokens ?? 7000;
    let prompt = options.prompt;
    let temperature = options.temperature ?? 0.1;

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const res = await generateText({
          model: openRouter()(modelId),
          system: options.system,
          prompt,
          output: Output.object({ schema: options.schema }),
          temperature,
          maxOutputTokens,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(timeoutMs),
        });

        return { output: res.output as T, providerUsed: `openrouter:${modelId}` };
      } catch (error) {
        if (attempt >= 2) throw error;
        const reducedLimit = affordableOutputTokenLimit(error, maxOutputTokens);
        if (reducedLimit !== undefined) {
          maxOutputTokens = reducedLimit;
          continue;
        }
        if (isOpenRouterInFlightCreditError(error)) {
          await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
          continue;
        }
        if (NoObjectGeneratedError.isInstance(error)) {
          if (attempt === 0) {
            prompt = `${options.prompt}\n\nFormatting retry: return the same schema as compact JSON. Group related skills under their CV headings, limit each role to three representative bullets, keep project descriptions to one concise sentence, and omit references and duplicate URLs. Preserve every role, project, education item, certification, and language.`;
            temperature = 0;
            continue;
          }
          console.warn("[OpenRouter] CV structured output could not be parsed", {
            finishReason: error.finishReason,
            outputLength: error.text?.length,
            causeName: error.cause instanceof Error ? error.cause.name : undefined,
          });
        }
        throw error;
      }
    }

    throw new Error("OpenRouter could not reserve enough output tokens for CV extraction.");
  }
}

/** Uses OpenRouter whenever configured; Gemini is used only when OpenRouter is not configured. */
export class CompositeLLMProvider implements LLMProvider {
  public readonly name = "composite";
  private readonly openRouterProvider = new OpenRouterProvider();
  private readonly geminiProvider = new GoogleGeminiProvider();

  public isAvailable(): boolean {
    return this.openRouterProvider.isAvailable() || this.geminiProvider.isAvailable();
  }

  public async generateStructured<T>(options: LLMProviderOptions): Promise<{ output: T; providerUsed: string }> {
    if (this.openRouterProvider.isAvailable()) {
      return this.openRouterProvider.generateStructured<T>(options);
    }

    if (this.geminiProvider.isAvailable()) {
      return await this.geminiProvider.generateStructured<T>(options);
    }

    throw new Error("No AI provider is configured. Please set GEMINI_API_KEY or OPENROUTER_API_KEY.");
  }
}

export const defaultLLMProvider = new CompositeLLMProvider();
