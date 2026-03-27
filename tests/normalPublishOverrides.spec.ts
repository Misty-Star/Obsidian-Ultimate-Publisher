import { describe, expect, it } from "vitest";
import { PublishableNote } from "../src/core/note";
import { applyNormalPublishContextToNote } from "../src/core/normalPublish/overrides";

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "# Post",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Default excerpt",
    slug: "post",
    tags: [],
    categories: [],
    ...overrides,
  };
}

describe("normal publish overrides", () => {
  it("applies note-like overrides before provider publish", () => {
    const result = applyNormalPublishContextToNote(createNote(), {
      common: {
        title: "Override",
      },
      provider: {
        provider: "wordpress",
        slug: "custom-post",
        excerpt: "Custom excerpt",
        tags: ["one"],
        categories: ["notes"],
        status: "draft",
        password: "",
      },
    });

    expect(result).toMatchObject({
      title: "Override",
      slug: "custom-post",
      excerpt: "Custom excerpt",
      tags: ["one"],
      categories: ["notes"],
    });
  });
});
