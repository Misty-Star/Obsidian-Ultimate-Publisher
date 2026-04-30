import { App, requestUrl } from "obsidian";
import { renderMarkdownToHtml } from "../core/html";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import {
  assertRemoteAssetsSupported,
  MediaSupport,
  ProviderRuntimeOptions,
  PublisherProvider,
  PublishResult,
} from "../core/providers";
import { PublishableNote } from "../core/note";
import {
  BilibiliTargetConfig,
  HaloWebTargetConfig,
  JianshuTargetConfig,
  PublishTargetConfig,
  WechatTargetConfig,
  XiaohongshuTargetConfig,
} from "../types";

type WebCookieTargetConfig =
  | JianshuTargetConfig
  | WechatTargetConfig
  | HaloWebTargetConfig
  | BilibiliTargetConfig
  | XiaohongshuTargetConfig;
type WebMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface WebCookieAccountResponse {
  id?: number | string;
  uid?: number | string;
  name?: string;
  nickname?: string;
  username?: string;
  avatar?: string;
  avatarUrl?: string;
  data?: WebCookieAccountResponse;
}

interface WebCookiePublishResponse {
  id?: number | string;
  articleId?: number | string;
  article_id?: number | string;
  draftId?: number | string;
  draft_id?: number | string;
  url?: string;
  data?: WebCookiePublishResponse;
}

interface WebCookieProviderSpec<TTarget extends WebCookieTargetConfig> {
  provider: TTarget["provider"];
  displayName: string;
  validateUrl: (target: TTarget) => string;
  publishUrl: (target: TTarget) => string;
  updateUrl: (target: TTarget, remoteId: string) => string;
  previewUrl: (target: TTarget, remoteId: string) => string | undefined;
  buildPayload: (
    note: PublishableNote,
    html: string,
    target: TTarget,
  ) => unknown;
  buildUpdatePayload?: (
    remoteId: string,
    note: PublishableNote,
    html: string,
    target: TTarget,
  ) => unknown;
}

function buildHeaders(target: WebCookieTargetConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Cookie: target.cookie,
  };
}

function readJsonPayload<T>(response: { json?: unknown; text?: string }): T {
  if (response.json !== undefined) {
    return response.json as T;
  }

  if (response.text) {
    return JSON.parse(response.text) as T;
  }

  return {} as T;
}

function unwrapData<T extends { data?: T }>(payload: T): T {
  return payload.data && typeof payload.data === "object"
    ? payload.data
    : payload;
}

function readRemoteId(payload: WebCookiePublishResponse): string {
  const data = unwrapData(payload);
  const id =
    data.id ??
    data.articleId ??
    data.article_id ??
    data.draftId ??
    data.draft_id;
  return id === undefined || id === null ? "" : String(id);
}

function readAccountSummary(payload: WebCookieAccountResponse): {
  accountId?: string;
  accountName?: string;
  accountAvatarUrl?: string;
} {
  const data = unwrapData(payload);
  const id = data.id ?? data.uid;
  return {
    accountId: id === undefined || id === null ? undefined : String(id),
    accountName: data.name ?? data.nickname ?? data.username,
    accountAvatarUrl: data.avatar ?? data.avatarUrl,
  };
}

async function requestWebCookie<
  TTarget extends WebCookieTargetConfig,
  TResponse,
>(
  target: TTarget,
  url: string,
  method: WebMethod = "GET",
  body?: unknown,
): Promise<TResponse> {
  const response = await requestUrl({
    url,
    method,
    headers: buildHeaders(target),
    body: body ? JSON.stringify(body) : undefined,
    throw: false,
  });

  if (response.status >= 400) {
    throw new Error(
      `${target.name} request failed (${response.status}): ${response.text}`,
    );
  }

  return readJsonPayload<TResponse>(response);
}

export abstract class WebCookieProvider<
  TTarget extends WebCookieTargetConfig,
> implements PublisherProvider<TTarget> {
  readonly provider: TTarget["provider"];

  protected constructor(
    private readonly app: App,
    private readonly spec: WebCookieProviderSpec<TTarget>,
  ) {
    this.provider = spec.provider;
  }

  getMediaSupport(_target: TTarget): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: TTarget): Promise<void> {
    if (!target.cookie) {
      throw new Error(`${this.spec.displayName} target is missing Cookie.`);
    }
    await this.getAccountSummary(target);
  }

  async getAccountSummary(target: TTarget): Promise<{
    accountId?: string;
    accountName?: string;
    accountAvatarUrl?: string;
  }> {
    const payload = await requestWebCookie<TTarget, WebCookieAccountResponse>(
      target,
      this.spec.validateUrl(target),
    );
    const summary = readAccountSummary(payload);
    if (!summary.accountId && !summary.accountName) {
      throw new Error(
        `${this.spec.displayName} validation failed: not logged in or cookie expired.`,
      );
    }
    return summary;
  }

  async publish(
    note: PublishableNote,
    target: TTarget,
    _context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<TTarget>,
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const html = await renderMarkdownToHtml(
      this.app,
      note.markdown,
      note.filePath,
    );
    const payload = await requestWebCookie<TTarget, WebCookiePublishResponse>(
      target,
      this.spec.publishUrl(target),
      "POST",
      this.spec.buildPayload(note, html, target),
    );
    const remoteId = readRemoteId(payload);
    if (!remoteId) {
      throw new Error(
        `${this.spec.displayName} publish failed: remote id missing.`,
      );
    }
    return {
      remoteId,
      remoteUrl:
        this.spec.previewUrl(target, remoteId) ?? unwrapData(payload).url,
    };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: TTarget,
    _context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<TTarget>,
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const html = await renderMarkdownToHtml(
      this.app,
      note.markdown,
      note.filePath,
    );
    const payload = await requestWebCookie<TTarget, WebCookiePublishResponse>(
      target,
      this.spec.updateUrl(target, remoteId),
      "PUT",
      this.spec.buildUpdatePayload?.(remoteId, note, html, target) ??
        this.spec.buildPayload(note, html, target),
    );
    const nextRemoteId = readRemoteId(payload) || remoteId;
    return {
      remoteId: nextRemoteId,
      remoteUrl:
        this.spec.previewUrl(target, nextRemoteId) ?? unwrapData(payload).url,
    };
  }

  async delete(_remoteId: string, target: TTarget): Promise<void> {
    throw new Error(
      `${target.name} does not support delete from Ultimate Publisher yet.`,
    );
  }

  async getPreviewUrl(
    remoteId: string,
    target: TTarget,
  ): Promise<string | undefined> {
    return this.spec.previewUrl(target, remoteId);
  }
}

