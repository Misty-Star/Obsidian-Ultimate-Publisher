export interface ParsedAssetReference {
  originalText: string;
  rawTarget: string;
  altText: string;
  source: "wiki-embed" | "markdown-image";
}

const WIKI_EMBED_REGEX = /!\[\[([^\]]+)\]\]/g;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

export function isAbsoluteUrl(value: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:");
}

export function stripAlias(target: string): string {
  return target.split("|")[0].trim();
}

export function extractAssetReferences(markdown: string): ParsedAssetReference[] {
  const references: ParsedAssetReference[] = [];

  for (const match of markdown.matchAll(WIKI_EMBED_REGEX)) {
    const raw = match[1] ?? "";
    references.push({
      originalText: match[0],
      rawTarget: stripAlias(raw),
      altText: raw.split("|")[1]?.trim() ?? "",
      source: "wiki-embed",
    });
  }

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_REGEX)) {
    const target = (match[2] ?? "").trim();
    if (isAbsoluteUrl(target)) {
      continue;
    }
    references.push({
      originalText: match[0],
      rawTarget: target,
      altText: match[1] ?? "",
      source: "markdown-image",
    });
  }

  return references;
}

export function replaceAssetReference(markdown: string, reference: ParsedAssetReference, replacementPath: string): string {
  const altText = reference.altText.trim();
  const rewritten = `![${altText}](${replacementPath})`;
  return markdown.split(reference.originalText).join(rewritten);
}
