import { describe, expect, it } from "vitest";
import { DEFAULT_LLM_SETTINGS } from "../src/settings";
import { buildNormalPublishAiTaskInput, getSupportedAiFields } from "../src/core/normalPublish/ai";
import { createJuejinTarget, createWordpressTarget, createZhihuTarget } from "../src/settings";

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
