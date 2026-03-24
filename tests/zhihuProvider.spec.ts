import { App, requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { ZhihuProvider } from "../src/providers/zhihuProvider";
import { ZhihuTargetConfig } from "../src/types";

const { renderMarkdownToHtmlMock } = vi.hoisted(() => ({
  renderMarkdownToHtmlMock: vi.fn<() => Promise<string>>(),
}));

vi.mock("../src/core/html", () => ({
  renderMarkdownToHtml: renderMarkdownToHtmlMock,
}));

function createApp(): App {
  return {} as App;
}

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

function createTarget(): ZhihuTargetConfig {
  return {
    id: "zhihu-target",
    name: "Zhihu",
    enabled: true,
    provider: "zhihu",
    cookie: "z_c0=demo",
    defaultColumnId: "column-1",
    defaultColumnTitle: "Demo Column",
  };
}

describe("ZhihuProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
    renderMarkdownToHtmlMock.mockReset();
    renderMarkdownToHtmlMock.mockResolvedValue("<h1>Post</h1>");
  });

  it("validates a zhihu cookie via the current-user endpoint", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: { uid: "1001", name: "demo" },
      text: JSON.stringify({ uid: "1001", name: "demo" }),
    } as never);

    const provider = new ZhihuProvider(createApp());

    await expect(provider.validateConfig(createTarget())).resolves.toBeUndefined();
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("/api/v4/me"),
        headers: expect.objectContaining({
          Cookie: "z_c0=demo",
        }),
      })
    );
  });

  it("publishes and returns the zhihu article id and preview url", async () => {
    vi.mocked(requestUrl)
      .mockResolvedValueOnce({
        status: 200,
        json: { id: 123 },
        text: JSON.stringify({ id: 123 }),
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        json: { success: true },
        text: JSON.stringify({ success: true }),
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        json: { success: true },
        text: JSON.stringify({ success: true }),
      } as never);

    const provider = new ZhihuProvider(createApp());

    expect(provider.getMediaSupport(createTarget())).toEqual({ mode: "unsupported" });

    const result = await provider.publish(createNote(), createTarget());

    expect(result).toEqual({
      remoteId: "123",
      remoteUrl: "https://zhuanlan.zhihu.com/p/123",
    });
    expect(requestUrl).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "POST",
        url: "https://zhuanlan.zhihu.com/api/articles/drafts",
      })
    );
    expect(requestUrl).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "POST",
        url: "https://www.zhihu.com/api/v4/columns/column-1/items",
      })
    );
  });
});
