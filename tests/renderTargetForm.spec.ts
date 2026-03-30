import { describe, expect, it } from "vitest";
import { FakeElement } from "obsidian";
import { ProviderRemoteOptionsState, WordpressPublishDraft } from "../src/core/normalPublish/types";
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

function listInputNames(root: FakeElement): string[] {
  return walk(root)
    .filter((element) => element.tagName === "input")
    .map((element) => element.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
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
    expect(inputNames).not.toContain("batch-wp-wordpress-excerpt");
    expect(inputNames).not.toContain("batch-wp-wordpress-tags");
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
