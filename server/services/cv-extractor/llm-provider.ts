import "server-only";
import { APICallError, generateText, Output } from "ai";
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

    const res = await generateText({
      model: openRouter()(modelId),
      system: options.system,
      prompt: options.prompt,
      output: Output.object({ schema: options.schema }),
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxTokens ?? 7000,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    return { output: res.output as T, providerUsed: `openrouter:${modelId}` };
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
