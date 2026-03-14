export interface PreparedHtmlNote {
  html: string;
}

export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) {
    return markdown;
  }

  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/^\s*\n/, "");
}
