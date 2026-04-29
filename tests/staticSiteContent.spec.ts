import { describe, expect, it } from "vitest";
import { buildPreviewUrl, buildStaticSiteContentPath, buildStaticSiteMarkdown, renderCommitMessage } from "../src/core/staticSite/content";
import { PublishableNote } from "../src/core/note";

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/My Post.md",
    title: "My Post",
    markdown: "# My Post\n\nBody",
    frontmatter: {
      draft: false,
      custom: "keep-me",
      tags: ["obsidian", "publish"],
    },
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Body",
    slug: "my-post",
    tags: ["obsidian"],
    categories: [],
    date: "2026-04-29",
    ...overrides,
  };
}

describe("static-site content helpers", () => {
  it("generates Hugo-compatible Markdown content paths", () => {
    expect(buildStaticSiteContentPath(createNote(), { generator: "hugo", contentRoot: "content/blog" })).toBe("content/blog/my-post.md");
  });

  it("preserves unknown frontmatter while adding a title fallback", () => {
    const markdown = buildStaticSiteMarkdown(createNote({ frontmatter: { custom: "keep-me" } }));

    expect(markdown).toContain("custom: keep-me");
    expect(markdown).toContain('title: "My Post"');
    expect(markdown).toContain("# My Post");
  });

  it("renders commit messages and preview URLs from stable sync data", () => {
    expect(renderCommitMessage("Publish {{title}} to {{path}}", createNote(), "content/blog/my-post.md")).toBe(
      "Publish My Post to content/blog/my-post.md"
    );
    expect(buildPreviewUrl("https://example.com", "content/blog/my-post.md")).toBe("https://example.com/content/blog/my-post/");
  });
});
