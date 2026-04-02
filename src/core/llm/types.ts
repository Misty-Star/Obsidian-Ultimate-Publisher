import { LlmSettings, LlmVendor, ProviderId } from "../../types";

export type LlmTaskType = "refine_title" | "generate_excerpt" | "generate_brief_content";

export interface LlmTaskInput {
  task: LlmTaskType;
  note: {
    title: string;
    markdown: string;
    excerpt: string;
    frontmatter: Record<string, unknown>;
  };
  target: {
    provider: ProviderId;
    name: string;
  };
  currentValue?: string;
}

export interface LlmTaskResult {
  text: string;
  vendor: LlmVendor;
  model: string;
}

export interface LlmProviderAdapter {
  readonly vendor: LlmVendor;
  generate(settings: LlmSettings, input: LlmTaskInput): Promise<LlmTaskResult>;
}

export class LlmHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}
