import { describe, expect, it } from "vitest";
import { LocalFilesystemProvider } from "../src/providers/localFilesystemProvider";
import { PublishableNote } from "../src/core/note";
import { LocalFilesystemTargetConfig } from "../src/types";

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "# Post\n\nBody",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Body",
    slug: "post",
    tags: [],
    categories: [],
    date: "2026-04-30",
    ...overrides,
  };
}

function createTarget(overrides: Partial<LocalFilesystemTargetConfig> = {}): LocalFilesystemTargetConfig {
  return {
    id: "local-1",
    name: "Local",
    enabled: true,
    provider: "local-filesystem",
    localOutputPath: "published",
    siteGenerator: "hugo",
    overwriteExisting: false,
    ...overrides,
  };
}

function createProvider(existing = false) {
  const writes: Array<{ path: string; data: string }> = [];
  const removes: string[] = [];
  const app = {
    vault: {
      adapter: {
        exists: async () => existing,
        write: async (path: string, data: string) => {
          writes.push({ path, data });
        },
        remove: async (path: string) => {
          removes.push(path);
        },
      },
    },
  };
  return { provider: new LocalFilesystemProvider(app as never), writes, removes };
}

describe("LocalFilesystemProvider", () => {
  it("publishes static-site Markdown into a vault-relative folder", async () => {
    const { provider, writes } = createProvider();

    const result = await provider.publish(createNote(), createTarget());

    expect(result).toEqual({ remoteId: "published/content/posts/post.md", remoteUrl: "published/content/posts/post.md" });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe("published/content/posts/post.md");
    expect(writes[0]?.data).toContain('title: Post');
    expect(writes[0]?.data).toContain('date: 2026-04-30');
    expect(writes[0]?.data).toContain('# Post');
  });

  it("blocks accidental overwrite unless enabled", async () => {
    const { provider } = createProvider(true);

    await expect(provider.publish(createNote(), createTarget({ overwriteExisting: false }))).rejects.toThrow(
      "would overwrite existing file"
    );
  });

  it("updates and deletes existing vault-relative paths", async () => {
    const { provider, writes, removes } = createProvider();

    await expect(provider.update("published/post.md", createNote({ title: "Updated" }), createTarget())).resolves.toMatchObject({
      remoteId: "published/post.md",
    });
    await provider.delete("published/post.md", createTarget());

    expect(writes[0]?.path).toBe("published/post.md");
    expect(writes[0]?.data).toContain("title: Updated");
    expect(removes).toEqual(["published/post.md"]);
  });

  it("rejects paths that escape the vault", async () => {
    const { provider } = createProvider();

    await expect(provider.validateConfig(createTarget({ localOutputPath: "../outside" }))).rejects.toThrow(
      "inside the vault"
    );
    await expect(provider.getPreviewUrl("../outside/post.md", createTarget())).rejects.toThrow("inside the vault");
  });
});
