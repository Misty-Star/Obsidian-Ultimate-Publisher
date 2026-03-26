import { requestUrl } from "obsidian";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import { assertRemoteAssetsSupported, MediaSupport, PublisherProvider, PublishResult } from "../core/providers";
import { PublishableNote } from "../core/note";
import { resolveJuejinPublishInput } from "../core/webPublishConfig";
import { JuejinTargetConfig } from "../types";

interface JuejinResponse<T> {
  err_no?: number;
  err_msg?: string;
  data?: T;
}

interface JuejinDraftPayload {
  id?: string;
}

interface JuejinPublishPayload {
  article_id?: string;
}

interface JuejinUserPayload {
  user_id?: string;
  user_name?: string;
  avatar_large?: string;
}

interface JuejinCategoryPayload {
  category_id?: string;
  category?: {
    category_name?: string;
  };
}

interface JuejinTagPayload {
  tag_id?: string;
  tag?: {
    tag_name?: string;
  };
}

function buildHeaders(target: JuejinTargetConfig): Record<string, string> {
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

function encodeRemoteId(articleId: string, draftId: string): string {
  return `${articleId}_${draftId}`;
}

function decodeRemoteId(remoteId: string): { articleId: string; draftId: string } {
  const [articleId, draftId] = remoteId.split("_");
  return {
    articleId,
    draftId,
  };
}

async function requestJuejin<T>(
  target: JuejinTargetConfig,
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  body?: unknown
): Promise<JuejinResponse<T>> {
  const response = await requestUrl({
    url,
    method,
    headers: buildHeaders(target),
    body: body ? JSON.stringify(body) : undefined,
    throw: false,
  });

  if (response.status >= 400) {
    throw new Error(`Juejin request failed (${response.status}): ${response.text}`);
  }

  return readJsonPayload<JuejinResponse<T>>(response);
}

function buildPreviewUrl(articleId: string): string {
  return `https://juejin.cn/post/${articleId}`;
}

export class JuejinProvider implements PublisherProvider<JuejinTargetConfig> {
  readonly provider = "juejin" as const;

  getMediaSupport(_target: JuejinTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async loadNormalPublishOptions(target: JuejinTargetConfig) {
    const categories = await requestJuejin<JuejinCategoryPayload[]>(
      target,
      "https://api.juejin.cn/tag_api/v1/query_category_list",
      "POST"
    );
    const tags = await requestJuejin<JuejinTagPayload[]>(
      target,
      "https://api.juejin.cn/tag_api/v1/query_tag_list",
      "POST",
      {
        cursor: "0",
        key_word: "",
        limit: 10,
        sort_type: 1,
      }
    );

    return {
      juejinCategories: (categories.data ?? [])
        .filter((item) => item.category_id && item.category?.category_name)
        .map((item) => ({
          id: String(item.category_id),
          label: item.category?.category_name ?? String(item.category_id),
        })),
      juejinTags: (tags.data ?? [])
        .filter((item) => item.tag_id && item.tag?.tag_name)
        .map((item) => ({
          id: String(item.tag_id),
          label: item.tag?.tag_name ?? String(item.tag_id),
        })),
    };
  }

  async validateConfig(target: JuejinTargetConfig): Promise<void> {
    if (!target.cookie) {
      throw new Error("Juejin target is missing Cookie.");
    }

    await this.getAccountSummary(target);
  }

  async getAccountSummary(target: JuejinTargetConfig): Promise<{
    accountId?: string;
    accountName?: string;
    accountAvatarUrl?: string;
  }> {
    const response = await requestJuejin<JuejinUserPayload>(
      target,
      "https://api.juejin.cn/user_api/v1/user/get",
      "GET"
    );

    if (response.err_no !== 0 || !response.data?.user_id) {
      throw new Error(`Juejin validation failed: ${response.err_msg ?? "unknown error"}`);
    }

    return {
      accountId: response.data.user_id,
      accountName: response.data.user_name,
      accountAvatarUrl: response.data.avatar_large,
    };
  }

  async publish(
    note: PublishableNote,
    target: JuejinTargetConfig,
    context?: NormalPublishExecutionContext
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const input = resolveJuejinPublishInput(
      note,
      target,
      context?.provider.provider === "juejin" ? context.provider : undefined
    );
    const draftResponse = await requestJuejin<JuejinDraftPayload>(
      target,
      "https://api.juejin.cn/content_api/v1/article_draft/create",
      "POST",
      {
        category_id: input.categoryId,
        tag_ids: input.tagIds,
        link_url: "",
        cover_image: "",
        title: note.title,
        brief_content: input.briefContent,
        edit_type: 10,
        html_content: "deprecated",
        mark_content: note.markdown,
        theme_ids: [],
      }
    );

    const draftId = String(draftResponse.data?.id ?? "");
    if (draftResponse.err_no !== 0 || !draftId) {
      throw new Error(`Juejin draft creation failed: ${draftResponse.err_msg ?? "unknown error"}`);
    }

    const publishResponse = await requestJuejin<JuejinPublishPayload>(
      target,
      "https://api.juejin.cn/content_api/v1/article/publish",
      "POST",
      {
        draft_id: draftId,
        sync_to_org: false,
        column_ids: [],
        theme_ids: [],
      }
    );

    const articleId = String(publishResponse.data?.article_id ?? "");
    if (publishResponse.err_no !== 0 || !articleId) {
      throw new Error(`Juejin publish failed: ${publishResponse.err_msg ?? "unknown error"}`);
    }

    return {
      remoteId: encodeRemoteId(articleId, draftId),
      remoteUrl: buildPreviewUrl(articleId),
    };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: JuejinTargetConfig,
    context?: NormalPublishExecutionContext
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const input = resolveJuejinPublishInput(
      note,
      target,
      context?.provider.provider === "juejin" ? context.provider : undefined
    );
    const { articleId, draftId } = decodeRemoteId(remoteId);
    const draftResponse = await requestJuejin<JuejinDraftPayload>(
      target,
      "https://api.juejin.cn/content_api/v1/article_draft/update",
      "POST",
      {
        id: draftId,
        category_id: input.categoryId,
        tag_ids: input.tagIds,
        link_url: "",
        cover_image: "",
        title: note.title,
        brief_content: input.briefContent,
        edit_type: 10,
        html_content: "deprecated",
        mark_content: note.markdown,
        theme_ids: [],
      }
    );

    if (draftResponse.err_no !== 0) {
      throw new Error(`Juejin update failed: ${draftResponse.err_msg ?? "unknown error"}`);
    }

    const publishResponse = await requestJuejin<JuejinPublishPayload>(
      target,
      "https://api.juejin.cn/content_api/v1/article/publish",
      "POST",
      {
        draft_id: draftId,
        sync_to_org: false,
        column_ids: [],
        theme_ids: [],
      }
    );

    if (publishResponse.err_no !== 0) {
      throw new Error(`Juejin publish failed: ${publishResponse.err_msg ?? "unknown error"}`);
    }

    return {
      remoteId: encodeRemoteId(articleId, draftId),
      remoteUrl: buildPreviewUrl(articleId),
    };
  }

  async delete(remoteId: string, target: JuejinTargetConfig): Promise<void> {
    const { articleId } = decodeRemoteId(remoteId);
    const response = await requestJuejin(
      target,
      "https://api.juejin.cn/content_api/v1/article/delete",
      "POST",
      {
        article_id: articleId,
      }
    );

    if (response.err_no !== 0) {
      throw new Error(`Juejin delete failed: ${response.err_msg ?? "unknown error"}`);
    }
  }

  async getPreviewUrl(remoteId: string): Promise<string | undefined> {
    const { articleId } = decodeRemoteId(remoteId);
    return buildPreviewUrl(articleId);
  }
}
