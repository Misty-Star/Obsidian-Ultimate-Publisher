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
import { resolveZhihuPublishInput } from "../core/webPublishConfig";
import { ZhihuTargetConfig } from "../types";

interface ZhihuDraftResponse {
  id?: number | string;
}

interface ZhihuAccountResponse {
  uid?: string;
  name?: string;
  avatar_url?: string;
}

interface ZhihuColumnContributionResponse {
  data?: Array<{
    column?: {
      id?: number | string;
      title?: string;
      url?: string;
    };
  }>;
}

function buildHeaders(target: ZhihuTargetConfig): Record<string, string> {
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

async function requestZhihu<T>(
  target: ZhihuTargetConfig,
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
    throw new Error(`Zhihu request failed (${response.status}): ${response.text}`);
  }

  return readJsonPayload<T>(response);
}

function buildPreviewUrl(articleId: string): string {
  return `https://zhuanlan.zhihu.com/p/${articleId}`;
}

export class ZhihuProvider implements PublisherProvider<ZhihuTargetConfig> {
  readonly provider = "zhihu" as const;

  constructor(private readonly app: App) {}

  getMediaSupport(_target: ZhihuTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async loadNormalPublishOptions(target: ZhihuTargetConfig) {
    const response = await requestZhihu<ZhihuColumnContributionResponse>(
      target,
      "https://www.zhihu.com/api/v4/members/self/column-contributions?include=data%5B*%5D.column.intro%2Cfollowers%2Carticles_count%2Cvoteup_count%2Citems_count&offset=0&limit=20"
    );

    return {
      zhihuColumns: (response.data ?? [])
        .map((item) => item.column)
        .filter((column): column is NonNullable<typeof column> => Boolean(column?.id && column?.title))
        .map((column) => ({
          id: String(column.id),
          label: column.title ?? String(column.id),
          description: column.url,
        })),
    };
  }

  async validateConfig(target: ZhihuTargetConfig): Promise<void> {
    if (!target.cookie) {
      throw new Error("Zhihu target is missing Cookie.");
    }

    await this.getAccountSummary(target);
  }

  async getAccountSummary(target: ZhihuTargetConfig): Promise<{
    accountId?: string;
    accountName?: string;
    accountAvatarUrl?: string;
  }> {
    const account = await requestZhihu<ZhihuAccountResponse>(
      target,
      "https://www.zhihu.com/api/v4/me?include=account_status%2Cis_bind_phone%2Cis_force_renamed%2Cemail%2Crenamed_fullname"
    );

    if (!account.uid) {
      throw new Error("Zhihu validation failed: not logged in or cookie expired.");
    }

    return {
      accountId: account.uid ? String(account.uid) : undefined,
      accountName: account.name,
      accountAvatarUrl: account.avatar_url,
    };
  }

  async publish(
    note: PublishableNote,
    target: ZhihuTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<ZhihuTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const { columnId } = resolveZhihuPublishInput(
      note,
      target,
      context?.provider.provider === "zhihu" ? context.provider : undefined
    );
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    const draft = await requestZhihu<ZhihuDraftResponse>(
      target,
      "https://zhuanlan.zhihu.com/api/articles/drafts",
      "POST",
      {
        title: note.title,
        content: html,
      }
    );

    const articleId = String(draft.id ?? "");
    if (!articleId) {
      throw new Error("Zhihu publish failed: draft id missing.");
    }

    await requestZhihu(
      target,
      `https://zhuanlan.zhihu.com/api/articles/${articleId}/publish`,
      "PUT",
      {
        column: null,
        commentPermission: "anyone",
        disclaimer_type: "none",
        disclaimer_status: "close",
        table_of_contents_enabled: false,
        commercial_report_info: { commercial_types: [] },
        commercial_zhitask_bind_info: null,
      }
    );
    if (columnId) {
      await requestZhihu(
        target,
        `https://www.zhihu.com/api/v4/columns/${encodeURIComponent(columnId)}/items`,
        "POST",
        {
          type: "article",
          id: articleId,
        }
      );
    }

    return {
      remoteId: articleId,
      remoteUrl: buildPreviewUrl(articleId),
    };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: ZhihuTargetConfig,
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<ZhihuTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    void context;
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);

    await requestZhihu(
      target,
      `https://zhuanlan.zhihu.com/api/articles/${encodeURIComponent(remoteId)}/draft`,
      "PATCH",
      {
        title: note.title,
        content: html,
        table_of_contents: false,
        delta_time: 10,
      }
    );
    await requestZhihu(
      target,
      `https://zhuanlan.zhihu.com/api/articles/${encodeURIComponent(remoteId)}/publish`,
      "PUT",
      {
        disclaimer_type: "none",
        disclaimer_status: "close",
        table_of_contents_enabled: false,
        commercial_report_info: { commercial_types: [] },
        commercial_zhitask_bind_info: null,
      }
    );

    return {
      remoteId,
      remoteUrl: buildPreviewUrl(remoteId),
    };
  }

  async delete(remoteId: string, target: ZhihuTargetConfig): Promise<void> {
    await requestZhihu(target, `https://www.zhihu.com/api/v4/articles/${encodeURIComponent(remoteId)}`, "DELETE");
  }

  async getPreviewUrl(remoteId: string): Promise<string | undefined> {
    return buildPreviewUrl(remoteId);
  }
}
