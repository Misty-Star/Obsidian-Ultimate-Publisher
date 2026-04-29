import { PublishableNote } from "../note";
import { StaticSiteGenerator } from "../../types";

export interface StaticSiteContentOptions {
  generator: StaticSiteGenerator;
  contentRoot: string;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function sanitizePathSegment(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\.+/g, ".")
    .replace(/[<>:"|?*\u0000-\u001F]/g, "-");
  return sanitized || fallback;
}

function normalizeContentRoot(contentRoot: string): string {
  return trimSlashes(contentRoot || "content/posts");
}

function ensureMarkdownExtension(path: string): string {
  return /\.mdx?$/i.test(path) ? path : `${path}.md`;
}

export function buildStaticSiteContentPath(note: PublishableNote, options: StaticSiteContentOptions): string {
  const root = normalizeContentRoot(options.contentRoot);
  const slug = sanitizePathSegment(note.slug || note.filePath.replace(/\.md$/i, ""), "post");

  switch (options.generator) {
    case "hugo":
    case "hexo":
    case "jekyll":
    case "vuepress":
    case "vuepress2":
    case "vitepress":
    case "quartz":
      return ensureMarkdownExtension(`${root}/${slug}`);
  }
}

function formatYamlScalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  const text = String(value);
  if (/^[A-Za-z0-9_./:@-]+$/.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

function serializeYamlValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ["[]"];
    }
    return value.flatMap((item) => serializeYamlValue(item).map((line, index) => (index === 0 ? `- ${line}` : `  ${line}`)));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return ["{}"];
    }
    return entries.flatMap(([key, nested]) => {
      const nestedLines = serializeYamlValue(nested);
      return [`${key}:`, ...nestedLines.map((line) => `  ${line}`)];
    });
  }
  return [formatYamlScalar(value)];
}

export function buildStaticSiteMarkdown(note: PublishableNote): string {
  const frontmatter: Record<string, unknown> = {
    ...note.frontmatter,
    title: typeof note.frontmatter.title === "string" && note.frontmatter.title.trim() ? note.frontmatter.title : note.title,
  };

  if (note.date && !frontmatter.date) {
    frontmatter.date = note.date;
  }

  const lines = Object.entries(frontmatter).flatMap(([key, value]) => {
    const serialized = serializeYamlValue(value);
    if (serialized.length === 1 && !serialized[0].startsWith("- ") && !serialized[0].includes("\n")) {
      return [`${key}: ${serialized[0]}`];
    }
    return [`${key}:`, ...serialized.map((line) => `  ${line}`)];
  });

  return `---\n${lines.join("\n")}\n---\n\n${note.markdown.trimStart()}`;
}

export function renderCommitMessage(template: string, note: PublishableNote, path: string): string {
  const resolved = (template || "Publish {{title}}").replace(/{{\s*title\s*}}/g, note.title).replace(/{{\s*path\s*}}/g, path);
  return resolved.trim() || `Publish ${note.title}`;
}

export function buildPreviewUrl(previewBaseUrl: string | undefined, contentPath: string): string | undefined {
  if (!previewBaseUrl?.trim()) {
    return undefined;
  }
  const withoutExtension = contentPath.replace(/(^|\/)index\.md$/i, "$1").replace(/\.mdx?$/i, "");
  return `${previewBaseUrl.replace(/\/+$/, "")}/${withoutExtension.replace(/^\/+/, "")}/`;
}
