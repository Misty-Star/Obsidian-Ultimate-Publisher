import { describe, expect, it } from "vitest";
import { FakeElement } from "obsidian";
import {
  JuejinPublishDraft,
  ProviderRemoteOptionsState,
  WordpressPublishDraft,
  ZhihuPublishDraft,
} from "../src/core/normalPublish/types";
import { createI18n } from "../src/i18n";
import { renderTargetForm } from "../src/ui/normalPublish/renderTargetForm";

function walk(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap((child) => walk(child))];
}

function findInputByName(root: FakeElement, name: string): FakeElement {
  const found = walk(root).find((element) => element.tagName === "input" && element.name === name);
  if (!found) {
    throw new Error(`Input not found: ${name}`);
  }
  return found;
}

function findSelectByName(root: FakeElement, name: string): FakeElement {
  const found = walk(root).find((element) => element.tagName === "select" && element.name === name);
  if (!found) {
    throw new Error(`Select not found: ${name}`);
  }
  return found;
}

function findByClass(root: FakeElement, className: string): FakeElement {
  const found = walk(root).find((element) => element.className.split(/\s+/).includes(className));
  if (!found) {
    throw new Error(`Element not found with class: ${className}`);
  }
  return found;
}

function findAllByClass(root: FakeElement, className: string): FakeElement[] {
  return walk(root).filter((element) => element.className.split(/\s+/).includes(className));
}

function findButtonByText(root: FakeElement, text: string): FakeElement {
  const found = walk(root).find((element) => element.tagName === "button" && element.textContent.includes(text));
  if (!found) {
    throw new Error(`Button not found: ${text}`);
  }
  return found;
}

