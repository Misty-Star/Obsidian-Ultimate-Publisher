import { requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { GithubProvider } from "../src/providers/githubProvider";
import { GithubTargetConfig } from "../src/types";

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

function createTarget(): GithubTargetConfig {
  return {
    id: "github-target",
    name: "GitHub Static Sites",
    enabled: true,
    provider: "github",
    siteGenerator: "hugo",
    owner: "misty",
    repo: "site",
    branch: "main",
    contentRoot: "content/posts",
    token: "secret",
    commitMessageTemplate: "Publish {{title}} at {{path}}",
    previewBaseUrl: "https://example.com",
  };
}

function decodeBodyContent(callIndex = 0): string {
  const body = vi.mocked(requestUrl).mock.calls[callIndex]?.[0].body;
  if (typeof body !== "string") {
    throw new Error("Expected JSON body");
  }
  const payload = JSON.parse(body) as { content: string };
  return Buffer.from(payload.content, "base64").toString("utf8");
}

describe("GithubProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
  });

  it("publishes Hugo Markdown content through the GitHub contents API", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 201,
      text: JSON.stringify({ content: { path: "content/posts/post.md", html_url: "https://github.com/misty/site/post" } }),
    } as never);

    const result = await new GithubProvider().publish(createNote(), createTarget());

    expect(result).toEqual({ remoteId: "content/posts/post.md", remoteUrl: "https://example.com/content/posts/post/" });
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        url: "https://api.github.com/repos/misty/site/contents/content/posts/post.md",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
      })
    );
    expect(vi.mocked(requestUrl).mock.calls[0]?.[0].body).toContain('"message":"Publish Post at content/posts/post.md"');
    expect(decodeBodyContent()).toContain("custom: preserved");
    expect(decodeBodyContent()).toContain("title: Post");
  });

  it("updates existing content with the fetched sha", async () => {
    vi.mocked(requestUrl)
      .mockResolvedValueOnce({ status: 200, text: JSON.stringify({ sha: "abc123" }) } as never)
      .mockResolvedValueOnce({
        status: 200,
        text: JSON.stringify({ content: { path: "content/posts/post.md", html_url: "https://github.com/misty/site/post" } }),
      } as never);

    const result = await new GithubProvider().update("content/posts/post.md", createNote(), createTarget());

    expect(result.remoteId).toBe("content/posts/post.md");
    expect(requestUrl).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "https://api.github.com/repos/misty/site/contents/content/posts/post.md?ref=main",
      })
    );
    expect(vi.mocked(requestUrl).mock.calls[1]?.[0].body).toContain('"sha":"abc123"');
  });

  it("rejects local Obsidian assets before creating repository content", async () => {
    await expect(
      new GithubProvider().publish(
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
    ).rejects.toThrow("GitHub Static Sites does not support local Obsidian assets");

    expect(requestUrl).not.toHaveBeenCalled();
  });

  it("keeps delete explicitly unsupported for static-site targets", async () => {
    await expect(new GithubProvider().delete("content/posts/post.md", createTarget())).rejects.toThrow(
      "GitHub static-site delete is not supported yet."
    );
  });

  it("reports non-JSON upstream errors without throwing SyntaxError", async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 500, text: "plain failure" } as never);

    await expect(new GithubProvider().publish(createNote(), createTarget())).rejects.toThrow(
      "GitHub request failed (500): plain failure"
    );
  });
});
