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
          accept: "*/*",
          "content-type": "application/json",
          "x-ca-key": "203803574",
          "x-ca-signature-headers": "x-ca-key,x-ca-nonce",
          "x-ca-nonce": expect.any(String),
          "x-ca-signature": expect.any(String),
        }),
      })
    );
  });

  it("rejects csdn validation when the user info payload has no username", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: { data: {} },
      text: JSON.stringify({ data: {} }),
    } as never);

    const provider = new CsdnProvider(createApp());

    await expect(provider.validateConfig(createTarget())).rejects.toThrow("CSDN validation failed");
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
    expect(request?.headers).toEqual(
      expect.objectContaining({
        Cookie: "UserName=demo;",
        accept: "*/*",
        "content-type": "application/json",
        "x-ca-key": "203803574",
        "x-ca-signature-headers": "x-ca-key,x-ca-nonce",
        "x-ca-nonce": expect.any(String),
        "x-ca-signature": expect.any(String),
      })
    );
    expect(JSON.parse(String(request?.body))).toMatchObject({
      title: "Post",
      markdowncontent: "# Post",
      content: "<h1>Post</h1>",
      categories: "后端",
      tags: "Obsidian",
      readType: "public",
      level: 0,
      status: 0,
      type: "original",
      original_link: "",
      authorized_status: false,
      not_auto_saved: "1",
      source: "pc_mdeditor",
      cover_images: [],
      cover_type: 1,
      is_new: 1,
      vote_id: 0,
      resource_id: "",
      pubStatus: "publish",
    });
  });

  it("surfaces the backend error when CSDN publish rejects the payload", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: { code: 400, msg: "分类不能为空" },
      text: JSON.stringify({ code: 400, msg: "分类不能为空" }),
    } as never);

    const provider = new CsdnProvider(createApp());

    await expect(provider.publish(createNote(), createTarget())).rejects.toThrow(
      "CSDN publish failed: 分类不能为空"
    );
  });

  it("loads csdn remote category options for detailed publish", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: {
        code: 200,
        data: {
          list: {
            column: [
              {
                id: "column-1",
                edit_title: "专栏一",
                column_url: "https://blog.csdn.net/column-1",
                desc: "说明",
              },
            ],
            pay_column: [],
          },
        },
      },
      text: JSON.stringify({
        code: 200,
        data: {
          list: {
            column: [
              {
                id: "column-1",
                edit_title: "专栏一",
                column_url: "https://blog.csdn.net/column-1",
                desc: "说明",
              },
            ],
            pay_column: [],
          },
        },
      }),
    } as never);

    const provider = new CsdnProvider(createApp());
    const result = await provider.loadNormalPublishOptions?.(createTarget());

    expect(result).toEqual({
      csdnCategories: [
        {
          id: "column-1",
          label: "专栏一",
          description: "https://blog.csdn.net/column-1",
        },
      ],
      csdnTags: [],
    });
  });
});
