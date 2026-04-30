import { requestUrl } from "obsidian";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import {
  MediaSupport,
  ProviderRuntimeOptions,
  PublisherProvider,
  PublishResult,
  assertRemoteAssetsSupported,
} from "../core/providers";
import { PublishableNote } from "../core/note";
import { ConfluenceTargetConfig, HaloTargetConfig, NotionTargetConfig, TelegraphTargetConfig } from "../types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeBaseUrl(value: string, fallback: string): string {
  return trimTrailingSlash(value || fallback);
}

function parseJson<T>(text: string, fallbackJson: unknown): T {
  if (fallbackJson && typeof fallbackJson === "object") {
    return fallbackJson as T;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return {} as T;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const snippet = trimmed.replace(/\s+/g, " ").slice(0, 400);
    throw new Error(`API returned a non-JSON response: ${snippet}`);
  }
}

async function requestJson<T>(options: {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  errorPrefix: string;
}): Promise<T> {
  const response = await requestUrl({
    url: options.url,
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    throw: false,
  });

  if (response.status >= 400) {
    throw new Error(`${options.errorPrefix} request failed (${response.status}): ${response.text}`);
  }

  return parseJson<T>(response.text ?? "", response.json);
}

function noteTitle(note: PublishableNote, context?: NormalPublishExecutionContext): string {
  return context?.common.title || note.title;
}

function unsupportedDelete(providerName: string): Promise<void> {
  return Promise.reject(new Error(`${providerName} does not support deleting published content through this provider.`));
}

interface NotionPageResponse {
  id?: string;
  url?: string;
}

function buildNotionProperties(title: string): Record<string, unknown> {
  return {
    title: {
      title: [
        {
          type: "text",
          text: { content: title },
        },
      ],
    },
  };
}

function buildNotionChildren(note: PublishableNote): unknown[] {
  return [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: note.markdown.slice(0, 1900) },
          },
        ],
      },
    },
  ];
}

export class NotionProvider implements PublisherProvider<NotionTargetConfig> {
  readonly provider = "notion" as const;

  getMediaSupport(_target: NotionTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: NotionTargetConfig): Promise<void> {
    if (!target.token || (!target.databaseId && !target.parentPageId)) {
      throw new Error("Notion target is missing token and a database ID or parent page ID.");
    }
    await requestJson({
      url: target.databaseId
        ? `https://api.notion.com/v1/databases/${encodeURIComponent(target.databaseId)}`
        : `https://api.notion.com/v1/pages/${encodeURIComponent(target.parentPageId)}`,
      headers: this.headers(target),
      errorPrefix: "Notion",
    });
  }

  async publish(
    note: PublishableNote,
    target: NotionTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<NotionTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const title = noteTitle(note, context);
    const parent = target.databaseId
      ? { database_id: target.databaseId }
      : { page_id: target.parentPageId };
    const response = await requestJson<NotionPageResponse>({
      url: "https://api.notion.com/v1/pages",
      method: "POST",
      headers: this.headers(target),
      body: {
        parent,
        properties: buildNotionProperties(title),
        children: buildNotionChildren(note),
      },
      errorPrefix: "Notion",
    });
    return { remoteId: String(response.id ?? note.slug), remoteUrl: response.url };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: NotionTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<NotionTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const response = await requestJson<NotionPageResponse>({
      url: `https://api.notion.com/v1/pages/${encodeURIComponent(remoteId)}`,
      method: "PATCH",
      headers: this.headers(target),
      body: { properties: buildNotionProperties(noteTitle(note, context)) },
      errorPrefix: "Notion",
    });
    return { remoteId: String(response.id ?? remoteId), remoteUrl: response.url };
  }

  async delete(remoteId: string, target: NotionTargetConfig): Promise<void> {
    await requestJson({
      url: `https://api.notion.com/v1/pages/${encodeURIComponent(remoteId)}`,
      method: "PATCH",
      headers: this.headers(target),
      body: { archived: true },
      errorPrefix: "Notion",
    });
  }

  async getPreviewUrl(remoteId: string, target: NotionTargetConfig): Promise<string | undefined> {
    const response = await requestJson<NotionPageResponse>({
      url: `https://api.notion.com/v1/pages/${encodeURIComponent(remoteId)}`,
      headers: this.headers(target),
      errorPrefix: "Notion",
    });
    return response.url;
  }

  private headers(target: NotionTargetConfig): Record<string, string> {
    return {
      Authorization: `Bearer ${target.token}`,
      "Notion-Version": target.notionVersion || "2022-06-28",
    };
  }
}

interface HaloPostResponse {
  name?: string;
  metadata?: { name?: string };
  status?: { permalink?: string };
  spec?: { slug?: string };
}

