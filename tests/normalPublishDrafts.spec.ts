import { describe, expect, it } from "vitest";
import { PublishableNote } from "../src/core/note";
import { buildNormalPublishSessionState } from "../src/core/normalPublish/drafts";
import {
  createJuejinTarget,
  createWordpressTarget,
  createZhihuTarget,
} from "../src/settings";

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
    tags: ["obsidian"],
    categories: ["notes"],
    ...overrides,
  };
}

describe("normal publish drafts", () => {
  it("keeps title as the only common field and initializes provider drafts separately", () => {
    const state = buildNormalPublishSessionState(createNote(), [
      {
        ...createWordpressTarget(),
        id: "wp",
        defaultStatus: "draft",
      },
      {
        ...createZhihuTarget(),
        id: "zh",
        defaultColumnId: "column-1",
        defaultColumnTitle: "Demo Column",
      },
    ]);

    expect(state.selectedTargetId).toBe("wp");
    expect(state.commonDraft.title).toBe("Post");
    expect(state.targetDrafts.wp).toMatchObject({
      provider: "wordpress",
      slug: "post",
      excerpt: "Default excerpt",
      tags: ["obsidian"],
      categories: ["notes"],
      status: "draft",
      password: "",
    });
    expect(state.targetDrafts.zh).toMatchObject({
      provider: "zhihu",
      columnId: "column-1",
      columnTitle: "Demo Column",
    });
  });

  it("pre-fills only fields with explicit sources and leaves the rest empty", () => {
    const state = buildNormalPublishSessionState(createNote(), [
      {
        ...createJuejinTarget(),
        id: "jj",
        defaultCategoryId: "",
        defaultTagIds: [],
        defaultBriefContent: "",
      },
    ]);

    expect(state.targetDrafts.jj).toMatchObject({
      provider: "juejin",
      categoryId: "",
      categoryName: "",
      tagIds: [],
      tagNames: [],
      briefContent: "Default excerpt",
    });
  });
});
