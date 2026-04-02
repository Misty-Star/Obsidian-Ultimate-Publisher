import { requestUrl, RequestUrlParam } from "obsidian";
import { LlmSettings } from "../../types";
import { AnthropicLlmProvider } from "./providers/anthropicProvider";
import { GeminiLlmProvider } from "./providers/geminiProvider";
import { OpenAiLlmProvider } from "./providers/openaiProvider";
import { LlmHttpError, LlmTaskInput, LlmTaskResult } from "./types";

type RequestFn = (request: RequestUrlParam) => Promise<{ status: number; json?: unknown; text?: string }>;

function clampInputMarkdown(input: LlmTaskInput, maxInputChars: number): LlmTaskInput {
  if (!Number.isFinite(maxInputChars) || maxInputChars <= 0) {
    return input;
  }

  const limit = Math.floor(maxInputChars);
  if (input.note.markdown.length <= limit) {
    return input;
  }

  return {
    ...input,
    note: {
      ...input.note,
      markdown: input.note.markdown.slice(0, limit),
    },
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("LLM request timed out."));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function mapLlmError(error: unknown): Error {
  if (error instanceof LlmHttpError) {
    if (error.status === 401 || error.status === 403) {
      return new Error("LLM credentials were rejected. Check API key and endpoint settings.");
    }
    if (error.status === 429) {
      return new Error("LLM request was rate-limited. Please retry later.");
    }
    if (error.status && error.status >= 500) {
      return new Error("LLM service is temporarily unavailable.");
    }
  }

  return error instanceof Error ? error : new Error(String(error));
}

export class LlmService {
  private readonly openai: OpenAiLlmProvider;
  private readonly anthropic: AnthropicLlmProvider;
  private readonly gemini: GeminiLlmProvider;

  constructor(request: RequestFn = requestUrl as never) {
    this.openai = new OpenAiLlmProvider(request);
    this.anthropic = new AnthropicLlmProvider(request);
    this.gemini = new GeminiLlmProvider(request);
  }

  async generate(settings: LlmSettings, input: LlmTaskInput): Promise<LlmTaskResult> {
    const preparedInput = clampInputMarkdown(input, settings.maxInputChars);

    try {
      switch (settings.vendor) {
        case "anthropic":
          return await withTimeout(this.anthropic.generate(settings, preparedInput), settings.timeoutMs);
        case "gemini":
          return await withTimeout(this.gemini.generate(settings, preparedInput), settings.timeoutMs);
        case "openai":
        default:
          return await withTimeout(this.openai.generate(settings, preparedInput), settings.timeoutMs);
      }
    } catch (error) {
      throw mapLlmError(error);
    }
  }
}