function buildHaloPost(note: PublishableNote, target: HaloTargetConfig, context?: NormalPublishExecutionContext): Record<string, unknown> {
  return {
    post: {
      spec: {
        title: noteTitle(note, context),
        slug: note.slug,
        publish: target.defaultPublish,
        deleted: false,
        allowComment: true,
        visible: "PUBLIC",
        priority: 0,
        excerpt: { autoGenerate: !note.excerpt, raw: note.excerpt || "" },
        categories: target.defaultCategory ? [target.defaultCategory] : [],
        tags: target.defaultTags,
      },
    },
    content: {
      raw: note.markdown,
      content: note.markdown,
      rawType: "markdown",
    },
  };
}

export class HaloProvider implements PublisherProvider<HaloTargetConfig> {
  readonly provider = "halo" as const;

  getMediaSupport(_target: HaloTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: HaloTargetConfig): Promise<void> {
    if (!target.baseUrl || !target.token) {
      throw new Error("Halo API target is missing base URL or token.");
    }
    await requestJson({ url: `${this.base(target)}/apis/api.console.halo.run/v1alpha1/users/-`, headers: this.headers(target), errorPrefix: "Halo" });
  }

  async publish(
    note: PublishableNote,
    target: HaloTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<HaloTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const response = await requestJson<HaloPostResponse>({
      url: `${this.base(target)}/apis/uc.api.content.halo.run/v1alpha1/posts`,
      method: "POST",
      headers: this.headers(target),
      body: buildHaloPost(note, target, context),
      errorPrefix: "Halo",
    });
    const remoteId = String(response.metadata?.name ?? response.name ?? response.spec?.slug ?? note.slug);
    return { remoteId, remoteUrl: response.status?.permalink };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: HaloTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<HaloTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const response = await requestJson<HaloPostResponse>({
      url: `${this.base(target)}/apis/uc.api.content.halo.run/v1alpha1/posts/${encodeURIComponent(remoteId)}`,
      method: "PUT",
      headers: this.headers(target),
      body: buildHaloPost(note, target, context),
      errorPrefix: "Halo",
    });
    return { remoteId: String(response.metadata?.name ?? response.name ?? remoteId), remoteUrl: response.status?.permalink };
  }

  async delete(remoteId: string, target: HaloTargetConfig): Promise<void> {
    await requestJson({
      url: `${this.base(target)}/apis/content.halo.run/v1alpha1/posts/${encodeURIComponent(remoteId)}`,
      method: "DELETE",
      headers: this.headers(target),
      errorPrefix: "Halo",
    });
  }

  async getPreviewUrl(remoteId: string, target: HaloTargetConfig): Promise<string | undefined> {
    const response = await requestJson<HaloPostResponse>({
      url: `${this.base(target)}/apis/content.halo.run/v1alpha1/posts/${encodeURIComponent(remoteId)}`,
      headers: this.headers(target),
      errorPrefix: "Halo",
    });
    return response.status?.permalink;
  }

  private base(target: HaloTargetConfig): string {
    return normalizeBaseUrl(target.baseUrl, "");
  }

  private headers(target: HaloTargetConfig): Record<string, string> {
    return { Authorization: `Bearer ${target.token}` };
  }
}

interface TelegraphPageResponse {
  ok?: boolean;
  result?: {
    path?: string;
    url?: string;
  };
  path?: string;
  url?: string;
  error?: string;
}

function telegraphNodes(note: PublishableNote): string {
  return JSON.stringify([{ tag: "p", children: [note.markdown] }]);
}

