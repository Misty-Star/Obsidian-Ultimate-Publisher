import { App, requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import {
  BilibiliProvider,
  HaloWebProvider,
  JianshuProvider,
  WechatProvider,
  XiaohongshuProvider,
} from "../src/providers/webCookieProvider";
import {
  BilibiliTargetConfig,
  HaloWebTargetConfig,
  JianshuTargetConfig,
  WechatTargetConfig,
  XiaohongshuTargetConfig,
} from "../src/types";

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
    tags: ["tag"],
    categories: ["cat"],
  };
}

const providerCases = [
  {
    label: "Jianshu",
    provider: () => new JianshuProvider(createApp()),
    target: {
      id: "jianshu-target",
      name: "Jianshu",
      enabled: true,
      provider: "jianshu",
      cookie: "remember_user_token=demo",
    } satisfies JianshuTargetConfig,
    validateUrl: "https://www.jianshu.com/users/current",
    publishUrl: "https://www.jianshu.com/author/notes",
    updateUrl: "https://www.jianshu.com/author/notes/remote-1",
    previewUrl: "https://www.jianshu.com/p/remote-1",
  },
  {
    label: "WeChat Official Account",
    provider: () => new WechatProvider(createApp()),
    target: {
      id: "wechat-target",
      name: "WeChat Official Account",
      enabled: true,
      provider: "wechat",
      cookie: "slave_sid=demo",
    } satisfies WechatTargetConfig,
    validateUrl: "https://mp.weixin.qq.com/cgi-bin/home?t=home/index",
    publishUrl: "https://mp.weixin.qq.com/cgi-bin/appmsg",
    updateUrl:
      "https://mp.weixin.qq.com/cgi-bin/appmsg?action=update&appmsgid=remote-1",
    previewUrl: "https://mp.weixin.qq.com/s/remote-1",
  },
  {
    label: "Halo Web",
    provider: () => new HaloWebProvider(createApp()),
    target: {
      id: "halo-web-target",
      name: "Halo Web",
      enabled: true,
      provider: "halo-web",
      cookie: "SESSION=demo",
      baseUrl: "https://halo.example.com/",
    } satisfies HaloWebTargetConfig,
    validateUrl: "https://halo.example.com/console/api/users/-/profile",
    publishUrl: "https://halo.example.com/console/api/contents/posts",
    updateUrl: "https://halo.example.com/console/api/contents/posts/remote-1",
    previewUrl: "https://halo.example.com/archives/remote-1",
  },
  {
    label: "Bilibili",
    provider: () => new BilibiliProvider(createApp()),
    target: {
      id: "bilibili-target",
      name: "Bilibili",
      enabled: true,
      provider: "bilibili",
      cookie: "SESSDATA=demo; bili_jct=csrf",
    } satisfies BilibiliTargetConfig,
    validateUrl: "https://api.bilibili.com/x/web-interface/nav",
    publishUrl: "https://member.bilibili.com/x/web/article/add",
    updateUrl: "https://member.bilibili.com/x/web/article/update?id=remote-1",
    previewUrl: "https://www.bilibili.com/read/cvremote-1",
  },
  {
    label: "Xiaohongshu",
    provider: () => new XiaohongshuProvider(createApp()),
    target: {
      id: "xiaohongshu-target",
      name: "Xiaohongshu",
      enabled: true,
      provider: "xiaohongshu",
      cookie: "web_session=demo",
    } satisfies XiaohongshuTargetConfig,
    validateUrl: "https://edith.xiaohongshu.com/api/sns/web/v1/user/selfinfo",
    publishUrl: "https://edith.xiaohongshu.com/api/sns/web/v1/note",
    updateUrl: "https://edith.xiaohongshu.com/api/sns/web/v1/note/remote-1",
    previewUrl: "https://www.xiaohongshu.com/explore/remote-1",
  },
] as const;

describe("WebCookieProvider web-auth providers", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
    renderMarkdownToHtmlMock.mockReset();
    renderMarkdownToHtmlMock.mockResolvedValue("<h1>Post</h1>");
  });

  for (const providerCase of providerCases) {
    it(`validates ${providerCase.label} cookies via its account endpoint`, async () => {
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: { data: { id: "user-1", name: "demo" } },
        text: JSON.stringify({ data: { id: "user-1", name: "demo" } }),
      } as never);

      await expect(
        providerCase.provider().validateConfig(providerCase.target),
      ).resolves.toBeUndefined();
      expect(requestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: providerCase.validateUrl,
          headers: expect.objectContaining({
            Cookie: providerCase.target.cookie,
          }),
        }),
      );
    });

    it(`publishes and updates ${providerCase.label} posts`, async () => {
      vi.mocked(requestUrl)
        .mockResolvedValueOnce({
          status: 200,
          json: { data: { id: "remote-1" } },
          text: JSON.stringify({ data: { id: "remote-1" } }),
        } as never)
        .mockResolvedValueOnce({
          status: 200,
          json: { data: { id: "remote-1" } },
          text: JSON.stringify({ data: { id: "remote-1" } }),
        } as never);

      const provider = providerCase.provider();
      expect(provider.getMediaSupport(providerCase.target)).toEqual({
        mode: "unsupported",
      });

      await expect(
        provider.publish(createNote(), providerCase.target),
      ).resolves.toEqual({
        remoteId: "remote-1",
        remoteUrl: providerCase.previewUrl,
      });
      await expect(
        provider.update("remote-1", createNote(), providerCase.target),
      ).resolves.toEqual({
        remoteId: "remote-1",
        remoteUrl: providerCase.previewUrl,
      });

      expect(requestUrl).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          method: "POST",
          url: providerCase.publishUrl,
          headers: expect.objectContaining({
            Cookie: providerCase.target.cookie,
          }),
        }),
      );
      expect(
        JSON.parse(String(vi.mocked(requestUrl).mock.calls[0]?.[0].body)),
      ).toMatchObject({
        title: "Post",
        markdown: "# Post",
        html: "<h1>Post</h1>",
      });
      expect(requestUrl).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          method: "PUT",
          url: providerCase.updateUrl,
        }),
      );
    });

    it(`makes delete support explicit for ${providerCase.label}`, async () => {
      await expect(
        providerCase.provider().delete("remote-1", providerCase.target),
      ).rejects.toThrow("does not support delete");
    });
  }
});
