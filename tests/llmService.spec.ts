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