function basePayload(note: PublishableNote, html: string) {
  return {
    title: note.title,
    markdown: note.markdown,
    html,
    excerpt: note.excerpt,
    tags: note.tags,
    categories: note.categories,
  };
}

export class JianshuProvider extends WebCookieProvider<JianshuTargetConfig> {
  constructor(app: App) {
    super(app, {
      provider: "jianshu",
      displayName: "Jianshu",
      validateUrl: () => "https://www.jianshu.com/users/current",
      publishUrl: () => "https://www.jianshu.com/author/notes",
      updateUrl: (_target, remoteId) =>
        `https://www.jianshu.com/author/notes/${encodeURIComponent(remoteId)}`,
      previewUrl: (_target, remoteId) =>
        `https://www.jianshu.com/p/${encodeURIComponent(remoteId)}`,
      buildPayload: basePayload,
    });
  }
}

export class WechatProvider extends WebCookieProvider<WechatTargetConfig> {
  constructor(app: App) {
    super(app, {
      provider: "wechat",
      displayName: "WeChat Official Account",
      validateUrl: () => "https://mp.weixin.qq.com/cgi-bin/home?t=home/index",
      publishUrl: () => "https://mp.weixin.qq.com/cgi-bin/appmsg",
      updateUrl: (_target, remoteId) =>
        `https://mp.weixin.qq.com/cgi-bin/appmsg?action=update&appmsgid=${encodeURIComponent(remoteId)}`,
      previewUrl: (_target, remoteId) =>
        `https://mp.weixin.qq.com/s/${encodeURIComponent(remoteId)}`,
      buildPayload: (note, html) => ({
        ...basePayload(note, html),
        content: html,
        digest: note.excerpt,
      }),
    });
  }
}

function normalizeHaloBaseUrl(target: HaloWebTargetConfig): string {
  return (target.baseUrl || "https://halo.example.com").replace(/\/+$/, "");
}

export class HaloWebProvider extends WebCookieProvider<HaloWebTargetConfig> {
  constructor(app: App) {
    super(app, {
      provider: "halo-web",
      displayName: "Halo Web",
      validateUrl: (target) =>
        `${normalizeHaloBaseUrl(target)}/console/api/users/-/profile`,
      publishUrl: (target) =>
        `${normalizeHaloBaseUrl(target)}/console/api/contents/posts`,
      updateUrl: (target, remoteId) =>
        `${normalizeHaloBaseUrl(target)}/console/api/contents/posts/${encodeURIComponent(remoteId)}`,
      previewUrl: (target, remoteId) =>
        `${normalizeHaloBaseUrl(target)}/archives/${encodeURIComponent(remoteId)}`,
      buildPayload: (note, html) => ({
        ...basePayload(note, html),
        content: {
          raw: note.markdown,
          html,
        },
      }),
    });
  }
}

export class BilibiliProvider extends WebCookieProvider<BilibiliTargetConfig> {
  constructor(app: App) {
    super(app, {
      provider: "bilibili",
      displayName: "Bilibili",
      validateUrl: () => "https://api.bilibili.com/x/web-interface/nav",
      publishUrl: () => "https://member.bilibili.com/x/web/article/add",
      updateUrl: (_target, remoteId) =>
        `https://member.bilibili.com/x/web/article/update?id=${encodeURIComponent(remoteId)}`,
      previewUrl: (_target, remoteId) =>
        `https://www.bilibili.com/read/cv${encodeURIComponent(remoteId)}`,
      buildPayload: (note, html) => ({
        ...basePayload(note, html),
        content: html,
      }),
    });
  }
}

export class XiaohongshuProvider extends WebCookieProvider<XiaohongshuTargetConfig> {
  constructor(app: App) {
    super(app, {
      provider: "xiaohongshu",
      displayName: "Xiaohongshu",
      validateUrl: () =>
        "https://edith.xiaohongshu.com/api/sns/web/v1/user/selfinfo",
      publishUrl: () => "https://edith.xiaohongshu.com/api/sns/web/v1/note",
      updateUrl: (_target, remoteId) =>
        `https://edith.xiaohongshu.com/api/sns/web/v1/note/${encodeURIComponent(remoteId)}`,
      previewUrl: (_target, remoteId) =>
        `https://www.xiaohongshu.com/explore/${encodeURIComponent(remoteId)}`,
      buildPayload: (note, html) => ({
        ...basePayload(note, html),
        type: "normal",
      }),
    });
  }
}

export function isNewWebCookieTarget(
  target: PublishTargetConfig,
): target is WebCookieTargetConfig {
  return ["jianshu", "wechat", "halo-web", "bilibili", "xiaohongshu"].includes(
    target.provider,
  );
}
