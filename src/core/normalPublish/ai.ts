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
    default:
      return ["title"];
  }
}

function clipMarkdown(markdown: string, maxInputChars: number): string {
  return markdown.length <= maxInputChars ? markdown : markdown.slice(0, maxInputChars).trimEnd();
}

export function buildNormalPublishAiTaskInput(options: {
  field: NormalPublishAiField;
  note: PublishableNote;
  target: PublishTargetConfig;
  commonTitle: string;
  draft: ProviderPublishDraft;
  llmSettings: LlmSettings;
}): LlmTaskInput {
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
