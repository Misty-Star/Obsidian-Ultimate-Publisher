import { describe, expect, it } from "vitest";
import { buildExportFrontmatter, serializeFrontmatter } from "../src/core/yaml";

describe("serializeFrontmatter", () => {
  it("serializes default frontmatter fields", () => {
    const frontmatter = buildExportFrontmatter(
      {
        title: "Example Title",
        slug: "example-title",
        excerpt: "Short summary",
        tags: ["obsidian", "publish"],
        categories: ["notes"],
        date: "2026-03-13T00:00:00.000Z",
        extra: {},
      },
      "default"
    );

    const yaml = serializeFrontmatter(frontmatter);

    expect(yaml).toContain("title: Example Title");
    expect(yaml).toContain("slug: example-title");
    expect(yaml).toContain("description: Short summary");
    expect(yaml).toContain("tags:");
    expect(yaml).toContain("- obsidian");
  });

  it("serializes hexo frontmatter fields", () => {
    const frontmatter = buildExportFrontmatter(
      {
        title: "Hexo Title",
        slug: "hexo-title",
        excerpt: "Hexo summary",
        tags: ["hexo"],
        categories: ["blog"],
        date: "2026-03-13T00:00:00.000Z",
        extra: { layout: "post" },
      },
      "hexo"
    );

    const yaml = serializeFrontmatter(frontmatter);

    expect(yaml).toContain("title: Hexo Title");
    expect(yaml).toContain("layout: post");
    expect(yaml).toContain("excerpt: Hexo summary");
  });
});
