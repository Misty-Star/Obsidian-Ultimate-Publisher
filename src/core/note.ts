import { App, CachedMetadata, TFile } from "obsidian";
import { createHash } from "node:crypto";
import { dirname, extname } from "node:path";
import { extractAssetReferences, ParsedAssetReference } from "./markdown";
import { stripFrontmatter } from "./content";

export interface ResolvedAsset {
  reference: ParsedAssetReference;
  sourcePath: string;
  fileName: string;
}

export interface PublishableNote {
  filePath: string;
  title: string;
  markdown: string;
  frontmatter: Record<string, unknown>;
  attachments: ResolvedAsset[];
  excerpt: string;
  slug: string;
  tags: string[];
  categories: string[];
  date?: string;
}

function ensureArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function pickExcerpt(markdown: string, frontmatter: Record<string, unknown>): string {
  const explicit =
    (typeof frontmatter.description === "string" && frontmatter.description) ||
    (typeof frontmatter.excerpt === "string" && frontmatter.excerpt) ||
    (typeof frontmatter.summary === "string" && frontmatter.summary) ||
    "";
  if (explicit) {
    return explicit;
  }

  const collapsed = markdown
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, "")
    .replace(/\[\[([^\]]+)]]/g, "$1")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/[#>*`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return collapsed.slice(0, 200);
}

function resolveAsset(app: App, file: TFile, reference: ParsedAssetReference): ResolvedAsset | null {
  const resolved = app.metadataCache.getFirstLinkpathDest(reference.rawTarget, file.path);
  if (!(resolved instanceof TFile)) {
    return null;
  }

  return {
    reference,
    sourcePath: resolved.path,
    fileName: resolved.name,
  };
}

export async function extractPublishableNote(app: App, file: TFile): Promise<PublishableNote> {
  const rawMarkdown = await app.vault.cachedRead(file);
  const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
  const frontmatter = (cache?.frontmatter ?? {}) as Record<string, unknown>;
  const markdown = stripFrontmatter(rawMarkdown);

  const references = extractAssetReferences(markdown);
  const attachments = references
    .map((reference) => resolveAsset(app, file, reference))
    .filter((asset): asset is ResolvedAsset => Boolean(asset));

  const title = typeof frontmatter.title === "string" && frontmatter.title ? frontmatter.title : file.basename;
  const slug =
    (typeof frontmatter.slug === "string" && frontmatter.slug) ||
    (typeof frontmatter.permalink === "string" && frontmatter.permalink) ||
    slugify(file.basename);

  const tags = ensureArray(frontmatter.tags);
  const categories = ensureArray(frontmatter.categories ?? frontmatter.category);

  return {
    filePath: file.path,
    title,
    markdown,
    frontmatter,
    attachments,
    excerpt: pickExcerpt(markdown, frontmatter),
    slug,
    tags,
    categories,
    date: typeof frontmatter.date === "string" ? frontmatter.date : undefined,
  };
}

export function computeContentHash(note: PublishableNote): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        markdown: note.markdown,
        frontmatter: note.frontmatter,
        attachments: note.attachments.map((asset) => asset.sourcePath),
      })
    )
    .digest("hex");
}

export function sanitizeFileName(value: string, fallback = "note"): string {
  const ext = extname(value);
  const name = ext ? value.slice(0, -ext.length) : value;
  const sanitized = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").trim();
  return sanitized || fallback;
}

export function getNoteDirectory(notePath: string): string {
  const folder = dirname(notePath).replace(/\\/g, "/");
  return folder === "." ? "" : folder;
}
