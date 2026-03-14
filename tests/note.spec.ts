import { describe, expect, it } from "vitest";
import { stripFrontmatter } from "../src/core/content";

describe("stripFrontmatter", () => {
  it("removes a leading frontmatter block from publish content", () => {
    const input = [
      "---",
      'title: "Hello"',
      "tags:",
      "  - test",
      "---",
      "",
      "# Heading",
      "",
      "Body",
    ].join("\n");

    expect(stripFrontmatter(input)).toBe("# Heading\n\nBody");
  });

  it("leaves markdown without frontmatter unchanged", () => {
    expect(stripFrontmatter("# Heading\n\nBody")).toBe("# Heading\n\nBody");
  });
});
