import type { CachedProviderOption, PublishTargetConfig, WordpressStatus } from "../types";

const OPTION_COMMENT_LIMIT = 20;
const WORDPRESS_STATUS_OPTIONS: WordpressStatus[] = ["draft", "publish", "private", "pending"];

export interface BuildPublishFrontmatterTemplateJuejinOptions {
  categories?: CachedProviderOption[];
  tags?: CachedProviderOption[];
}

export interface BuildPublishFrontmatterTemplateArgs {
  targets: PublishTargetConfig[];
  includeOptionComments: boolean;
  juejinOptions?: BuildPublishFrontmatterTemplateJuejinOptions;
}

function buildOptionComment(prefix: string | undefined, options: string[]): string | null {
  const normalized = options.filter(Boolean);
  if (normalized.length === 0) {
    return null;
  }

  const visible = normalized.slice(0, OPTION_COMMENT_LIMIT);
  const truncated = normalized.length > OPTION_COMMENT_LIMIT;
  const labelParts = prefix ? [prefix, "\u53ef\u9009\u9879"] : ["\u53ef\u9009\u9879"];
  const labelText = labelParts.join(" ");
  const suffix = truncated ? " | \u4ec5\u5c55\u793a\u90e8\u5206\u53ef\u9009\u9879" : "";

  return `# ${labelText}: ${visible.join(" | ")}${suffix}`;
}

function extractLabels(options?: CachedProviderOption[]): string[] {
  if (!options) {
    return [];
  }

  return options
    .map((option) => option.label.trim())
    .filter(Boolean);
}

export function buildPublishFrontmatterTemplate(args: BuildPublishFrontmatterTemplateArgs): string {
  const { targets, includeOptionComments, juejinOptions } = args;
  const hasWordpress = targets.some((target) => target.provider === "wordpress" && target.enabled);
  const hasJuejin = targets.some((target) => target.provider === "juejin" && target.enabled);
  const enabledJuejinCount = targets.filter((target) => target.provider === "juejin" && target.enabled).length;

  const lines: string[] = ["---"];
  lines.push("title:");
  lines.push("slug:");
  lines.push("tags: []");
  lines.push("categories: []");
  lines.push("description:");

  if (hasWordpress) {
    if (includeOptionComments) {
      const statusComment = buildOptionComment("WordPress", WORDPRESS_STATUS_OPTIONS);
      if (statusComment) {
        lines.push(statusComment);
      }
    }
    lines.push("status:");
  }

  if (hasJuejin) {
    const shouldRenderJuejinOptionComments = includeOptionComments && enabledJuejinCount === 1;
    if (shouldRenderJuejinOptionComments) {
      const categoryComment = buildOptionComment(
        undefined,
        extractLabels(juejinOptions?.categories)
      );
      if (categoryComment) {
        lines.push(categoryComment);
      }
    }
    lines.push("juejinCategory:");
    if (shouldRenderJuejinOptionComments) {
      const tagComment = buildOptionComment(undefined, extractLabels(juejinOptions?.tags));
      if (tagComment) {
        lines.push(tagComment);
      }
    }
    lines.push("juejinTags: []");
  }

  lines.push("---");

  return lines.join("\n");
}

const FRONTMATTER_REGEX = /^[\uFEFF\s]*---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

export function hasLeadingFrontmatter(markdown: string): boolean {
  return FRONTMATTER_REGEX.test(markdown);
}

export function injectPublishFrontmatter(markdown: string, template: string): string {
  if (!template) {
    return markdown;
  }

  if (hasLeadingFrontmatter(markdown)) {
    return markdown;
  }

  const trimmedTemplate = template.trimEnd();
  return `${trimmedTemplate}\n\n${markdown}`;
}
