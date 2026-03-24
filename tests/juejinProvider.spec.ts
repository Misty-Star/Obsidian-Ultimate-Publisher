import { requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { JuejinProvider } from "../src/providers/juejinProvider";
import { JuejinTargetConfig } from "../src/types";

function createNote(): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "# Post",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Excerpt",
    slug: "post",
    tags: [],
    categories: [],
  };
}

function createTarget(): JuejinTargetConfig {
  return {
    id: "juejin-target",
    name: "Juejin",
    enabled: true,
    provider: "juejin",
    cookie: "sessionid=demo",
    defaultCategoryId: "category-1",
    defaultCategoryName: "Backend",
    defaultTagIds: ["tag-1", "tag-2"],
    defaultTagNames: ["Tag 1", "Tag 2"],
    defaultBriefContent: "Default brief content for juejin",
  };
}

describe("JuejinProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it("validates a juejin cookie via the user info endpoint", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: { err_no: 0, data: { user_id: "42", user_name: "demo" } },
      text: JSON.stringify({ err_no: 0, data: { user_id: "42", user_name: "demo" } }),
    } as never);

    const provider = new JuejinProvider();

    await expect(provider.validateConfig(createTarget())).resolves.toBeUndefined();
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.juejin.cn/user_api/v1/user/get",
        headers: expect.objectContaining({
          Cookie: "sessionid=demo",
        }),
      })
    );
  });

  it("stores articleId and draftId together in remoteId", async () => {
    vi.mocked(requestUrl)
      .mockResolvedValueOnce({
        status: 200,
        json: { err_no: 0, data: { id: "draft-9" } },
        text: JSON.stringify({ err_no: 0, data: { id: "draft-9" } }),
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        json: { err_no: 0, data: { article_id: "article-1" } },
        text: JSON.stringify({ err_no: 0, data: { article_id: "article-1" } }),
      } as never);

    const provider = new JuejinProvider();
    const result = await provider.publish(createNote(), createTarget());

    expect(provider.getMediaSupport(createTarget())).toEqual({ mode: "unsupported" });
    expect(result).toEqual({
      remoteId: "article-1_draft-9",
      remoteUrl: "https://juejin.cn/post/article-1",
    });
  });
});