function listInputNames(root: FakeElement): string[] {
  const relevantTags = new Set(["input", "textarea", "select"]);
  return walk(root)
    .filter((element) => relevantTags.has(element.tagName))
    .map((element) => element.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

function textTree(root: FakeElement): string {
  return walk(root)
    .map((element) => element.textContent)
    .join(" ");
}

describe("renderTargetForm", () => {
  it("opens the wordpress category dropdown from the input and syncs checked remote categories", () => {
    const container = new FakeElement("div");
    const draft: WordpressPublishDraft = {
      provider: "wordpress",
      slug: "post",
      excerpt: "Excerpt",
      tags: [],
      categories: [],
      status: "draft",
      password: "",
    };
    const remoteOptions: ProviderRemoteOptionsState = {
      status: "loaded",
      data: {
        wordpressCategories: [
          {
            id: "1",
            label: "Notes",
            description: "notes",
          },
        ],
        wordpressTags: [
          {
            id: "2",
            label: "Obsidian",
            description: "obsidian",
          },
        ],
      },
      manualFallbackFields: [],
    };
    let latestDraft: WordpressPublishDraft | null = null;
    let currentDraft = draft;

    renderTargetForm({
      container,
      draft,
      remoteOptions,
      i18n: createI18n("en"),
      onChange: (updateDraft) => {
        currentDraft = updateDraft(currentDraft) as WordpressPublishDraft;
        latestDraft = currentDraft;
      },
    });

    const categoryInput = findInputByName(container, "normal-publish-wordpress-categories");
    const categoryDropdown = findByClass(container, "ultimate-publisher-normal-dropdown");
    const categoryOption = findInputByName(container, "normal-publish-wordpress-categories-option-1");

    expect(categoryInput.type).toBe("text");
    expect(categoryDropdown.style.display).toBe("none");

    categoryInput.click();

    expect(categoryDropdown.style.display).toBe("block");
    expect(categoryOption.type).toBe("checkbox");

    categoryOption.checked = true;
    categoryOption.dispatchEvent("change", { currentTarget: categoryOption, target: categoryOption });

    expect(latestDraft).toMatchObject({
      categories: ["Notes"],
    });
  });

  it("confirms manually entered wordpress categories on Enter", () => {
    const container = new FakeElement("div");
    const draft: WordpressPublishDraft = {
      provider: "wordpress",
      slug: "post",
      excerpt: "Excerpt",
      tags: [],
      categories: ["Notes"],
      status: "draft",
      password: "",
    };
    const remoteOptions: ProviderRemoteOptionsState = {
      status: "loaded",
      data: {
        wordpressCategories: [
          {
            id: "1",
            label: "Notes",
            description: "notes",
          },
        ],
      },
      manualFallbackFields: [],
    };
    let latestDraft: WordpressPublishDraft | null = null;
    let currentDraft = draft;

    renderTargetForm({
      container,
      draft,
      remoteOptions,
      i18n: createI18n("en"),
      onChange: (updateDraft) => {
        currentDraft = updateDraft(currentDraft) as WordpressPublishDraft;
        latestDraft = currentDraft;
      },
    });

    const categoryInput = findInputByName(container, "normal-publish-wordpress-categories");
    categoryInput.value = "Notes, Manual";
    categoryInput.dispatchEvent("keydown", {
      key: "Enter",
      currentTarget: categoryInput,
      target: categoryInput,
      preventDefault() {},
    });

    expect(latestDraft).toMatchObject({
      categories: ["Notes", "Manual"],
    });
  });

  it("shows wordpress category alias inline on the right instead of a second helper line", () => {
    const container = new FakeElement("div");
    const draft: WordpressPublishDraft = {
      provider: "wordpress",
      slug: "post",
      excerpt: "Excerpt",
      tags: [],
      categories: [],
      status: "draft",
      password: "",
    };
    const remoteOptions: ProviderRemoteOptionsState = {
      status: "loaded",
      data: {
        wordpressCategories: [
          {
            id: "1",
            label: "人工智能",
            description: "ai",
          },
        ],
      },
      manualFallbackFields: [],
    };

    renderTargetForm({
      container,
      draft,
      remoteOptions,
      i18n: createI18n("zh-CN"),
      onChange: () => {},
    });

    const categoryInput = findInputByName(container, "normal-publish-wordpress-categories");
    categoryInput.click();

    const dropdown = findByClass(container, "ultimate-publisher-normal-dropdown");
    const alias = findByClass(dropdown, "ultimate-publisher-normal-alias");
    const inlineText = findByClass(dropdown, "ultimate-publisher-normal-choice-text");
    const helperLines = findAllByClass(dropdown, "ultimate-publisher-normal-helper");

    expect(alias.textContent).toBe("ai");
    expect(inlineText.children.map((child) => child.textContent)).toEqual(["人工智能", "ai"]);
    expect(helperLines).toHaveLength(0);
  });

  it("opens the juejin tagId dropdown from the input and syncs checked remote tag ids", () => {
    const container = new FakeElement("div");
    const draft: JuejinPublishDraft = {
      provider: "juejin",
      categoryId: "category-1",
      categoryName: "Backend",
      tagIds: [],
      tagNames: [],
      briefContent: "Brief content",
    };
    const remoteOptions: ProviderRemoteOptionsState = {
      status: "loaded",
      data: {
        juejinTags: [
          {
            id: "tag-1",
            label: "Obsidian",
          },
        ],
      },
      manualFallbackFields: [],
    };
    let latestDraft: JuejinPublishDraft | null = null;
    let currentDraft = draft;

    renderTargetForm({
      container,
      draft,
      remoteOptions,
      i18n: createI18n("en"),
      onChange: (updateDraft) => {
        currentDraft = updateDraft(currentDraft) as JuejinPublishDraft;
        latestDraft = currentDraft;
      },
    });

    const tagInput = findInputByName(container, "normal-publish-juejin-tagIds");
    const tagDropdown = findByClass(container, "ultimate-publisher-normal-dropdown");
    const tagOption = findInputByName(container, "normal-publish-juejin-tagIds-option-tag-1");

    expect(tagInput.type).toBe("text");
    expect(tagDropdown.style.display).toBe("none");

    tagInput.click();

    expect(tagDropdown.style.display).toBe("block");
    expect(tagOption.type).toBe("checkbox");

    tagOption.checked = true;
    tagOption.dispatchEvent("change", { currentTarget: tagOption, target: tagOption });

    expect(latestDraft).toMatchObject({
      tagIds: ["tag-1"],
    });
  });

  it("shows juejin category and tag choices by name without exposing raw ids in the UI", () => {
    const container = new FakeElement("div");
    const draft: JuejinPublishDraft = {
      provider: "juejin",
      categoryId: "category-1",
      categoryName: "Backend",
      tagIds: [],
      tagNames: [],
      briefContent: "Brief content",
    };
    const remoteOptions: ProviderRemoteOptionsState = {
      status: "loaded",
      data: {
        juejinCategories: [
          {
            id: "category-1",
            label: "Backend",
          },
        ],
        juejinTags: [
          {
            id: "tag-1",
            label: "Obsidian",
          },
        ],
      },
      manualFallbackFields: [],
    };

    renderTargetForm({
      container,
      draft,
      remoteOptions,
      i18n: createI18n("zh-CN"),
      onChange: () => {},
    });

    expect(textTree(container)).toContain("分类");
    expect(textTree(container)).toContain("标签");
    expect(textTree(container)).not.toContain("分类 ID");
    expect(textTree(container)).not.toContain("标签 ID");

    const categorySelect = findSelectByName(container, "normal-publish-juejin-categoryId");
    expect(categorySelect.children.map((option) => option.textContent)).toEqual(["Backend"]);

    const tagInput = findInputByName(container, "normal-publish-juejin-tagIds");
    tagInput.click();

    const tagDropdown = findByClass(container, "ultimate-publisher-normal-dropdown");
    expect(textTree(tagDropdown)).toContain("Obsidian");
    expect(textTree(tagDropdown)).not.toContain("tag-1");
    expect(findAllByClass(tagDropdown, "ultimate-publisher-normal-alias")).toHaveLength(0);
  });

  it("renders an ai action button for wordpress excerpt", () => {
    const container = new FakeElement("div");
    let clicked = false;

    renderTargetForm({
      container,
      draft: {
        provider: "wordpress",
        slug: "post",
        excerpt: "Excerpt",
        tags: [],
        categories: [],
        status: "draft",
        password: "",
      },
      remoteOptions: undefined,
      i18n: createI18n("en"),
      onChange: () => {},
      fieldActions: {
        excerpt: {
          label: "Generate",
          disabled: false,
          onClick: () => {
            clicked = true;
          },
        },
      },
    });

    findButtonByText(container, "Generate").click();
    expect(clicked).toBe(true);
  });

  it("renders juejin brief-content ai action in loading state", () => {
    const container = new FakeElement("div");
    let clicked = false;

    renderTargetForm({
      container,
      draft: {
        provider: "juejin",
        categoryId: "cat-1",
        categoryName: "Backend",
        tagIds: [],
        tagNames: [],
        briefContent: "",
      },
      remoteOptions: undefined,
      i18n: createI18n("en"),
      onChange: () => {},
      fieldActions: {
        briefContent: {
          label: "Generate",
          busyLabel: "Generating...",
          disabled: true,
          busy: true,
          onClick: () => {
            clicked = true;
          },
        },
      },
    });

    expect(textTree(container)).toContain("Generating...");
    const button = findButtonByText(container, "Generating...");
    expect(button.disabled).toBe(true);
    button.click();
    expect(clicked).toBe(false);
  });

  it("does not render the zhihu column field in normal publish", () => {
    const container = new FakeElement("div");
    const draft: ZhihuPublishDraft = {
      provider: "zhihu",
      columnId: "",
      columnTitle: "",
    };
    const remoteOptions: ProviderRemoteOptionsState = {
      status: "loaded",
      data: {
        zhihuColumns: [
          {
            id: "column-1",
            label: "Demo Column",
          },
        ],
      },
      manualFallbackFields: [],
    };

    renderTargetForm({
      container,
      draft,
      remoteOptions,
      i18n: createI18n("zh-CN"),
      onChange: () => {},
    });

    expect(listInputNames(container)).not.toContain("normal-publish-zhihu-columnId");
    expect(textTree(container)).not.toContain("专栏 ID");
  });

  it("hides shared fields and prefixes input names for batch cards", () => {
    const container = new FakeElement("div");
    const draft: WordpressPublishDraft = {
      provider: "wordpress",
      slug: "post",
      excerpt: "Excerpt",
      tags: ["tag-a"],
      categories: ["cat-a"],
      status: "draft",
      password: "",
    };

    renderTargetForm({
      container,
      draft,
      remoteOptions: undefined,
      i18n: createI18n("en"),
      hiddenFields: ["excerpt", "tags"],
      fieldNamePrefix: "batch-wp",
      onChange: () => {},
    });

    const inputNames = listInputNames(container);

    expect(inputNames).toContain("batch-wp-wordpress-slug");
    expect(inputNames).toContain("batch-wp-wordpress-categories");
    expect(inputNames).toContain("batch-wp-wordpress-status");
    expect(inputNames).not.toContain("batch-wp-wordpress-excerpt");
    expect(inputNames).not.toContain("batch-wp-wordpress-tags");
  });

  it("does not render select fields when they are hidden for batch cards", () => {
    const container = new FakeElement("div");
    renderTargetForm({
      container,
      draft: {
        provider: "wordpress",
        slug: "post",
        excerpt: "Excerpt",
        tags: ["tag-a"],
        categories: ["cat-a"],
        status: "draft",
        password: "",
      },
      remoteOptions: undefined,
      i18n: createI18n("en"),
      hiddenFields: ["status"],
      fieldNamePrefix: "batch-wp",
      onChange: () => {},
    });

    expect(listInputNames(container)).not.toContain("batch-wp-wordpress-status");
  });

  it("keeps the existing normal-publish names by default", () => {
    const container = new FakeElement("div");

    renderTargetForm({
      container,
      draft: {
        provider: "yuque",
        slug: "yuque-note",
        publicLevel: 1,
      },
      remoteOptions: undefined,
      i18n: createI18n("en"),
      onChange: () => {},
    });

    expect(findInputByName(container, "normal-publish-yuque-slug")).toBeDefined();
  });
});
