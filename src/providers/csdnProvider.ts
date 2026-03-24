import { App, requestUrl } from "obsidian";
import { renderMarkdownToHtml } from "../core/html";
import { assertRemoteAssetsSupported, MediaSupport, PublisherProvider, PublishResult } from "../core/providers";
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
  data?: {
    id?: number | string;
  };
}

function buildHeaders(target: CsdnTargetConfig): Record<string, string> {
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

async function requestCsdn<T>(
  target: CsdnTargetConfig,
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  body?: unknown
): Promise<T> {
  const response = await requestUrl({
    url,
    method,
    headers: buildHeaders(target),
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

    return {
      accountId: response.data?.username,
      accountName: response.data?.username,
      accountAvatarUrl: response.data?.avatar,
    };
  }

  async publish(note: PublishableNote, target: CsdnTargetConfig): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const input = resolveCsdnPublishInput(note, target);
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    const response = await requestCsdn<CsdnPublishResponse>(
      target,
      "https://bizapi.csdn.net/blog-console-api/v3/mdeditor/saveArticle",
      "POST",
      {
        title: note.title,
        markdowncontent: note.markdown,
        content: html,
        tags: input.tags.join(","),
        categories: input.categories.join(","),
        Description: note.excerpt,
      }
    );

    if (response.code !== 200 || !response.data?.id) {
      throw new Error("CSDN publish failed.");
    }

    const articleId = String(response.data.id);
    return {
      remoteId: articleId,
      remoteUrl: buildPreviewUrl(target, articleId),
    };
  }

  async update(remoteId: string, note: PublishableNote, target: CsdnTargetConfig): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const input = resolveCsdnPublishInput(note, target);
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
