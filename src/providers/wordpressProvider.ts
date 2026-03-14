import { App, requestUrl } from "obsidian";
import { PreparedHtmlNote } from "../core/content";
import { renderMarkdownToHtml } from "../core/html";
import { PublisherProvider, PublishResult, assertRemoteAssetsSupported } from "../core/providers";
import { PublishableNote } from "../core/note";
import { WordpressTargetConfig } from "../types";

interface WordpressPostResponse {
  id: number;
  link?: string;
}

interface WordpressTermResponse {
  id: number;
  name: string;
  slug: string;
}

function tryParseJsonPayload<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const objectIndex = trimmed.indexOf("{");
    const arrayIndex = trimmed.indexOf("[");
    const startIndex =
      objectIndex === -1
        ? arrayIndex
        : arrayIndex === -1
          ? objectIndex
          : Math.min(objectIndex, arrayIndex);

    if (startIndex <= 0) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(startIndex)) as T;
    } catch {
      return null;
    }
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function makeAuthHeader(target: WordpressTargetConfig): string {
  return `Basic ${Buffer.from(`${target.username}:${target.appPassword}`).toString("base64")}`;
}

function normalizeEndpoint(target: WordpressTargetConfig): string {
  return `${trimTrailingSlash(target.endpoint)}/wp-json/wp/v2`;
}

async function requestJson<T>(target: WordpressTargetConfig, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await requestUrl({
    url: `${normalizeEndpoint(target)}${path}`,
    method,
    headers: {
      Authorization: makeAuthHeader(target),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    throw: false,
  });

  if (response.status >= 400) {
    throw new Error(`WordPress request failed (${response.status}): ${response.text}`);
  }

  const parsed = tryParseJsonPayload<T>(response.text);
  if (parsed !== null) {
    return parsed;
  }

  const snippet = response.text.replace(/\s+/g, " ").slice(0, 400);
  throw new Error(
    `WordPress returned a non-JSON response. This usually means PHP warnings or other output are leaking into the REST API response. Raw response: ${snippet}`
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function ensureTermIds(target: WordpressTargetConfig, taxonomy: "categories" | "tags", names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of names) {
    const slug = slugify(name);
    const existing = await requestJson<WordpressTermResponse[]>(target, `/${taxonomy}?search=${encodeURIComponent(name)}`);
    const found = existing.find((item) => item.slug === slug || item.name.toLowerCase() === name.toLowerCase());
    if (found) {
      ids.push(found.id);
      continue;
    }

    const created = await requestJson<WordpressTermResponse>(target, `/${taxonomy}`, "POST", {
      name,
      slug,
    });
    ids.push(created.id);
  }
  return ids;
}

async function buildPayload(note: PublishableNote & PreparedHtmlNote, target: WordpressTargetConfig): Promise<Record<string, unknown>> {
  const content = target.contentFormat === "html" ? note.html ?? note.markdown : note.markdown;
  return {
    title: note.title,
    content,
    excerpt: note.excerpt,
    slug: note.slug,
    status: note.frontmatter.status ?? target.defaultStatus,
    categories: await ensureTermIds(target, "categories", note.categories),
    tags: await ensureTermIds(target, "tags", note.tags),
  };
}

export class WordpressProvider implements PublisherProvider<WordpressTargetConfig> {
  readonly provider = "wordpress" as const;

  constructor(private readonly app: App) {}

  async validateConfig(target: WordpressTargetConfig): Promise<void> {
    if (!target.endpoint || !target.username || !target.appPassword) {
      throw new Error("WordPress target is missing endpoint, username, or application password.");
    }
    await requestJson(target, "/users/me");
  }

  async publish(note: PublishableNote, target: WordpressTargetConfig): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const response = await requestJson<WordpressPostResponse>(
      target,
      "/posts",
      "POST",
      await buildPayload(await this.prepareNote(note), target)
    );
    return {
      remoteId: String(response.id),
      remoteUrl: response.link,
    };
  }

  async update(remoteId: string, note: PublishableNote, target: WordpressTargetConfig): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const preparedNote = await this.prepareNote(note);
    const response = await requestJson<WordpressPostResponse>(
      target,
      `/posts/${encodeURIComponent(remoteId)}`,
      "POST",
      await buildPayload(preparedNote, target)
    );
    return {
      remoteId: String(response.id),
      remoteUrl: response.link,
    };
  }

  async delete(remoteId: string, target: WordpressTargetConfig): Promise<void> {
    await requestJson(target, `/posts/${encodeURIComponent(remoteId)}?force=true`, "DELETE");
  }

  async getPreviewUrl(remoteId: string, target: WordpressTargetConfig): Promise<string | undefined> {
    const response = await requestJson<WordpressPostResponse>(target, `/posts/${encodeURIComponent(remoteId)}`);
    return response.link;
  }

  private async prepareNote(note: PublishableNote): Promise<PublishableNote & PreparedHtmlNote> {
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    return {
      ...note,
      html,
    };
  }
}
