import { describe, expect, it } from "vitest";
import { extractAssetReferences, replaceAssetReference, replaceAssetReferences } from "../src/core/markdown";

describe("extractAssetReferences", () => {
  it("finds wiki embeds and relative markdown images", () => {
    const markdown = [
      "![Alt](images/pic.png)",
      "![[attachments/file.jpg|Preview]]",
      "![Remote](https://example.com/remote.png)",
      "![Inline](data:image/png;base64,abc123)",
    ].join("\n");

    const references = extractAssetReferences(markdown);

    expect(references).toHaveLength(2);
    expect(references).toEqual(
      expect.arrayContaining([
        {
          originalText: "![Alt](images/pic.png)",
          rawTarget: "images/pic.png",
          altText: "Alt",
          source: "markdown-image",
        },
        {
          originalText: "![[attachments/file.jpg|Preview]]",
          rawTarget: "attachments/file.jpg",
          altText: "Preview",
          source: "wiki-embed",
        },
      ])
    );
  });

  it("rewrites an extracted asset reference", () => {
    const markdown = "![[assets/test.png|Diagram]]";
    const reference = extractAssetReferences(markdown)[0];

    const rewritten = replaceAssetReference(markdown, reference, "./assets/exported.png");

    expect(rewritten).toBe("![Diagram](./assets/exported.png)");
  });

  it("rewrites multiple extracted asset references", () => {
    const markdown = [
      "![[assets/test.png|Diagram]]",
      "![Local](images/pic.png)",
      "![Remote](https://example.com/remote.png)",
    ].join("\n");
    const references = extractAssetReferences(markdown);

    const rewritten = replaceAssetReferences(markdown, [
      { reference: references[0], replacementPath: "https://cdn.example.com/diagram.png" },
      { reference: references[1], replacementPath: "https://cdn.example.com/pic.png" },
    ]);

    expect(rewritten).toBe(
      [
        "![Diagram](https://cdn.example.com/diagram.png)",
        "![Local](https://cdn.example.com/pic.png)",
        "![Remote](https://example.com/remote.png)",
      ].join("\n")
    );
  });
});
