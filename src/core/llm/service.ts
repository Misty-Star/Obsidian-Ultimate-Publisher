import { requestUrl, RequestUrlParam } from "obsidian";
import { LlmSettings } from "../../types";
import { AnthropicLlmProvider } from "./providers/anthropicProvider";
import { GeminiLlmProvider } from "./providers/geminiProvider";
import { OpenAiLlmProvider } from "./providers/openaiProvider";
import { LlmHttpError, LlmTaskInput, LlmTaskResult } from "./types";

type RequestFn = (request: RequestUrlParam) => Promise<{ status: number; json?: unknown; text?: string }>;

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
    try {
      switch (settings.vendor) {
        case "anthropic":
          return await this.anthropic.generate(settings, input);
        case "gemini":
          return await this.gemini.generate(settings, input);
        case "openai":
        default:
          return await this.openai.generate(settings, input);
      }
    } catch (error) {
      throw mapLlmError(error);
    }
  }
}