function formBody(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

async function requestTelegraph(target: TelegraphTargetConfig, path: string, values: Record<string, string>): Promise<TelegraphPageResponse> {
  const response = await requestUrl({
    url: `https://api.telegra.ph${path}`,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody({ access_token: target.accessToken, ...values }),
    throw: false,
  });
  if (response.status >= 400) {
    throw new Error(`Telegraph request failed (${response.status}): ${response.text}`);
  }
  const payload = parseJson<TelegraphPageResponse>(response.text ?? "", response.json);
  if (payload.ok === false) {
    throw new Error(`Telegraph request failed: ${payload.error ?? "unknown error"}`);
  }
  return payload;
}

export class TelegraphProvider implements PublisherProvider<TelegraphTargetConfig> {
  readonly provider = "telegraph" as const;

  getMediaSupport(_target: TelegraphTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: TelegraphTargetConfig): Promise<void> {
    if (!target.accessToken) {
      throw new Error("Telegraph target is missing access token.");
    }
    await requestTelegraph(target, "/getAccountInfo", { fields: JSON.stringify(["short_name"]) });
  }

  async publish(
    note: PublishableNote,
    target: TelegraphTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<TelegraphTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const response = await requestTelegraph(target, "/createPage", {
      title: noteTitle(note, context),
      author_name: target.authorName,
      content: telegraphNodes(note),
      return_content: "false",
    });
    const page = response.result ?? response;
    return { remoteId: String(page.path ?? note.slug), remoteUrl: page.url };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: TelegraphTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<TelegraphTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const response = await requestTelegraph(target, `/editPage/${encodeURIComponent(remoteId)}`, {
      title: noteTitle(note, context),
      author_name: target.authorName,
      content: telegraphNodes(note),
      return_content: "false",
    });
    const page = response.result ?? response;
    return { remoteId: String(page.path ?? remoteId), remoteUrl: page.url };
  }

  delete(_remoteId: string, _target: TelegraphTargetConfig): Promise<void> {
    return unsupportedDelete("Telegraph");
  }

  async getPreviewUrl(remoteId: string, _target: TelegraphTargetConfig): Promise<string | undefined> {
    return `https://telegra.ph/${remoteId}`;
  }
}

interface ConfluencePageResponse {
  id?: string;
  _links?: {
    webui?: string;
    base?: string;
  };
  version?: { number?: number };
}

function confluenceStorage(note: PublishableNote): string {
  return `<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[${note.markdown}]]></ac:plain-text-body></ac:structured-macro>`;
}

export class ConfluenceProvider implements PublisherProvider<ConfluenceTargetConfig> {
  readonly provider = "confluence" as const;

  getMediaSupport(_target: ConfluenceTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: ConfluenceTargetConfig): Promise<void> {
    if (!target.baseUrl || !target.username || !target.apiToken || !target.spaceKey) {
      throw new Error("Confluence target is missing base URL, username, API token, or space key.");
    }
    await requestJson({
      url: `${this.base(target)}/rest/api/space/${encodeURIComponent(target.spaceKey)}`,
      headers: this.headers(target),
      errorPrefix: "Confluence",
    });
  }

  async publish(
    note: PublishableNote,
    target: ConfluenceTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<ConfluenceTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const response = await requestJson<ConfluencePageResponse>({
      url: `${this.base(target)}/rest/api/content`,
      method: "POST",
      headers: this.headers(target),
      body: {
        type: "page",
        title: noteTitle(note, context),
        space: { key: target.spaceKey },
        ancestors: target.parentId ? [{ id: target.parentId }] : undefined,
        body: { storage: { value: confluenceStorage(note), representation: "storage" } },
      },
      errorPrefix: "Confluence",
    });
    return { remoteId: String(response.id ?? note.slug), remoteUrl: this.webUrl(response, target) };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: ConfluenceTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<ConfluenceTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const current = await requestJson<ConfluencePageResponse>({
      url: `${this.base(target)}/rest/api/content/${encodeURIComponent(remoteId)}?expand=version`,
      headers: this.headers(target),
      errorPrefix: "Confluence",
    });
    const response = await requestJson<ConfluencePageResponse>({
      url: `${this.base(target)}/rest/api/content/${encodeURIComponent(remoteId)}`,
      method: "PUT",
      headers: this.headers(target),
      body: {
        id: remoteId,
        type: "page",
        title: noteTitle(note, context),
        space: { key: target.spaceKey },
        version: { number: (current.version?.number ?? 1) + 1 },
        body: { storage: { value: confluenceStorage(note), representation: "storage" } },
      },
      errorPrefix: "Confluence",
    });
    return { remoteId: String(response.id ?? remoteId), remoteUrl: this.webUrl(response, target) };
  }

  async delete(remoteId: string, target: ConfluenceTargetConfig): Promise<void> {
    await requestJson({
      url: `${this.base(target)}/rest/api/content/${encodeURIComponent(remoteId)}`,
      method: "DELETE",
      headers: this.headers(target),
      errorPrefix: "Confluence",
    });
  }

  async getPreviewUrl(remoteId: string, target: ConfluenceTargetConfig): Promise<string | undefined> {
    const response = await requestJson<ConfluencePageResponse>({
      url: `${this.base(target)}/rest/api/content/${encodeURIComponent(remoteId)}`,
      headers: this.headers(target),
      errorPrefix: "Confluence",
    });
    return this.webUrl(response, target);
  }

  private base(target: ConfluenceTargetConfig): string {
    return normalizeBaseUrl(target.baseUrl, "");
  }

  private headers(target: ConfluenceTargetConfig): Record<string, string> {
    return { Authorization: `Basic ${Buffer.from(`${target.username}:${target.apiToken}`).toString("base64")}` };
  }

  private webUrl(response: ConfluencePageResponse, target: ConfluenceTargetConfig): string | undefined {
    if (!response._links?.webui) {
      return undefined;
    }
    return `${response._links.base ?? this.base(target)}${response._links.webui}`;
  }
}
