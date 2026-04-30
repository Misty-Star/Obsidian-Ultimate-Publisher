import { requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { GitlabProvider } from "../src/providers/gitlabProvider";
import { GitlabTargetConfig } from "../src/types";

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "# Post\n\nBody",
    frontmatter: { custom: "preserved" },
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Body",
    slug: "post",
    tags: [],
    categories: [],
    ...overrides,
  };
}

function createTarget(): GitlabTargetConfig<"gitlab-hugo"> {
  return {
    id: "gitlab-target",
    name: "GitLab Static Sites",
    enabled: true,
    provider: "gitlab-hugo",
    siteGenerator: "hugo",
    baseUrl: "https://gitlab.example.com/",
    projectIdOrPath: "misty/site",
    branch: "main",
    contentRoot: "content/posts",
    token: "secret",
    commitMessageTemplate: "Publish {{title}} at {{path}}",
    previewBaseUrl: "https://example.com",
  };
}

function parseBody(callIndex = 0): Record<string, unknown> {
  const body = vi.mocked(requestUrl).mock.calls[callIndex]?.[0].body;
  if (typeof body !== "string") {
    throw new Error("Expected JSON body");
  }
  return JSON.parse(body) as Record<string, unknown>;
}

describe("GitlabProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it("publishes Hugo Markdown content through the GitLab repository files API", async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 201, text: JSON.stringify({ file_path: "content/posts/post.md" }) } as never);

    const provider = new GitlabProvider("gitlab-hugo");
    const result = await provider.publish(createNote(), createTarget());

    expect(provider.provider).toBe("gitlab-hugo");

    expect(result).toEqual({ remoteId: "content/posts/post.md", remoteUrl: "https://example.com/content/posts/post/" });
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://gitlab.example.com/api/v4/projects/misty%2Fsite/repository/files/content%2Fposts%2Fpost.md",
        headers: expect.objectContaining({ "PRIVATE-TOKEN": "secret" }),
      })
    );
    expect(parseBody()).toMatchObject({
      branch: "main",
      commit_message: "Publish Post at content/posts/post.md",
    });
    expect(parseBody().content).toContain("custom: preserved");
    expect(parseBody().content).toContain("title: Post");
  });

  it("updates existing content using the same stable remote path", async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 200, text: JSON.stringify({ file_path: "content/posts/post.md" }) } as never);

    const result = await new GitlabProvider().update("content/posts/post.md", createNote(), createTarget());

    expect(result).toEqual({ remoteId: "content/posts/post.md", remoteUrl: "https://example.com/content/posts/post/" });
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        url: "https://gitlab.example.com/api/v4/projects/misty%2Fsite/repository/files/content%2Fposts%2Fpost.md",
      })
    );
    expect(parseBody()).toMatchObject({
      branch: "main",
      commit_message: "Publish Post at content/posts/post.md",
    });
  });

  it("rejects local Obsidian assets before creating repository content", async () => {
    await expect(
      new GitlabProvider().publish(
        createNote({
          attachments: [
            {
              sourcePath: "Attachments/image.png",
              fileName: "image.png",
              reference: {
                originalText: "![[image.png]]",
                rawTarget: "image.png",
                altText: "image",
                source: "wiki-embed",
              },
            },
          ],
        }),
        createTarget()
      )
    ).rejects.toThrow("GitLab Static Sites does not support local Obsidian assets");

    expect(requestUrl).not.toHaveBeenCalled();
  });

  it("keeps delete explicitly unsupported for static-site targets", async () => {
    await expect(new GitlabProvider().delete("content/posts/post.md", createTarget())).rejects.toThrow(
      "GitLab static-site delete is not supported yet."
    );
  });

  it("reports non-JSON upstream errors without throwing SyntaxError", async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 500, text: "plain failure" } as never);

    await expect(new GitlabProvider().publish(createNote(), createTarget())).rejects.toThrow(
      "GitLab request failed (500): plain failure"
    );
  });
});
