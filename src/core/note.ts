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

export interface UnresolvedAsset {
  reference: ParsedAssetReference;
  reason: "missing" | "unsupported-type";
}

export interface PublishableNote {
  filePath: string;
  title: string;
  markdown: string;
  frontmatter: Record<string, unknown>;
  attachments: ResolvedAsset[];
  unresolvedAttachments: UnresolvedAsset[];
  excerpt: string;
  slug: string;
  tags: string[];
  categories: string[];
  date?: string;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"]);

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

function normalizeTitleLine(value: string): string {
  return value.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "").replace(/\s+/g, " ").trim();
}

function pickTitle(markdown: string, fallback: string): string {
  const lines = markdown.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("# ")) {
      continue;
    }

    const title = normalizeTitleLine(line);
    if (title) {
      return title;
    }
  }

  for (const rawLine of lines) {
    const title = normalizeTitleLine(rawLine);
    if (title) {
      return title;
    }
  }

  return fallback;
}

function isImagePath(value: string): boolean {
  const normalized = value.split(/[?#]/)[0] ?? value;
  return IMAGE_EXTENSIONS.has(extname(normalized).toLowerCase());
}

function resolveAsset(
  app: App,
  file: TFile,
  reference: ParsedAssetReference
): { resolved?: ResolvedAsset; unresolved?: UnresolvedAsset } {
  if (!isImagePath(reference.rawTarget)) {
    return {
      unresolved: {
        reference,
        reason: "unsupported-type",
      },
    };
  }

  const resolved = app.metadataCache.getFirstLinkpathDest(reference.rawTarget, file.path);
  if (!(resolved instanceof TFile)) {
    return {
      unresolved: {
        reference,
        reason: "missing",
      },
    };
  }

  if (!isImagePath(resolved.path)) {
    return {
      unresolved: {
        reference,
        reason: "unsupported-type",
      },
    };
  }

  return {
    resolved: {
      reference,
      sourcePath: resolved.path,
      fileName: resolved.name,
    },
  };
}

export async function extractPublishableNote(app: App, file: TFile): Promise<PublishableNote> {
  const rawMarkdown = await app.vault.cachedRead(file);
  const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
  const frontmatter = (cache?.frontmatter ?? {}) as Record<string, unknown>;
  const markdown = stripFrontmatter(rawMarkdown);

  const references = extractAssetReferences(markdown);
  const attachments: ResolvedAsset[] = [];
  const unresolvedAttachments: UnresolvedAsset[] = [];
  for (const reference of references) {
    const result = resolveAsset(app, file, reference);
    if (result.resolved) {
      attachments.push(result.resolved);
    }
    if (result.unresolved) {
      unresolvedAttachments.push(result.unresolved);
    }
  }

  const title = pickTitle(markdown, file.basename);
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
    unresolvedAttachments,
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
