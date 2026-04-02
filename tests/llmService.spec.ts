import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LLM_SETTINGS } from "../src/settings";
import { LlmService } from "../src/core/llm/service";

const baseInput = {
  task: "generate_excerpt" as const,
  note: {
    title: "Post",
    markdown: "# Post\n\nHello world",
    excerpt: "Hello world",
    frontmatter: {},
  },
  target: {
    provider: "wordpress" as const,
    name: "WordPress",
  },
  currentValue: "",
};

it("posts OpenAI requests to the responses endpoint with endpointOverride", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    json: {
      output_text: "Short excerpt",
    },
  });
  const service = new LlmService(request as never);

  const result = await service.generate(
    {
      ...DEFAULT_LLM_SETTINGS,
      enabled: true,
      vendor: "openai",
      model: "gpt-5-mini",
      apiKey: "secret",
      endpointOverride: "https://proxy.example.com/v1",
    },
    baseInput
  );

  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "https://proxy.example.com/v1/responses",
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer secret",
      }),
    })
  );
  expect(result).toMatchObject({
    vendor: "openai",
    model: "gpt-5-mini",
    text: "Short excerpt",
  });
});

it("extracts OpenAI responses text from output message content blocks", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    json: {
      output: [
        { type: "reasoning" },
        {
          type: "message",
          content: [
            { type: "output_text", text: "Structured response excerpt" },
          ],
        },
      ],
    },
  });
  const service = new LlmService(request as never);

  const result = await service.generate(
    {
      ...DEFAULT_LLM_SETTINGS,
      enabled: true,
      vendor: "openai",
      model: "gpt-5.4-mini",
      apiKey: "secret",
      endpointOverride: "https://api.bbww.top/v1",
    },
    baseInput
  );

  expect(result).toMatchObject({
    vendor: "openai",
    model: "gpt-5.4-mini",
    text: "Structured response excerpt",
  });
});

it("supports a dedicated openai-compatible vendor for chat completions endpoint overrides", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    json: {
      choices: [
        {
          message: {
            content: "Chat completion excerpt",
          },
        },
      ],
    },
  });
  const service = new LlmService(request as never);

  const result = await service.generate(
    {
      ...DEFAULT_LLM_SETTINGS,
      enabled: true,
      vendor: "openai-compatible" as never,
      model: "Qwen/Qwen3.5-27B",
      apiKey: "secret",
      endpointOverride: "https://api.siliconflow.cn/v1/chat/completions",
    },
    baseInput
  );

  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "https://api.siliconflow.cn/v1/chat/completions",
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer secret",
      }),
    })
  );

  const firstCall = request.mock.calls[0]?.[0] as { body?: string };
  const body = JSON.parse(String(firstCall.body)) as {
    messages?: Array<{ role?: string; content?: string }>;
    input?: unknown;
    enable_thinking?: boolean;
  };
  expect(body.messages?.[0]).toMatchObject({
    role: "user",
    content: JSON.stringify(baseInput),
  });
  expect(body.input).toBeUndefined();
  expect(body.enable_thinking).toBe(false);

  expect(result).toMatchObject({
    vendor: "openai-compatible",
    model: "Qwen/Qwen3.5-27B",
    text: "Chat completion excerpt",
  });
});

it("raises an actionable error when an OpenAI-compatible response only contains reasoning content", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    json: {
      choices: [
        {
          message: {
            content: "",
            reasoning_content: "thinking...",
          },
          finish_reason: "length",
        },
      ],
    },
  });
  const service = new LlmService(request as never);

  await expect(
    service.generate(
      {
        ...DEFAULT_LLM_SETTINGS,
        enabled: true,
        vendor: "openai-compatible" as never,
        model: "Qwen/Qwen3.5-27B",
        apiKey: "secret",
        endpointOverride: "https://api.siliconflow.cn/v1/chat/completions",
      },
      baseInput
    )
  ).rejects.toThrow("LLM returned reasoning content only. Disable thinking for this model or switch to a non-reasoning model.");
});

it("normalizes Anthropic text responses", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    json: {
      content: [{ type: "text", text: "Anthropic title" }],
    },
  });
  const service = new LlmService(request as never);

  const result = await service.generate(
    {
      ...DEFAULT_LLM_SETTINGS,
      enabled: true,
      vendor: "anthropic",
      model: "claude-sonnet-4-5",
      apiKey: "secret",
    },
    { ...baseInput, task: "refine_title", currentValue: "Old title" }
  );

  expect(result.text).toBe("Anthropic title");
});

it("maps Gemini HTTP errors to user-facing messages", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 429,
    text: "quota exceeded",
  });
  const service = new LlmService(request as never);

  await expect(
    service.generate(
      {
        ...DEFAULT_LLM_SETTINGS,
        enabled: true,
        vendor: "gemini",
        model: "gemini-2.5-flash",
        apiKey: "secret",
      },
      baseInput
    )
  ).rejects.toThrow("LLM request was rate-limited. Please retry later.");
});

it("clips note markdown by maxInputChars before dispatch", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    json: {
      output_text: "Trimmed ok",
    },
  });
  const service = new LlmService(request as never);

  await service.generate(
    {
      ...DEFAULT_LLM_SETTINGS,
      enabled: true,
      vendor: "openai",
      model: "gpt-5-mini",
      apiKey: "secret",
      maxInputChars: 5,
    },
    {
      ...baseInput,
      note: {
        ...baseInput.note,
        markdown: "1234567890",
      },
    }
  );

  const firstCall = request.mock.calls[0]?.[0] as { body?: string };
  const body = JSON.parse(String(firstCall.body)) as {
    input?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const serializedInput = body.input?.[0]?.content?.[0]?.text ?? "";
  const llmInput = JSON.parse(serializedInput) as { note?: { markdown?: string } };
  expect(llmInput.note?.markdown).toBe("12345");
});

it("enforces timeoutMs for long-running LLM requests", async () => {
  const request = vi.fn(
    () =>
      new Promise<{ status: number; json?: unknown; text?: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            json: {
              output_text: "Late response",
            },
          });
        }, 50);
      })
  );
  const service = new LlmService(request as never);

  await expect(
    service.generate(
      {
        ...DEFAULT_LLM_SETTINGS,
        enabled: true,
        vendor: "openai",
        model: "gpt-5-mini",
        apiKey: "secret",
        timeoutMs: 10,
      },
      baseInput
    )
  ).rejects.toThrow("LLM request timed out.");
});
