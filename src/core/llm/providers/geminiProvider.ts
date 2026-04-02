import { requestUrl, RequestUrlParam } from "obsidian";
import { LlmSettings } from "../../../types";
import { LlmHttpError, LlmProviderAdapter, LlmTaskInput, LlmTaskResult } from "../types";

type RequestFn = (request: RequestUrlParam) => Promise<{ status: number; json?: unknown; text?: string }>;

export class GeminiLlmProvider implements LlmProviderAdapter {
  readonly vendor = "gemini" as const;

  constructor(private readonly request: RequestFn = requestUrl as never) {}

  async generate(settings: LlmSettings, input: LlmTaskInput): Promise<LlmTaskResult> {
    const base = (settings.endpointOverride || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
    const response = await this.request({
      url: `${base}/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: settings.temperature,
        },
        contents: [
          {
            role: "user",
            parts: [{ text: JSON.stringify(input) }],
          },
        ],
      }),
      throw: false,
    });

    if (response.status >= 400) {
      throw new LlmHttpError(response.text ?? "Gemini request failed", response.status);
    }

    const payload = (response.json ?? {}) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
    if (!text) {
      throw new Error("LLM returned no text.");
    }

    return { text, vendor: this.vendor, model: settings.model };
  }
}
