import { describe, expect, it, vi } from "vitest";
import { prepareNoteForPublish } from "../src/core/mediaPipeline";
import { PublishableNote } from "../src/core/note";
import { PublishTargetConfig } from "../src/types";

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "![[assets/cover.png|Cover]]",
    frontmatter: {},
    attachments: [
      {
        reference: {
          originalText: "![[assets/cover.png|Cover]]",
          rawTarget: "assets/cover.png",
          altText: "Cover",
          source: "wiki-embed",
        },
        sourcePath: "assets/cover.png",
        fileName: "cover.png",
      },
    ],
    unresolvedAttachments: [],
    excerpt: "Excerpt",
    slug: "post",
    tags: [],
    categories: [],
    ...overrides,
  };
}

function createTarget(provider: PublishTargetConfig["provider"]): PublishTargetConfig {
  if (provider === "wordpress") {
    return {
      id: "wordpress-target",
      name: "WordPress",
      enabled: true,
      provider,
      endpoint: "https://example.com",
      username: "demo",
      appPassword: "secret",
      defaultStatus: "draft",
      contentFormat: "html",
    };
  }

  if (provider === "yuque") {
    return {
      id: "yuque-target",
      name: "Yuque",
      enabled: true,
      provider,
      baseUrl: "https://www.yuque.com",
      repo: "demo/repo",
      token: "token",
      publicLevel: 0,
    };
  }

  return {
    id: "local-target",
    name: "Local Export",
    enabled: true,
    provider,
    outputDir: "E:/exports",
    yamlType: "default",
    assetDirName: "assets",
  };
}

describe("prepareNoteForPublish", () => {
  it("fails early when a provider does not support local images", async () => {
    const provider = {
      provider: "yuque" as const,
      getMediaSupport: () => ({ mode: "unsupported" as const }),
    };

    await expect(prepareNoteForPublish(createNote(), createTarget("yuque"), provider as never)).rejects.toThrow(
      "does not support local Obsidian images"
    );
  });

  it("fails when a referenced local image cannot be resolved", async () => {
    const provider = {
      provider: "wordpress" as const,
      getMediaSupport: () => ({ mode: "native-upload" as const }),
      uploadAsset: vi.fn(),
    };

    await expect(
      prepareNoteForPublish(
        createNote({
          attachments: [],
          unresolvedAttachments: [
            {
              reason: "missing",
              reference: {
                originalText: "![[assets/missing.png]]",
                rawTarget: "assets/missing.png",
                altText: "",
                source: "wiki-embed",
              },
            },
          ],
        }),
        createTarget("wordpress"),
        provider as never
      )
    ).rejects.toThrow("Missing local image asset");
  });

  it("rewrites local-copy assets using provider returned relative paths", async () => {
    const copyAsset = vi.fn().mockResolvedValue({ url: "./assets/post-cover.png" });
    const provider = {
      provider: "local-export" as const,
      getMediaSupport: () => ({ mode: "local-copy" as const }),
      copyAsset,
    };

    const prepared = await prepareNoteForPublish(createNote(), createTarget("local-export"), provider as never);

    expect(copyAsset).toHaveBeenCalledTimes(1);
    expect(prepared.markdown).toBe("![Cover](./assets/post-cover.png)");
    expect(prepared.mediaReplacements).toEqual([
      {
        sourcePath: "assets/cover.png",
        replacementPath: "./assets/post-cover.png",
      },
    ]);
  });

  it("deduplicates repeated native uploads for the same asset", async () => {
    const uploadAsset = vi.fn().mockResolvedValue({ url: "https://cdn.example.com/cover.png" });
    const provider = {
      provider: "wordpress" as const,
      getMediaSupport: () => ({ mode: "native-upload" as const }),
      uploadAsset,
    };

    const prepared = await prepareNoteForPublish(
      createNote({
        markdown: "![[assets/cover.png|Cover]]\n![Again](assets/cover.png)",
        attachments: [
          {
            reference: {
              originalText: "![[assets/cover.png|Cover]]",
              rawTarget: "assets/cover.png",
              altText: "Cover",
              source: "wiki-embed",
            },
            sourcePath: "assets/cover.png",
            fileName: "cover.png",
          },
          {
            reference: {
              originalText: "![Again](assets/cover.png)",
              rawTarget: "assets/cover.png",
              altText: "Again",
              source: "markdown-image",
            },
            sourcePath: "assets/cover.png",
            fileName: "cover.png",
          },
        ],
      }),
      createTarget("wordpress"),
      provider as never
    );

    expect(uploadAsset).toHaveBeenCalledTimes(1);
    expect(prepared.markdown).toBe(
      "![Cover](https://cdn.example.com/cover.png)\n![Again](https://cdn.example.com/cover.png)"
    );
    expect(prepared.mediaReplacements).toEqual([
      {
        sourcePath: "assets/cover.png",
        replacementPath: "https://cdn.example.com/cover.png",
      },
    ]);
  });
});
