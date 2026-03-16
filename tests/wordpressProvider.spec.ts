import { App, requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote, ResolvedAsset } from "../src/core/note";
import { WordpressProvider } from "../src/providers/wordpressProvider";
import { WordpressTargetConfig } from "../src/types";

function createApp(bytes: number[]): App {
  return {
    vault: {
      adapter: {
        readBinary: async () => Uint8Array.from(bytes),
      },
    },
  } as unknown as App;
}

function createNote(): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "![[assets/cover.png|Cover]]",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Excerpt",
    slug: "post",
    tags: [],
    categories: [],
  };
}

function createAsset(): ResolvedAsset {
  return {
    reference: {
      originalText: "![[assets/cover.png|Cover]]",
      rawTarget: "assets/cover.png",
      altText: "Cover",
      source: "wiki-embed",
    },
    sourcePath: "assets/cover.png",
    fileName: "cover.png",
  };
}

function createTarget(): WordpressTargetConfig {
  return {
    id: "wordpress-target",
    name: "WordPress",
    enabled: true,
    provider: "wordpress",
    endpoint: "https://wp.example",
    username: "demo",
    appPassword: "secret",
    defaultStatus: "draft",
    contentFormat: "html",
  };
}

describe("WordpressProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it("uploads binary image data to the WordPress media endpoint", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 201,
      text: JSON.stringify({ id: 7, source_url: "https://wp.example/uploads/cover.png" }),
    } as never);

    const provider = new WordpressProvider(createApp([1, 2, 3]));

    expect(provider.getMediaSupport(createTarget())).toEqual({ mode: "native-upload" });

    const result = await provider.uploadAsset(createAsset(), createNote(), createTarget());

    expect(result.url).toBe("https://wp.example/uploads/cover.png");
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://wp.example/wp-json/wp/v2/media",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "Content-Disposition": expect.stringContaining('filename="cover.png"'),
        }),
      })
    );
  });
});
