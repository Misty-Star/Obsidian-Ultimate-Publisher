import { createHmac, randomUUID } from "node:crypto";
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
import { resolveCsdnPublishInput } from "../core/webPublishConfig";
import { CsdnTargetConfig } from "../types";

interface CsdnUserResponse {
  data?: {
    username?: string;
    avatar?: string;
  };
}

interface CsdnPublishResponse {
  code?: number;
  msg?: string;
  message?: string;
  data?: {
    id?: number | string;
  };
}

interface CsdnColumnListResponse {
  code?: number;
  data?: {
    list?: {
      column?: Array<{
        id?: number | string;
        edit_title?: string;
        column_url?: string;
      }>;
      pay_column?: Array<{
        id?: number | string;
        edit_title?: string;
        column_url?: string;
      }>;
    };
  };
}

interface CsdnPublishPayload {
  title: string;
  markdowncontent: string;
  content: string;
  readType: "public";
  level: number;
  tags: string;
  status: number;
  categories: string;
  type: "original";
  original_link: string;
  authorized_status: boolean;
  Description: string;
  not_auto_saved: "1";
  source: "pc_mdeditor";
  cover_images: [];
  cover_type: 1;
  is_new: 1;
  vote_id: 0;
  resource_id: string;
  pubStatus: "publish";
}

function buildHeaders(target: CsdnTargetConfig): Record<string, string> {
  return {
    Cookie: target.cookie,
  };
}

const CSDN_X_CA_KEY = "203803574";
const CSDN_APP_SECRET = "9znpamsyl2c7cdrr9sas0le9vbc3r6ba";

function generateXCaSignature(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  accept: string,
  nonce: string,
  contentType: string
): string {
  const parsedUrl = new URL(url);
  const path = method === "GET" ? `${parsedUrl.pathname}${parsedUrl.search}` : parsedUrl.pathname;
  const stringToSign =
    `${method}\n${accept}\n\n${contentType}\n\n` +
    `x-ca-key:${CSDN_X_CA_KEY}\n` +
    `x-ca-nonce:${nonce}\n` +
    `${path}`;

  return createHmac("sha256", CSDN_APP_SECRET).update(stringToSign).digest("base64");
}

