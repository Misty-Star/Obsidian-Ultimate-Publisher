import { describe, expect, it, vi } from "vitest";
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
import { ProviderOptionCache } from "../src/types";

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

  it("ignores removed zhihu frontmatter columnId and uses target defaults", () => {
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

    expect(input.columnId).toBe("target-column");
  });

  it("prefers explicit zhihu overrides over target defaults", () => {
    const input = resolveZhihuPublishInput(
      createNote(),
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
        categories: ["Backend"],
        tags: ["Obsidian"],
      }),
      createCsdnTarget()
    );

    expect(input.categories).toEqual(["Backend"]);
    expect(input.tags).toEqual(["Obsidian"]);
  });

  it("prefers explicit csdn overrides over note metadata and target defaults", () => {
    const input = resolveCsdnPublishInput(
      createNote({
        categories: ["Backend"],
        tags: ["Obsidian"],
      }),
      {
        ...createCsdnTarget(),
        defaultCategories: ["Default category"],
        defaultTags: ["Default tag"],
      },
      {
        categories: ["Override category"],
        tags: ["Override tag"],
      }
    );

    expect(input.categories).toEqual(["Override category"]);
    expect(input.tags).toEqual(["Override tag"]);
  });

  it("requires juejin category and tag ids before publish", async () => {
    await expect(resolveJuejinPublishInput(createNote(), createJuejinTarget())).rejects.toThrow(/category/i);
  });

  it("uses target defaults when juejin top-level overrides are absent", async () => {
    const result = await resolveJuejinPublishInput(
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

    expect(result.input.categoryId).toBe("category-1");
    expect(result.input.tagIds).toEqual(["tag-1", "tag-2"]);
    expect(result.input.briefContent).toBe("fallback brief content");
    expect(result.providerOptionCache).toBeUndefined();
  });

  it("uses top-level description as juejin brief content before excerpt", async () => {
    const result = await resolveJuejinPublishInput(
      createNote({
        excerpt: "excerpt brief",
        frontmatter: {
          description: "frontmatter brief",
        },
      }),
      {
        ...createJuejinTarget(),
        defaultCategoryId: "category-1",
        defaultTagIds: ["tag-1"],
        defaultBriefContent: "",
      }
    );

    expect(result.input.briefContent).toBe("frontmatter brief");
  });

  it("prefers explicit juejin overrides over top-level frontmatter and target defaults", async () => {
    const result = await resolveJuejinPublishInput(
      createNote({
        excerpt: "short brief",
        frontmatter: {
          juejinCategory: "Frontmatter category",
          juejinTags: ["Frontmatter tag"],
          description: "frontmatter brief",
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

    expect(result.input.categoryId).toBe("override-category");
    expect(result.input.tagIds).toEqual(["override-tag"]);
    expect(result.input.briefContent).toBe("override brief");
  });

  it("resolves juejin category and tags from existing cache", async () => {
    const providerOptionCache: ProviderOptionCache = {
      juejinByTargetId: {
        "juejin-target": {
          fetchedAt: "2026-04-08T00:00:00.000Z",
          categories: [
            { id: "category-backend", label: "Backend" },
          ],
          tags: [
            { id: "tag-obsidian", label: "Obsidian" },
          ],
        },
      },
    };

    const result = await resolveJuejinPublishInput(
      createNote({
        frontmatter: {
          juejinCategory: "Backend",
          juejinTags: ["Obsidian"],
        },
      }),
      {
        ...createJuejinTarget(),
        id: "juejin-target",
        defaultBriefContent: "fallback brief content",
      },
      undefined,
      {
        providerOptionCache,
        nowMs: Date.parse("2026-04-08T01:00:00.000Z"),
        loadNormalPublishOptions: vi.fn(),
      }
    );

    expect(result.input.categoryId).toBe("category-backend");
    expect(result.input.tagIds).toEqual(["tag-obsidian"]);
    expect(result.providerOptionCache).toBeUndefined();
  });

  it("refreshes juejin options when cache is missing and returns updated cache", async () => {
    const loadNormalPublishOptions = vi.fn().mockResolvedValue({
      juejinCategories: [
        { id: "category-remote", label: "Backend" },
      ],
      juejinTags: [
        { id: "tag-remote", label: "Obsidian" },
      ],
    });
    const nowMs = Date.parse("2026-04-08T02:00:00.000Z");

    const result = await resolveJuejinPublishInput(
      createNote({
        frontmatter: {
          juejinCategory: "Backend",
          juejinTags: ["Obsidian"],
        },
      }),
      {
        ...createJuejinTarget(),
        id: "juejin-target",
      },
      undefined,
      {
        nowMs,
        loadNormalPublishOptions,
      }
    );

    expect(result.input.categoryId).toBe("category-remote");
    expect(result.input.tagIds).toEqual(["tag-remote"]);
    expect(result.providerOptionCache).toEqual({
      juejinByTargetId: {
        "juejin-target": {
          fetchedAt: new Date(nowMs).toISOString(),
          categories: [{ id: "category-remote", label: "Backend" }],
          tags: [{ id: "tag-remote", label: "Obsidian" }],
        },
      },
    });
    expect(loadNormalPublishOptions).toHaveBeenCalledTimes(1);
  });

  it("does not read removed ultimatePublisher juejin fields", async () => {
    await expect(
      resolveJuejinPublishInput(
        createNote({
          frontmatter: {
            ultimatePublisher: {
              juejin: {
                category: "Backend",
                tags: ["Obsidian"],
                briefContent: "old brief",
              },
            },
          },
        }),
        createJuejinTarget()
      )
    ).rejects.toThrow(/category/i);
  });

  it("throws a clear error when juejin category name does not match", async () => {
    await expect(
      resolveJuejinPublishInput(
        createNote({
          frontmatter: {
            juejinCategory: "Missing category",
            juejinTags: ["Obsidian"],
          },
        }),
        {
          ...createJuejinTarget(),
          id: "juejin-target",
        },
        undefined,
        {
          providerOptionCache: {
            juejinByTargetId: {
              "juejin-target": {
                fetchedAt: "2026-04-08T00:00:00.000Z",
                categories: [{ id: "category-1", label: "Frontend" }],
                tags: [{ id: "tag-1", label: "Obsidian" }],
              },
            },
          },
          nowMs: Date.parse("2026-04-08T01:00:00.000Z"),
          loadNormalPublishOptions: vi.fn(),
        }
      )
    ).rejects.toThrow('Juejin category "Missing category" did not match any available option.');
  });

  it("surfaces options unavailable when juejin names need refresh but remote loading fails", async () => {
    await expect(
      resolveJuejinPublishInput(
        createNote({
          frontmatter: {
            juejinCategory: "Backend",
            juejinTags: ["Obsidian"],
          },
        }),
        {
          ...createJuejinTarget(),
          id: "juejin-target",
        },
        undefined,
        {
          nowMs: Date.parse("2026-04-08T01:00:00.000Z"),
          loadNormalPublishOptions: vi.fn().mockRejectedValue(new Error("network down")),
        }
      )
    ).rejects.toThrow('Juejin options are unavailable, so category "Backend" could not be resolved.');
  });

  it("throws a clear error when juejin tag name matches multiple options", async () => {
    await expect(
      resolveJuejinPublishInput(
        createNote({
          frontmatter: {
            juejinCategory: "Backend",
            juejinTags: ["Obsidian"],
          },
        }),
        {
          ...createJuejinTarget(),
          id: "juejin-target",
        },
        undefined,
        {
          providerOptionCache: {
            juejinByTargetId: {
              "juejin-target": {
                fetchedAt: "2026-04-08T00:00:00.000Z",
                categories: [{ id: "category-1", label: "Backend" }],
                tags: [
                  { id: "tag-1", label: "Obsidian" },
                  { id: "tag-2", label: "obsidian" },
                ],
              },
            },
          },
          nowMs: Date.parse("2026-04-08T01:00:00.000Z"),
          loadNormalPublishOptions: vi.fn(),
        }
      )
    ).rejects.toThrow('Juejin tag "Obsidian" matched multiple available options.');
  });
});
