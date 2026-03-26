import { App, normalizePath, requestUrl } from "obsidian";
import { PreparedHtmlNote } from "../core/content";
import { renderMarkdownToHtml } from "../core/html";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import {
  MediaSupport,
  MediaUploadResult,
  NormalPublishOptionItem,
  ProviderRemoteOptions,
  PublisherProvider,
  PublishResult,
} from "../core/providers";
import { PublishableNote, ResolvedAsset } from "../core/note";
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

interface WordpressMediaResponse {
  id: number;
  source_url?: string;
  guid?: {
    rendered?: string;
  };
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

async function buildPayload(
  note: PublishableNote & PreparedHtmlNote,
  target: WordpressTargetConfig,
  context?: NormalPublishExecutionContext
): Promise<Record<string, unknown>> {
  const providerContext = context?.provider.provider === "wordpress" ? context.provider : undefined;
  const content = target.contentFormat === "html" ? note.html ?? note.markdown : note.markdown;
  const payload: Record<string, unknown> = {
    title: context?.common.title || note.title,
    content,
    excerpt: providerContext?.excerpt ?? note.excerpt,
    slug: providerContext?.slug ?? note.slug,
    status: providerContext?.status ?? note.frontmatter.status ?? target.defaultStatus,
    categories: await ensureTermIds(target, "categories", providerContext?.categories ?? note.categories),
    tags: await ensureTermIds(target, "tags", providerContext?.tags ?? note.tags),
  };

  if (providerContext?.password) {
    payload.password = providerContext.password;
  }

  return payload;
}

export class WordpressProvider implements PublisherProvider<WordpressTargetConfig> {
  readonly provider = "wordpress" as const;

  constructor(private readonly app: App) {}

  getMediaSupport(_target: WordpressTargetConfig): MediaSupport {
    return { mode: "native-upload" };
  }

  async loadNormalPublishOptions(target: WordpressTargetConfig): Promise<ProviderRemoteOptions> {
    const categories = await requestJson<WordpressTermResponse[]>(target, "/categories?per_page=100");
    const tags = await requestJson<WordpressTermResponse[]>(target, "/tags?per_page=100");

    const toOption = (item: WordpressTermResponse): NormalPublishOptionItem => ({
      id: String(item.id),
      label: item.name,
      description: item.slug,
    });

    return {
      wordpressCategories: categories.map(toOption),
      wordpressTags: tags.map(toOption),
    };
  }

  async validateConfig(target: WordpressTargetConfig): Promise<void> {
    if (!target.endpoint || !target.username || !target.appPassword) {
      throw new Error("WordPress target is missing endpoint, username, or application password.");
    }
    await requestJson(target, "/users/me");
  }

  async publish(
    note: PublishableNote,
    target: WordpressTargetConfig,
    context?: NormalPublishExecutionContext
  ): Promise<PublishResult> {
    const response = await requestJson<WordpressPostResponse>(
      target,
      "/posts",
      "POST",
      await buildPayload(await this.prepareNote(note), target, context)
    );
    return {
      remoteId: String(response.id),
      remoteUrl: response.link,
    };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: WordpressTargetConfig,
    context?: NormalPublishExecutionContext
  ): Promise<PublishResult> {
    const preparedNote = await this.prepareNote(note);
    const response = await requestJson<WordpressPostResponse>(
      target,
      `/posts/${encodeURIComponent(remoteId)}`,
      "POST",
      await buildPayload(preparedNote, target, context)
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

  async uploadAsset(
    asset: ResolvedAsset,
    _note: PublishableNote,
    target: WordpressTargetConfig
  ): Promise<MediaUploadResult> {
    const bytes = await this.app.vault.adapter.readBinary(normalizePath(asset.sourcePath));
    const body = bytes instanceof ArrayBuffer ? bytes : Uint8Array.from(bytes).buffer;
    const response = await requestUrl({
      url: `${normalizeEndpoint(target)}/media`,
      method: "POST",
      headers: {
        Authorization: makeAuthHeader(target),
        "Content-Disposition": `attachment; filename="${asset.fileName}"`,
        "Content-Type": "application/octet-stream",
      },
      body,
      throw: false,
    });

    if (response.status >= 400) {
      throw new Error(`WordPress media upload failed for ${asset.fileName} (${response.status}): ${response.text}`);
    }

    const payload = tryParseJsonPayload<WordpressMediaResponse>(response.text);
    const url = payload?.source_url ?? payload?.guid?.rendered;
    if (!url) {
      throw new Error(`WordPress media upload failed for ${asset.fileName}: ${response.text}`);
    }

    return { url };
  }

  private async prepareNote(note: PublishableNote): Promise<PublishableNote & PreparedHtmlNote> {
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    return {
      ...note,
      html,
    };
  }
}
