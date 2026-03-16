import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { App } from "obsidian";
import { describe, expect, it } from "vitest";
import { PublishableNote, ResolvedAsset } from "../src/core/note";
import { LocalExportProvider } from "../src/providers/localExportProvider";
import { LocalExportTargetConfig } from "../src/types";

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
    markdown: "![Cover](./assets/post-cover.png)",
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

describe("LocalExportProvider", () => {
  it("copies a local image and returns a relative asset path", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "obsidian-publisher-"));
    const provider = new LocalExportProvider(createApp([1, 2, 3]));
    const target: LocalExportTargetConfig = {
      id: "local-target",
      name: "Local Export",
      enabled: true,
      provider: "local-export",
      outputDir,
      yamlType: "default",
      assetDirName: "assets",
    };

    expect(provider.getMediaSupport(target)).toEqual({ mode: "local-copy" });

    const result = await provider.copyAsset(createAsset(), createNote(), target);

    expect(result.url).toBe("./assets/post-cover.png");
    const bytes = await readFile(join(outputDir, "assets", "post-cover.png"));
    expect([...bytes]).toEqual([1, 2, 3]);
  });
});