function buildSignedHeaders(
  target: CsdnTargetConfig,
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  contentType: string
): Record<string, string> {
  const accept = "*/*";
  const nonce = randomUUID();
  const signature = generateXCaSignature(url, method, accept, nonce, contentType);

  return {
    ...buildHeaders(target),
    accept,
    "content-type": contentType,
    "x-ca-key": CSDN_X_CA_KEY,
    "x-ca-nonce": nonce,
    "x-ca-signature": signature,
    "x-ca-signature-headers": "x-ca-key,x-ca-nonce",
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

function readCookieValue(cookieHeader: string, key: string): string {
  const pairs = cookieHeader.split(";").map((item) => item.trim()).filter(Boolean);

  for (const pair of pairs) {
    const [name, ...rest] = pair.split("=");
    if (name === key) {
      return rest.join("=").trim();
    }
  }

  return "";
}

function buildPublishPayload(note: PublishableNote, html: string, categories: string[], tags: string[]): CsdnPublishPayload {
  return {
    title: note.title,
    markdowncontent: note.markdown,
    content: html,
    readType: "public",
    level: 0,
    tags: tags.join(","),
    status: 0,
    categories: categories.join(","),
    type: "original",
    original_link: "",
    authorized_status: false,
    Description: note.excerpt,
    not_auto_saved: "1",
    source: "pc_mdeditor",
    cover_images: [],
    cover_type: 1,
    is_new: 1,
    vote_id: 0,
    resource_id: "",
    pubStatus: "publish",
  };
}

function getResponseMessage(response: CsdnPublishResponse): string {
  const message = response.msg ?? response.message;
  return typeof message === "string" && message.trim() ? message.trim() : "unknown error";
}

async function requestCsdn<T>(
  target: CsdnTargetConfig,
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  body?: unknown
): Promise<T> {
  const contentType = "application/json";
  const response = await requestUrl({
    url,
    method,
    headers: buildSignedHeaders(target, url, method, contentType),
    body: body ? JSON.stringify(body) : undefined,
    throw: false,
  });

  if (response.status >= 400) {
    throw new Error(`CSDN request failed (${response.status}): ${response.text}`);
  }

  return readJsonPayload<T>(response);
}

function buildPreviewUrl(target: CsdnTargetConfig, articleId: string): string | undefined {
  const username = readCookieValue(target.cookie, "UserName");
  if (!username) {
    return undefined;
  }

  return `https://blog.csdn.net/${username}/article/details/${articleId}`;
}

export class CsdnProvider implements PublisherProvider<CsdnTargetConfig> {
  readonly provider = "csdn" as const;

  constructor(private readonly app: App) {}

  getMediaSupport(_target: CsdnTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async loadNormalPublishOptions(target: CsdnTargetConfig) {
    const response = await requestCsdn<CsdnColumnListResponse>(
      target,
      "https://bizapi.csdn.net/blog/phoenix/console/v1/column/list?type=all"
    );
    const columns = [
      ...(response.data?.list?.column ?? []),
      ...(response.data?.list?.pay_column ?? []),
    ];

    return {
      csdnCategories: columns
        .filter((item) => item.id && item.edit_title)
        .map((item) => ({
          id: String(item.id),
          label: item.edit_title ?? String(item.id),
          description: item.column_url,
        })),
      csdnTags: [],
    };
  }

  async validateConfig(target: CsdnTargetConfig): Promise<void> {
    if (!target.cookie) {
      throw new Error("CSDN target is missing Cookie.");
    }

    await this.getAccountSummary(target);
  }

  async getAccountSummary(target: CsdnTargetConfig): Promise<{
    accountId?: string;
    accountName?: string;
    accountAvatarUrl?: string;
  }> {
    const response = await requestCsdn<CsdnUserResponse>(target, "https://bizapi.csdn.net/blog-console-api/v1/user/info");

    if (!response.data?.username) {
      throw new Error("CSDN validation failed: not logged in or cookie expired.");
    }

    return {
      accountId: response.data?.username,
      accountName: response.data?.username,
      accountAvatarUrl: response.data?.avatar,
    };
  }

  async publish(
    note: PublishableNote,
    target: CsdnTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<CsdnTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const input = resolveCsdnPublishInput(
      note,
      target,
      context?.provider.provider === "csdn" ? context.provider : undefined
    );
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    const response = await requestCsdn<CsdnPublishResponse>(
      target,
      "https://bizapi.csdn.net/blog-console-api/v3/mdeditor/saveArticle",
      "POST",
      buildPublishPayload(note, html, input.categories, input.tags)
    );

    if (response.code !== 200 || !response.data?.id) {
      throw new Error(`CSDN publish failed: ${getResponseMessage(response)}`);
    }

    const articleId = String(response.data.id);
    return {
      remoteId: articleId,
      remoteUrl: buildPreviewUrl(target, articleId),
    };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: CsdnTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<CsdnTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const input = resolveCsdnPublishInput(
      note,
      target,
      context?.provider.provider === "csdn" ? context.provider : undefined
    );
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    const response = await requestCsdn<CsdnPublishResponse>(
      target,
      "https://bizapi.csdn.net/blog-console-api/v3/mdeditor/saveArticle",
      "POST",
      {
        id: remoteId,
        title: note.title,
        markdowncontent: note.markdown,
        content: html,
        tags: input.tags.join(","),
        categories: input.categories.join(","),
        Description: note.excerpt,
      }
    );

    if (response.code !== 200) {
      throw new Error("CSDN update failed.");
    }

    return {
      remoteId,
      remoteUrl: buildPreviewUrl(target, remoteId),
    };
  }

  async delete(remoteId: string, target: CsdnTargetConfig): Promise<void> {
    await requestCsdn(
      target,
      "https://bizapi.csdn.net/blog/phoenix/console/v1/article/del",
      "POST",
      {
        articleId: remoteId,
        deep: false,
      }
    );
  }

  async getPreviewUrl(remoteId: string, target: CsdnTargetConfig): Promise<string | undefined> {
    return buildPreviewUrl(target, remoteId);
  }
}
