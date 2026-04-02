import { requestUrl, RequestUrlParam } from "obsidian";
import { LlmSettings } from "../../../types";
import { LlmHttpError, LlmProviderAdapter, LlmTaskInput, LlmTaskResult } from "../types";

type RequestFn = (request: RequestUrlParam) => Promise<{ status: number; json?: unknown; text?: string }>;

function resolveBaseUrl(endpointOverride?: string): string {
  const base = (endpointOverride || "https://api.openai.com/v1").replace(/\/+$/, "");
  return `${base}/responses`;
}

export class OpenAiLlmProvider implements LlmProviderAdapter {
  readonly vendor = "openai" as const;

  constructor(private readonly request: RequestFn = requestUrl as never) {}

  async generate(settings: LlmSettings, input: LlmTaskInput): Promise<LlmTaskResult> {
    const response = await this.request({
      url: resolveBaseUrl(settings.endpointOverride),
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(input),
              },
            ],
          },
        ],
        temperature: settings.temperature,
      }),
      throw: false,
    });

    if (response.status >= 400) {
      throw new LlmHttpError(response.text ?? "OpenAI request failed", response.status);
    }

    const payload = (response.json ?? {}) as { output_text?: string };
    const text = typeof payload.output_text === "string" ? payload.output_text.trim() : "";
    if (!text) {
      throw new Error("LLM returned no text.");
    }

    return {
      text,
      vendor: this.vendor,
      model: settings.model,
    };
  }
}
