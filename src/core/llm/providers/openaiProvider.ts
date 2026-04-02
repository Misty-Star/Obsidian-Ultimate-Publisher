import { requestUrl, RequestUrlParam } from "obsidian";
import { LlmSettings } from "../../../types";
import { LlmHttpError, LlmProviderAdapter, LlmTaskInput, LlmTaskResult } from "../types";

type RequestFn = (request: RequestUrlParam) => Promise<{ status: number; json?: unknown; text?: string }>;

function resolveBaseUrl(endpointOverride?: string): string {
  const base = (endpointOverride || "https://api.openai.com/v1").replace(/\/+$/, "");
  return `${base}/responses`;
}

function extractResponsesText(payload: unknown): string {
  const responsePayload = payload as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof responsePayload.output_text === "string" && responsePayload.output_text.trim()) {
    return responsePayload.output_text.trim();
  }

  return (
    responsePayload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text ?? "")
      .join("")
      .trim() ?? ""
  );
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

    const text = extractResponsesText(response.json ?? {});
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
