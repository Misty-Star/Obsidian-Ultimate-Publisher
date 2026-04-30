import { requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { ConfluenceProvider, HaloProvider, NotionProvider, TelegraphProvider } from "../src/providers/apiProviders";
import { ConfluenceTargetConfig, HaloTargetConfig, NotionTargetConfig, TelegraphTargetConfig } from "../src/types";

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
    tags: ["TypeScript"],
    categories: ["Tech"],
  };
}

const notionTarget: NotionTargetConfig = {
  id: "notion-target",
  name: "Notion",
  enabled: true,
  provider: "notion",
  token: "secret",
  databaseId: "db-1",
  parentPageId: "",
  notionVersion: "2022-06-28",
};

const haloTarget: HaloTargetConfig = {
  id: "halo-target",
  name: "Halo API",
  enabled: true,
  provider: "halo",
  baseUrl: "https://halo.example.com/",
  token: "secret",
  defaultCategory: "tech",
  defaultTags: ["ts"],
  defaultPublish: false,
};

const telegraphTarget: TelegraphTargetConfig = {
  id: "telegraph-target",
  name: "Telegraph",
  enabled: true,
  provider: "telegraph",
  accessToken: "secret",
  authorName: "Misty",
};

const confluenceTarget: ConfluenceTargetConfig = {
  id: "confluence-target",
  name: "Confluence",
  enabled: true,
  provider: "confluence",
  baseUrl: "https://example.atlassian.net/wiki/",
  username: "misty@example.com",
  apiToken: "secret",
  spaceKey: "DOC",
  parentId: "42",
};

describe("API providers", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it("publishes Notion pages into a configured database", async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 200, text: JSON.stringify({ id: "page-1", url: "https://notion.so/page-1" }) } as never);

    const result = await new NotionProvider().publish(createNote(), notionTarget, { common: { title: "Custom" }, provider: undefined });

    expect(result).toEqual({ remoteId: "page-1", remoteUrl: "https://notion.so/page-1" });
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.notion.com/v1/pages",
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret", "Notion-Version": "2022-06-28" }),
        body: expect.stringContaining('"database_id":"db-1"'),
      })
    );
    expect(vi.mocked(requestUrl).mock.calls[0]?.[0].body).toContain("Custom");
  });

  it("publishes Halo API posts with normalized base URL", async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 200, text: JSON.stringify({ metadata: { name: "post-1" }, status: { permalink: "https://halo.example.com/archives/post" } }) } as never);

    const result = await new HaloProvider().publish(createNote(), haloTarget);

    expect(result.remoteId).toBe("post-1");
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://halo.example.com/apis/uc.api.content.halo.run/v1alpha1/posts",
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
        body: expect.stringContaining('"rawType":"markdown"'),
      })
    );
  });

  it("publishes and explicitly rejects delete for Telegraph pages", async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 200, text: JSON.stringify({ ok: true, result: { path: "Post-01", url: "https://telegra.ph/Post-01" } }) } as never);

    const provider = new TelegraphProvider();
    await expect(provider.publish(createNote(), telegraphTarget)).resolves.toEqual({ remoteId: "Post-01", remoteUrl: "https://telegra.ph/Post-01" });
    await expect(provider.delete("Post-01", telegraphTarget)).rejects.toThrow("does not support deleting");

    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.telegra.ph/createPage",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );
    expect(vi.mocked(requestUrl).mock.calls[0]?.[0].body).toContain("access_token=secret");
  });

  it("updates Confluence pages after reading the current version", async () => {
    vi.mocked(requestUrl)
      .mockResolvedValueOnce({ status: 200, text: JSON.stringify({ id: "99", version: { number: 3 } }) } as never)
      .mockResolvedValueOnce({ status: 200, text: JSON.stringify({ id: "99", _links: { base: "https://example.atlassian.net/wiki", webui: "/spaces/DOC/pages/99" } }) } as never);

    const result = await new ConfluenceProvider().update("99", createNote(), confluenceTarget, { common: { title: "Updated" }, provider: undefined });

    expect(result).toEqual({ remoteId: "99", remoteUrl: "https://example.atlassian.net/wiki/spaces/DOC/pages/99" });
    expect(requestUrl).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: "https://example.atlassian.net/wiki/rest/api/content/99",
        method: "PUT",
        headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }),
        body: expect.stringContaining('"number":4'),
      })
    );
  });
});
