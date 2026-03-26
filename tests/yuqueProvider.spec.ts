import { requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NormalPublishExecutionContext } from "../src/core/normalPublish/types";
import { PublishableNote } from "../src/core/note";
import { YuqueProvider } from "../src/providers/yuqueProvider";
import { YuqueTargetConfig } from "../src/types";

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

function createTarget(): YuqueTargetConfig {
  return {
    id: "yuque-target",
    name: "Yuque",
    enabled: true,
    provider: "yuque",
    baseUrl: "https://www.yuque.com",
    repo: "demo/repo",
    token: "secret",
    publicLevel: 0,
  };
}

describe("YuqueProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it("uses per-publish slug and public-level overrides", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      json: {
        data: {
          id: 7,
          public_url: "https://www.yuque.com/demo/repo/custom-slug",
        },
      },
    } as never);

    const provider = new YuqueProvider();
    const context: NormalPublishExecutionContext = {
      common: {
        title: "Post",
      },
      provider: {
        provider: "yuque",
        slug: "custom-slug",
        publicLevel: 1,
      },
    };

    await provider.publish(createNote(), createTarget(), context);

    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://www.yuque.com/api/v2/repos/demo%2Frepo/docs",
        body: expect.stringContaining('"slug":"custom-slug"'),
      })
    );
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('"public":1'),
      })
    );
  });
});
