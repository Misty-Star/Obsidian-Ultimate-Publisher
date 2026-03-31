import { describe, expect, it } from "vitest";
import {
  createCsdnTarget,
  createJuejinTarget,
  createZhihuTarget,
} from "../src/settings";
import { PublishableNote } from "../src/core/note";
import {
  resolveCsdnPublishInput,
  resolveJuejinPublishInput,
  resolveZhihuPublishInput,
} from "../src/core/webPublishConfig";

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

describe("web publish input", () => {
  it("allows zhihu publish without columnId when no override or default exists", () => {
    const input = resolveZhihuPublishInput(
      createNote(),
      {
        ...createZhihuTarget(),
        defaultColumnId: "",
      }
    );

    expect(input.columnId).toBeUndefined();
  });

  it("prefers zhihu frontmatter columnId over target defaults", () => {
    const input = resolveZhihuPublishInput(
      createNote({
        frontmatter: {
          ultimatePublisher: {
            zhihu: {
              columnId: "frontmatter-column",
            },
          },
        },
      }),
      {
        ...createZhihuTarget(),
        defaultColumnId: "target-column",
      }
    );

    expect(input.columnId).toBe("frontmatter-column");
  });

  it("prefers explicit zhihu overrides over frontmatter and target defaults", () => {
    const input = resolveZhihuPublishInput(
      createNote({
        frontmatter: {
          ultimatePublisher: {
            zhihu: {
              columnId: "frontmatter-column",
            },
          },
        },
      }),
      {
        ...createZhihuTarget(),
        defaultColumnId: "target-column",
      },
      {
        columnId: "override-column",
      }
    );

    expect(input.columnId).toBe("override-column");
  });

  it("normalizes csdn categories and tags from generic note metadata", () => {
    const input = resolveCsdnPublishInput(
      createNote({
        categories: ["后端"],
        tags: ["Obsidian"],
      }),
      createCsdnTarget()
    );

    expect(input.categories).toEqual(["后端"]);
    expect(input.tags).toEqual(["Obsidian"]);
  });

  it("prefers explicit csdn overrides over note metadata and target defaults", () => {
    const input = resolveCsdnPublishInput(
      createNote({
        categories: ["后端"],
        tags: ["Obsidian"],
      }),
      {
        ...createCsdnTarget(),
        defaultCategories: ["默认分类"],
        defaultTags: ["默认标签"],
      },
      {
        categories: ["覆盖分类"],
        tags: ["覆盖标签"],
      }
    );

    expect(input.categories).toEqual(["覆盖分类"]);
    expect(input.tags).toEqual(["覆盖标签"]);
  });

  it("requires juejin category and tag ids before publish", () => {
    expect(() => resolveJuejinPublishInput(createNote(), createJuejinTarget())).toThrow(/category/i);
  });

  it("uses target defaults when juejin frontmatter overrides are absent", () => {
    const input = resolveJuejinPublishInput(
      createNote({
        excerpt: "short brief",
      }),
      {
        ...createJuejinTarget(),
        defaultCategoryId: "category-1",
        defaultTagIds: ["tag-1", "tag-2"],
        defaultBriefContent: "fallback brief content",
      }
    );

    expect(input.categoryId).toBe("category-1");
    expect(input.tagIds).toEqual(["tag-1", "tag-2"]);
    expect(input.briefContent).toBe("fallback brief content");
  });

  it("prefers explicit juejin overrides over frontmatter and target defaults", () => {
    const input = resolveJuejinPublishInput(
      createNote({
        excerpt: "short brief",
        frontmatter: {
          ultimatePublisher: {
            juejin: {
              categoryId: "frontmatter-category",
              tagIds: ["frontmatter-tag"],
              briefContent: "frontmatter brief",
            },
          },
        },
      }),
      {
        ...createJuejinTarget(),
        defaultCategoryId: "category-1",
        defaultTagIds: ["tag-1", "tag-2"],
        defaultBriefContent: "fallback brief content",
      },
      {
        categoryId: "override-category",
        tagIds: ["override-tag"],
        briefContent: "override brief",
      }
    );

    expect(input.categoryId).toBe("override-category");
    expect(input.tagIds).toEqual(["override-tag"]);
    expect(input.briefContent).toBe("override brief");
  });
});
