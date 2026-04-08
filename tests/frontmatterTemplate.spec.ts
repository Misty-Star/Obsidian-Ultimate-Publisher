import { describe, expect, it } from "vitest";
import { createCsdnTarget, createJuejinTarget, createWordpressTarget, createZhihuTarget } from "../src/settings";
import { buildPublishFrontmatterTemplate, hasLeadingFrontmatter, injectPublishFrontmatter } from "../src/core/frontmatterTemplate";

describe("frontmatter template builder", () => {
  it("includes general fields and juejin section while skipping zhihu", () => {
    const template = buildPublishFrontmatterTemplate({
      targets: [
        createWordpressTarget(),
        createCsdnTarget(),
        createZhihuTarget(),
        createJuejinTarget(),
      ],
      includeOptionComments: true,
      juejinOptions: {
        categories: [{ id: "cat-1", label: "分类 1" }],
        tags: [{ id: "tag-1", label: "标签 1" }],
      },
    });

    expect(template).toContain("title:");
    expect(template).toContain("slug:");
    expect(template).toContain("tags: []\ncategories: []\ndescription:");
    expect(template).toContain("# WordPress 可选项");
    expect(template).toContain("status:");
    expect(template).toContain("ultimatePublisher:");
    expect(template).toContain("juejin:");
    expect(template).toContain("category:");
    expect(template).toContain("    tags: []");
    expect(template).toContain("briefContent:");
    expect(template).not.toContain("zhihu:");
    expect(template).not.toContain("columnId:");
  });

  it("truncates option comments when more than 20 labels", () => {
    const tagOptions = Array.from({ length: 22 }, (_value, index) => ({
      id: `tag-${index + 1}`,
      label: `标签 ${index + 1}`,
    }));

    const template = buildPublishFrontmatterTemplate({
      targets: [createJuejinTarget()],
      includeOptionComments: true,
      juejinOptions: {
        tags: tagOptions,
      },
    });

    expect(template).not.toContain("Juejin 标签");
    expect(template).toContain("# 可选项:");
    expect(template).toContain("标签 1");
    expect(template).toContain("标签 20");
    expect(template).not.toContain("标签 21");
    expect(template).toMatch(/# 可选项: .*仅展示部分可选项/);
  });

  it("does not render dynamic juejin option comments when multiple juejin targets are enabled", () => {
    const template = buildPublishFrontmatterTemplate({
      targets: [
        { ...createJuejinTarget(), id: "jj-1", name: "Juejin 1", enabled: true },
        { ...createJuejinTarget(), id: "jj-2", name: "Juejin 2", enabled: true },
      ],
      includeOptionComments: true,
      juejinOptions: {
        categories: [{ id: "cat-1", label: "分类 1" }],
        tags: [{ id: "tag-1", label: "标签 1" }],
      },
    });

    expect(template).toContain("ultimatePublisher:");
    expect(template).toContain("  juejin:");
    expect(template).toContain("    category:");
    expect(template).toContain("    tags: []");
    expect(template).toContain("    briefContent:");
    expect(template).not.toContain("# 可选项:");
    expect(template).not.toContain("分类 1");
    expect(template).not.toContain("标签 1");
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
    const markdown = "# 你好";
    const prefixed = "---\ntitle: demo\n---\n# 你好";

    expect(injectPublishFrontmatter(markdown, template)).toBe("---\ntitle:\n---\n\n# 你好");
    expect(injectPublishFrontmatter(prefixed, template)).toBe(prefixed);
  });
});
