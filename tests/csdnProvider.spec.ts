import { App, requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { CsdnProvider } from "../src/providers/csdnProvider";
import { CsdnTargetConfig } from "../src/types";

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
    tags: ["Obsidian"],
    categories: ["后端"],
  };
}

function createTarget(): CsdnTargetConfig {
  return {
    id: "csdn-target",
    name: "CSDN",
    enabled: true,
    provider: "csdn",
    cookie: "UserName=demo;",
    defaultCategories: [],
    defaultTags: [],
  };
}

describe("CsdnProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
    renderMarkdownToHtmlMock.mockReset();
    renderMarkdownToHtmlMock.mockResolvedValue("<h1>Post</h1>");
  });

  it("validates a csdn cookie via the user info endpoint", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: { data: { username: "demo" } },
      text: JSON.stringify({ data: { username: "demo" } }),
    } as never);

    const provider = new CsdnProvider(createApp());

    await expect(provider.validateConfig(createTarget())).resolves.toBeUndefined();
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://bizapi.csdn.net/blog-console-api/v1/user/info",
        headers: expect.objectContaining({
          Cookie: "UserName=demo;",
        }),
      })
    );
  });

  it("publishes markdown and html content to the mdeditor endpoint", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: { code: 200, data: { id: 321 } },
      text: JSON.stringify({ code: 200, data: { id: 321 } }),
    } as never);

    const provider = new CsdnProvider(createApp());
    const result = await provider.publish(createNote(), createTarget());

    expect(provider.getMediaSupport(createTarget())).toEqual({ mode: "unsupported" });
    expect(result).toEqual({
      remoteId: "321",
      remoteUrl: "https://blog.csdn.net/demo/article/details/321",
    });

    const request = vi.mocked(requestUrl).mock.calls[0]?.[0];
    expect(request?.url).toBe("https://bizapi.csdn.net/blog-console-api/v3/mdeditor/saveArticle");
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      title: "Post",
      markdowncontent: "# Post",
      content: "<h1>Post</h1>",
      categories: "后端",
      tags: "Obsidian",
    });
  });
});
