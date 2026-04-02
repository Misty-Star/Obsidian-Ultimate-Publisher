import { expect, it } from "vitest";
import { DEFAULT_LLM_SETTINGS } from "../src/settings";
import { buildNormalPublishAiTaskInput, getSupportedAiFields } from "../src/core/normalPublish/ai";
import { createJuejinTarget, createWordpressTarget } from "../src/settings";

const note = {
  filePath: "Notes/Post.md",
  title: "Post",
  markdown: "# Post\n\nHello world\n\nMore body text",
  frontmatter: { tags: ["obsidian"] },
  attachments: [],
  unresolvedAttachments: [],
  excerpt: "Hello world",
  slug: "post",
  tags: ["obsidian"],
  categories: ["Notes"],
};

it("supports title and excerpt for wordpress", () => {
  expect(
    getSupportedAiFields({
      provider: "wordpress",
      slug: "post",
      excerpt: "Hello world",
      tags: [],
      categories: [],
      status: "draft",
      password: "",
    })
  ).toEqual(["title", "excerpt"]);
});

it("supports only title for zhihu", () => {
  expect(
    getSupportedAiFields({
      provider: "zhihu",
      columnId: "",
      columnTitle: "",
    })
  ).toEqual(["title"]);
});

it("clips markdown using maxInputChars when building a juejin brief-content request", () => {
  const input = buildNormalPublishAiTaskInput({
    field: "briefContent",
    note: {
      ...note,
      markdown: "# Post\n\n" + "A".repeat(200),
    },
    target: { ...createJuejinTarget(), id: "jj" },
    commonTitle: "Post",
    draft: {
      provider: "juejin",
      categoryId: "cat-1",
      categoryName: "Backend",
      tagIds: ["tag-1"],
      tagNames: ["Obsidian"],
      briefContent: "",
    },
    llmSettings: { ...DEFAULT_LLM_SETTINGS, maxInputChars: 32 },
  });

  expect(input.task).toBe("generate_brief_content");
  expect(input.note.markdown.length).toBeLessThanOrEqual(32);
});

it("maps excerpt task and passes through note + target fields for wordpress", () => {
  const target = { ...createWordpressTarget(), id: "wp-1", name: "My WP" };
  const input = buildNormalPublishAiTaskInput({
    field: "excerpt",
    note,
    target,
    commonTitle: "Common Post Title",
    draft: {
      provider: "wordpress",
      slug: "post",
      excerpt: "Current Excerpt",
      tags: [],
      categories: [],
      status: "draft",
      password: "",
    },
    llmSettings: DEFAULT_LLM_SETTINGS,
  });

  expect(input.task).toBe("generate_excerpt");
  expect(input.currentValue).toBe("Current Excerpt");
  expect(input.target).toEqual({
    provider: "wordpress",
    name: "My WP",
  });
  expect(input.note).toEqual({
    title: "Common Post Title",
    markdown: note.markdown,
    excerpt: note.excerpt,
    frontmatter: note.frontmatter,
  });
});

it("throws when field and provider are unsupported", () => {
  expect(() =>
    buildNormalPublishAiTaskInput({
      field: "briefContent",
      note,
      target: { ...createWordpressTarget(), id: "wp-2" },
      commonTitle: "Post",
      draft: {
        provider: "wordpress",
        slug: "post",
        excerpt: "",
        tags: [],
        categories: [],
        status: "draft",
        password: "",
      },
      llmSettings: DEFAULT_LLM_SETTINGS,
    })
  ).toThrow("Brief content AI is unsupported for this provider.");
});

it("throws when target provider and draft provider mismatch", () => {
  expect(() =>
    buildNormalPublishAiTaskInput({
      field: "title",
      note,
      target: { ...createWordpressTarget(), id: "wp-3" },
      commonTitle: "Post",
      draft: {
        provider: "juejin",
        categoryId: "cat-1",
        categoryName: "Backend",
        tagIds: ["tag-1"],
        tagNames: ["Obsidian"],
        briefContent: "",
      },
      llmSettings: DEFAULT_LLM_SETTINGS,
    })
  ).toThrow("Target provider and draft provider must match.");
});
