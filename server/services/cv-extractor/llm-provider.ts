import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import {
  aiEnabled,
  chatModelId,
  fallbackModelId,
  google,
  ollamaBaseUrl,
  ollamaCvModelId,
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
  generateStructured<T>(options: LLMProviderOptions, modelId?: string): Promise<{ output: T; providerUsed: string }>;
}

export type CvModelProviderName = "ollama" | "openrouter" | "google";

export interface CvModelRef {
  provider: CvModelProviderName;
  model: string;
}

const CV_MODEL_PROVIDERS = new Set<CvModelProviderName>(["ollama", "openrouter", "google"]);

export function cvExtractionModelChain(
  env: Readonly<Record<string, string | undefined>> = process.env,
): CvModelRef[] {
  const configured = env.CV_EXTRACTION_MODELS?.trim();
  if (configured) {
    return configured.split(",").map((entry) => {
      const separator = entry.indexOf("/");
      const provider = entry.slice(0, separator).trim();
      const model = entry.slice(separator + 1).trim();
      if (separator < 1 || !model || !CV_MODEL_PROVIDERS.has(provider as CvModelProviderName)) {
        throw new Error(
          `Invalid CV_EXTRACTION_MODELS entry '${entry.trim()}'. Expected provider/model where provider is ollama, openrouter, or google.`,
        );
      }
      return { provider: provider as CvModelProviderName, model };
    });
  }

  const chain: CvModelRef[] = [];
  if (env.NODE_ENV !== "production") {
    chain.push({ provider: "ollama", model: env.OLLAMA_CV_MODEL?.trim() || "llama3.2" });
  }
  if (env.OPENROUTER_API_KEY?.trim()) {
    chain.push({
      provider: "openrouter",
      model: env.OPENROUTER_CV_MODEL?.trim() || "mistralai/mistral-small-24b-instruct-2501",
    });
  }
  if (env.GEMINI_API_KEY?.trim()) {
    chain.push({
      provider: "google",
      model:
        env.AI_FALLBACK_MODEL?.trim() ||
        env.GEMINI_FALLBACK_MODEL?.trim() ||
        "gemini-3.5-flash-lite",
    });
  }
  return chain;
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

  public async generateStructured<T>(options: LLMProviderOptions, modelId?: string): Promise<{ output: T; providerUsed: string }> {
    const primary = modelId || fallbackModelId() || chatModelId();
    const fallback = modelId ? "" : chatModelId();
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

  public async generateStructured<T>(options: LLMProviderOptions, configuredModelId?: string): Promise<{ output: T; providerUsed: string }> {
    const modelId = configuredModelId || openRouterCvModelId();
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

export class OllamaProvider implements LLMProvider {
  public readonly name = "ollama";

  public isAvailable(): boolean {
    return true;
  }

  public async generateStructured<T>(
    options: LLMProviderOptions,
    modelId = ollamaCvModelId(),
  ): Promise<{ output: T; providerUsed: string }> {
    const baseUrl = ollamaBaseUrl();
    const endpoint = new URL(
      "chat/completions",
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    );
    const apiKey = process.env.OLLAMA_API_KEY?.trim();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.prompt },
        ],
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 7000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "structured_cv",
            strict: true,
            schema: z.toJSONSchema(options.schema),
          },
        },
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 55_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Ollama CV extraction failed with HTTP ${response.status}: ${detail}`);
    }

    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("choices" in payload) ||
      !Array.isArray(payload.choices) ||
      !payload.choices[0] ||
      typeof payload.choices[0] !== "object" ||
      !("message" in payload.choices[0]) ||
      !payload.choices[0].message ||
      typeof payload.choices[0].message !== "object" ||
      !("content" in payload.choices[0].message) ||
      typeof payload.choices[0].message.content !== "string"
    ) {
      throw new Error("Ollama returned an invalid structured CV response.");
    }

    const output: unknown = JSON.parse(payload.choices[0].message.content);
    return { output: output as T, providerUsed: `ollama:${modelId}` };
  }
}

/** Uses an ordered provider chain, preferring local Ollama during development. */
export class CompositeLLMProvider implements LLMProvider {
  public readonly name = "composite";
  private readonly providers: Record<CvModelProviderName, LLMProvider>;

  constructor(providers?: Record<CvModelProviderName, LLMProvider>) {
    this.providers = providers ?? {
      ollama: new OllamaProvider(),
      openrouter: new OpenRouterProvider(),
      google: new GoogleGeminiProvider(),
    };
  }

  public isAvailable(): boolean {
    return cvExtractionModelChain().some((ref) => this.providers[ref.provider].isAvailable());
  }

  public async generateStructured<T>(options: LLMProviderOptions): Promise<{ output: T; providerUsed: string }> {
    let lastError: unknown;
    const chain = cvExtractionModelChain();
    for (const ref of chain) {
      const provider = this.providers[ref.provider];
      if (!provider.isAvailable()) continue;
      try {
        return await provider.generateStructured<T>(options, ref.model);
      } catch (error) {
        lastError = error;
        console.warn("[CvExtraction] Provider failed; trying the next configured model.", {
          provider: ref.provider,
          model: ref.model,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    if (lastError) throw lastError;
    throw new Error(
      "No CV extraction provider is configured. Set CV_EXTRACTION_MODELS or configure Ollama, OpenRouter, or Gemini.",
    );
  }
}

export const defaultLLMProvider = new CompositeLLMProvider();
