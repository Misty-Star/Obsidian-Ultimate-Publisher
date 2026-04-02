import { requestUrl, RequestUrlParam } from "obsidian";
import { LlmSettings } from "../../../types";
import { LlmHttpError, LlmProviderAdapter, LlmTaskInput, LlmTaskResult } from "../types";

type RequestFn = (request: RequestUrlParam) => Promise<{ status: number; json?: unknown; text?: string }>;

function resolveChatCompletionsUrl(endpointOverride?: string): string {
  const base = (endpointOverride || "https://api.openai.com/v1/chat/completions").replace(/\/+$/, "");
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
}

function extractChatCompletionText(payload: unknown): string {
  const chatPayload = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
        reasoning_content?: string;
      };
    }>;
  };

  const content = chatPayload.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  const reasoningContent = chatPayload.choices?.[0]?.message?.reasoning_content;
  if (typeof reasoningContent === "string" && reasoningContent.trim()) {
    throw new Error("LLM returned reasoning content only. Disable thinking for this model or switch to a non-reasoning model.");
  }
  return "";
}

export class OpenAiCompatibleLlmProvider implements LlmProviderAdapter {
  readonly vendor = "openai-compatible" as const;

  constructor(private readonly request: RequestFn = requestUrl as never) {}

  async generate(settings: LlmSettings, input: LlmTaskInput): Promise<LlmTaskResult> {
    const response = await this.request({
      url: resolveChatCompletionsUrl(settings.endpointOverride),
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
        temperature: settings.temperature,
        enable_thinking: false,
      }),
      throw: false,
    });

    if (response.status >= 400) {
      throw new LlmHttpError(response.text ?? "OpenAI-compatible request failed", response.status);
    }

    const text = extractChatCompletionText(response.json ?? {});
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
