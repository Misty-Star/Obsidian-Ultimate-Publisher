import { PublishableNote } from "../note";
import { LlmSettings, PublishTargetConfig } from "../../types";
import { ProviderPublishDraft } from "./types";
import { LlmTaskInput } from "../llm/types";

export type NormalPublishAiField = "title" | "excerpt" | "briefContent";

export function getSupportedAiFields(draft: ProviderPublishDraft): NormalPublishAiField[] {
  switch (draft.provider) {
    case "wordpress":
    case "csdn":
      return ["title", "excerpt"];
    case "juejin":
      return ["title", "briefContent"];
    case "yuque":
    case "zhihu":
      return ["title"];
  }

  const exhaustiveCheck: never = draft;
  throw new Error(`Unhandled provider draft: ${String(exhaustiveCheck)}`);
}

function clipMarkdown(markdown: string, maxInputChars: number): string {
  if (!Number.isFinite(maxInputChars) || maxInputChars <= 0) {
    return markdown;
  }

  const limit = Math.floor(maxInputChars);
  return markdown.length <= limit ? markdown : markdown.slice(0, limit);
}

export function buildNormalPublishAiTaskInput(options: {
  field: NormalPublishAiField;
  note: PublishableNote;
  target: PublishTargetConfig;
  commonTitle: string;
  draft: ProviderPublishDraft;
  llmSettings: LlmSettings;
}): LlmTaskInput {
  if (options.target.provider !== options.draft.provider) {
    throw new Error("Target provider and draft provider must match.");
  }

  const clippedMarkdown = clipMarkdown(options.note.markdown, options.llmSettings.maxInputChars);

  switch (options.field) {
    case "title":
      return {
        task: "refine_title",
        note: {
          title: options.commonTitle,
          markdown: clippedMarkdown,
          excerpt: options.note.excerpt,
          frontmatter: options.note.frontmatter,
        },
        target: {
          provider: options.target.provider,
          name: options.target.name,
        },
        currentValue: options.commonTitle,
      };
    case "excerpt":
      if (options.draft.provider !== "wordpress" && options.draft.provider !== "csdn") {
        throw new Error("Excerpt AI is unsupported for this provider.");
      }
      return {
        task: "generate_excerpt",
        note: {
          title: options.commonTitle,
          markdown: clippedMarkdown,
          excerpt: options.note.excerpt,
          frontmatter: options.note.frontmatter,
        },
        target: {
          provider: options.target.provider,
          name: options.target.name,
        },
        currentValue: options.draft.excerpt,
      };
    case "briefContent":
      if (options.draft.provider !== "juejin") {
        throw new Error("Brief content AI is unsupported for this provider.");
      }
      return {
        task: "generate_brief_content",
        note: {
          title: options.commonTitle,
          markdown: clippedMarkdown,
          excerpt: options.note.excerpt,
          frontmatter: options.note.frontmatter,
        },
        target: {
          provider: options.target.provider,
          name: options.target.name,
        },
        currentValue: options.draft.briefContent,
      };
  }
}
