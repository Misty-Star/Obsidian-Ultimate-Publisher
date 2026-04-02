import { requestUrl, RequestUrlParam } from "obsidian";
import { LlmSettings } from "../../../types";
import { LlmHttpError, LlmProviderAdapter, LlmTaskInput, LlmTaskResult } from "../types";

type RequestFn = (request: RequestUrlParam) => Promise<{ status: number; json?: unknown; text?: string }>;

export class AnthropicLlmProvider implements LlmProviderAdapter {
  readonly vendor = "anthropic" as const;

  constructor(private readonly request: RequestFn = requestUrl as never) {}

  async generate(settings: LlmSettings, input: LlmTaskInput): Promise<LlmTaskResult> {
    const response = await this.request({
      url: ((settings.endpointOverride || "https://api.anthropic.com/v1").replace(/\/+$/, "")) + "/messages",
      method: "POST",
      headers: {
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 300,
        temperature: settings.temperature,
        messages: [
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
      throw: false,
    });

    if (response.status >= 400) {
      throw new LlmHttpError(response.text ?? "Anthropic request failed", response.status);
    }

    const payload = (response.json ?? {}) as { content?: Array<{ type?: string; text?: string }> };
    const text = payload.content?.find((item) => item.type === "text" && item.text)?.text?.trim() ?? "";
    if (!text) {
      throw new Error("LLM returned no text.");
    }

    return { text, vendor: this.vendor, model: settings.model };
  }
}
