import { afterEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { buildNormalPublishSessionState } from "../src/core/normalPublish/drafts";
import * as providerDefinitions from "../src/providers/definitions";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates initial draft creation through provider definitions", () => {
    const definitionSpy = vi.spyOn(providerDefinitions, "getProviderDefinition");

    buildNormalPublishSessionState(createNote(), [
      {
        ...createWordpressTarget(),
        id: "wp",
        defaultStatus: "draft",
      },
    ]);

    expect(definitionSpy).toHaveBeenCalledWith("wordpress");
  });

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

  it("does not prefill zhihu draft columnId from removed frontmatter", () => {
    const state = buildNormalPublishSessionState(
      createNote({
        frontmatter: {
          ultimatePublisher: {
            zhihu: {
              columnId: "frontmatter-column",
            },
          },
        },
      }),
      [
        {
          ...createZhihuTarget(),
          id: "zh",
          defaultColumnId: "target-column",
          defaultColumnTitle: "Demo Column",
        },
      ]
    );

    expect(state.targetDrafts.zh).toMatchObject({
      provider: "zhihu",
      columnId: "target-column",
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
