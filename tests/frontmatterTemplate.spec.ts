import { describe, expect, it } from "vitest";
import { createCsdnTarget, createJuejinTarget, createWordpressTarget, createZhihuTarget } from "../src/settings";
import { buildPublishFrontmatterTemplate, hasLeadingFrontmatter, injectPublishFrontmatter } from "../src/core/frontmatterTemplate";

describe("frontmatter template builder", () => {
  it("includes general fields and top-level juejin fields while skipping zhihu fields", () => {
    const template = buildPublishFrontmatterTemplate({
      targets: [
        createWordpressTarget(),
        createCsdnTarget(),
        createZhihuTarget(),
        createJuejinTarget(),
      ],
      includeOptionComments: true,
      juejinOptions: {
        categories: [{ id: "cat-1", label: "Category 1" }],
        tags: [{ id: "tag-1", label: "Tag 1" }],
      },
    });

    expect(template).toContain("title:");
    expect(template).toContain("slug:");
    expect(template).toContain("tags: []\ncategories: []\ndescription:");
    expect(template).toMatch(/\n# WordPress .*?\nstatus:\n/);
    expect(template).toContain("juejinCategory:");
    expect(template).toContain("juejinTags: []");
    expect(template).toMatch(/\n# .*Category 1\njuejinCategory:\n/);
    expect(template).toMatch(/\n# .*Tag 1\njuejinTags: \[\]\n/);
    expect(template).not.toContain("ultimatePublisher:");
    expect(template).not.toContain("briefContent:");
    expect(template).not.toContain("zhihu:");
    expect(template).not.toContain("columnId:");
  });

  it("truncates option comments when more than 20 labels", () => {
    const tagOptions = Array.from({ length: 22 }, (_value, index) => ({
      id: `tag-${index + 1}`,
      label: `Tag ${index + 1}`,
    }));

    const template = buildPublishFrontmatterTemplate({
      targets: [createJuejinTarget()],
      includeOptionComments: true,
      juejinOptions: {
        tags: tagOptions,
      },
    });

    expect(template).not.toContain("Juejin Tag");
    expect(template).toContain("Tag 1");
    expect(template).toContain("Tag 20");
    expect(template).not.toContain("Tag 21");
    expect(template).toContain("\u4ec5\u5c55\u793a\u90e8\u5206\u53ef\u9009\u9879");
    expect(template).toMatch(/\n# .*Tag 20.*\u4ec5\u5c55\u793a\u90e8\u5206\u53ef\u9009\u9879\njuejinTags: \[\]\n/);
  });

  it("does not render dynamic juejin option comments when multiple juejin targets are enabled", () => {
    const template = buildPublishFrontmatterTemplate({
      targets: [
        { ...createJuejinTarget(), id: "jj-1", name: "Juejin 1", enabled: true },
        { ...createJuejinTarget(), id: "jj-2", name: "Juejin 2", enabled: true },
      ],
      includeOptionComments: true,
      juejinOptions: {
        categories: [{ id: "cat-1", label: "Category 1" }],
        tags: [{ id: "tag-1", label: "Tag 1" }],
      },
    });

    expect(template).toContain("juejinCategory:");
    expect(template).toContain("juejinTags: []");
    expect(template).not.toContain("ultimatePublisher:");
    expect(template).not.toContain("briefContent:");
    expect(template).not.toContain("Category 1");
    expect(template).not.toContain("Tag 1");
  });
});

describe("frontmatter helpers", () => {
  it("recognizes existing frontmatter and ignores malformed fences", () => {
    const valid = "---\ntitle: demo\n---\nContent";
    const malformed = "----\ntitle: demo\n----\nContent";

    expect(hasLeadingFrontmatter(valid)).toBe(true);
    expect(hasLeadingFrontmatter("No frontmatter here")).toBe(false);
    expect(hasLeadingFrontmatter(malformed)).toBe(false);
  });

  it("injects template when missing frontmatter but leaves valid frontmatter untouched", () => {
    const template = "---\ntitle:\n---\n";
    const markdown = "# Hello";
    const prefixed = "---\ntitle: demo\n---\n# Hello";

    expect(injectPublishFrontmatter(markdown, template)).toBe("---\ntitle:\n---\n\n# Hello");
    expect(injectPublishFrontmatter(prefixed, template)).toBe(prefixed);
  });
});
