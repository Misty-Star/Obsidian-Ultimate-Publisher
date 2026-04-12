import { afterEach, describe, expect, it } from "vitest";
import { FakeElement, resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { JuejinQuickPublishMetadataModal } from "../src/ui/modals/JuejinQuickPublishMetadataModal";
import { createJuejinTarget } from "../src/settings";

function walk(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap((child) => walk(child))];
}

function findInputByName(root: FakeElement, name: string): FakeElement {
  const found = walk(root).find((element) => {
    return (element.tagName === "input" || element.tagName === "textarea" || element.tagName === "select") && element.name === name;
  });
  if (!found) {
    throw new Error(`Input not found: ${name}`);
  }
  return found;
}

function findButtonByText(root: FakeElement, text: string): FakeElement {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const found = walk(root)
    .filter((element) => element.tagName === "button")
    .find((element) => normalize(element.textContent).includes(text));
  if (!found) {
    throw new Error(`Button not found: ${text}`);
  }
  return found;
}

describe("JuejinQuickPublishMetadataModal", () => {
  it("always renders juejin category and tag fields for quick publish", async () => {
    setObsidianTestLanguage("zh-CN");
    const target = {
      ...createJuejinTarget(),
      id: "jj",
      name: "Juejin",
      cookie: "sessionid=demo",
    };
    const note = {
      filePath: "Notes/Post.md",
      title: "Post",
      markdown: "# Post",
      frontmatter: {},
      attachments: [],
      unresolvedAttachments: [],
      excerpt: "Post excerpt",
      slug: "post",
      tags: [],
      categories: [],
    };
    const modal = new JuejinQuickPublishMetadataModal(
      {} as never,
      target,
      note,
      {
        provider: "juejin",
        categoryId: "",
        categoryName: "",
        tagIds: [],
        tagNames: [],
        briefContent: "Post excerpt",
      },
      {
        get: () => ({
          loadNormalPublishOptions: async () => ({
            juejinCategories: [{ id: "category-1", label: "后端" }],
            juejinTags: [{ id: "tag-1", label: "Obsidian" }],
          }),
        }),
      } as never
    );

    await modal.onOpen();

    expect(findInputByName(modal.contentEl as never, "quick-publish-juejin-categoryId").tagName).toBe("select");
    expect(findInputByName(modal.contentEl as never, "quick-publish-juejin-tagIds").tagName).toBe("input");
  });

  it("returns the selected juejin draft when confirmed", async () => {
    setObsidianTestLanguage("zh-CN");
    const target = {
      ...createJuejinTarget(),
      id: "jj",
      name: "Juejin",
      cookie: "sessionid=demo",
    };
    const note = {
      filePath: "Notes/Post.md",
      title: "Post",
      markdown: "# Post",
      frontmatter: {},
      attachments: [],
      unresolvedAttachments: [],
      excerpt: "Post excerpt",
      slug: "post",
      tags: [],
      categories: [],
    };
    const modal = new JuejinQuickPublishMetadataModal(
      {} as never,
      target,
      note,
      {
        provider: "juejin",
        categoryId: "",
        categoryName: "",
        tagIds: [],
        tagNames: [],
        briefContent: "Post excerpt",
      },
      {
        get: () => ({
          loadNormalPublishOptions: async () => ({
            juejinCategories: [{ id: "category-1", label: "后端" }],
            juejinTags: [
              { id: "tag-1", label: "Obsidian" },
              { id: "tag-2", label: "插件" },
            ],
          }),
        }),
      } as never
    );

    await modal.onOpen();

    const categorySelect = findInputByName(modal.contentEl as never, "quick-publish-juejin-categoryId");
    categorySelect.value = "category-1";
    categorySelect.dispatchEvent("change", { currentTarget: categorySelect, target: categorySelect });

    const firstTagCheckbox = findInputByName(modal.contentEl as never, "quick-publish-juejin-tagIds-option-tag-1");
    firstTagCheckbox.checked = true;
    firstTagCheckbox.dispatchEvent("change", { currentTarget: firstTagCheckbox, target: firstTagCheckbox });

    const secondTagCheckbox = findInputByName(modal.contentEl as never, "quick-publish-juejin-tagIds-option-tag-2");
    secondTagCheckbox.checked = true;
    secondTagCheckbox.dispatchEvent("change", { currentTarget: secondTagCheckbox, target: secondTagCheckbox });

    expect((modal as any).draft).toEqual({
      provider: "juejin",
      categoryId: "category-1",
      categoryName: "后端",
      tagIds: ["tag-1", "tag-2"],
      tagNames: ["Obsidian", "插件"],
      briefContent: "Post excerpt",
    });

    expect(findButtonByText(modal.contentEl as never, "继续发布")).toBeTruthy();
    await (modal as any).handleSubmit();
    await Promise.resolve();
    const result = await Promise.race([
      (modal as any).resultPromise,
      Promise.resolve("pending"),
    ]);

    expect(result).toEqual({
      provider: "juejin",
      categoryId: "category-1",
      categoryName: "后端",
      tagIds: ["tag-1", "tag-2"],
      tagNames: ["Obsidian", "插件"],
      briefContent: "Post excerpt",
    });
  });
});

afterEach(() => {
  resetObsidianTestState();
});
