import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeElement, TFile, resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import type { PublishableNote } from "../src/core/note";
import { createCsdnTarget, createWordpressTarget, createZhihuTarget } from "../src/settings";
import { BatchPublishModal } from "../src/ui/modals/BatchPublishModal";

function walk(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap((child) => walk(child))];
}

function textTree(root: FakeElement): string {
  return walk(root)
    .map((element) => element.textContent)
    .join(" ");
}

function elementText(root: FakeElement): string {
  return [root.textContent, ...root.children.map((child) => elementText(child))]
    .filter(Boolean)
    .join(" ");
}

function findInputByName(root: FakeElement, name: string): FakeElement {
  const found = walk(root).find((element) => {
    return (element.tagName === "input" || element.tagName === "textarea") && element.name === name;
  });
  if (!found) {
    throw new Error(`Input not found: ${name}`);
  }
  return found;
}

function findCheckboxByName(root: FakeElement, name: string): FakeElement {
  const found = walk(root).find((element) => element.tagName === "input" && element.type === "checkbox" && element.name === name);
  if (!found) {
    throw new Error(`Checkbox not found: ${name}`);
  }
  return found;
}

function findButtonByText(root: FakeElement, text: string): FakeElement {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const buttons = walk(root).filter((element) => element.tagName === "button");
  const exactMatch = buttons.find((element) => normalize(elementText(element)) === text);
  const found = exactMatch ?? buttons.find((element) => normalize(elementText(element)).includes(text));
  if (!found) {
    throw new Error(`Button not found: ${text}`);
  }
  return found;
}

function createModalFixtures() {
  const app = {
    setting: {
      open: vi.fn(),
      openTabById: vi.fn(),
    },
  };

  const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress", enabled: true };
  const csdn = { ...createCsdnTarget(), id: "csdn", name: "CSDN", enabled: true };
  const disabledZhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", enabled: false, defaultColumnId: "column-1" };
  const settings = { targets: [wordpress, csdn, disabledZhihu], records: [] };
  const plugin = {
    app,
    manifest: { id: "ultimate-publisher" },
    settings,
    saveSettings: vi.fn(async () => {}),
  };
  const workflow = {
    runBatch: vi.fn(),
  };
  const file = new TFile({
    path: "Notes/Batch Note.md",
    basename: "Batch Note",
    extension: "md",
    name: "Batch Note.md",
  });
  const note: PublishableNote = {
    filePath: "Notes/Batch Note.md",
    title: "Batch Note",
    markdown: "# Batch Note",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Initial excerpt",
    slug: "batch-note",
    tags: ["alpha", "beta"],
    categories: ["engineering"],
  };
  const providerRegistry = {
    get: vi.fn(() => ({
      loadNormalPublishOptions: vi.fn(async () => ({})),
    })),
  };
  const noteLoader = vi.fn(async () => note);

  const modal = new BatchPublishModal(
    plugin as never,
    file,
    workflow as never,
    providerRegistry as never,
    noteLoader
  );

  return {
    modal,
    note,
    plugin,
    providerRegistry,
    noteLoader,
    targets: {
      wordpress,
      csdn,
      disabledZhihu,
    },
  };
}

afterEach(() => {
  resetObsidianTestState();
});

describe("BatchPublishModal", () => {
  it("renders step 1 with all enabled targets selected and blocks next when selection is empty", async () => {
    setObsidianTestLanguage("zh-CN");
    const { modal } = createModalFixtures();

    await modal.onOpen();

    expect(textTree(modal.contentEl as never)).toContain("批量发布 - 步骤 1/3");

    const wordpressCheckbox = findCheckboxByName(modal.contentEl as never, "batch-publish-target-wp");
    const csdnCheckbox = findCheckboxByName(modal.contentEl as never, "batch-publish-target-csdn");
    expect(wordpressCheckbox.checked).toBe(true);
    expect(csdnCheckbox.checked).toBe(true);

    const nextButton = findButtonByText(modal.contentEl as never, "下一步：编辑字段");
    expect(nextButton.disabled).toBe(false);

    wordpressCheckbox.checked = false;
    wordpressCheckbox.dispatchEvent("change", { currentTarget: wordpressCheckbox, target: wordpressCheckbox });
    await Promise.resolve();

    csdnCheckbox.checked = false;
    csdnCheckbox.dispatchEvent("change", { currentTarget: csdnCheckbox, target: csdnCheckbox });
    await Promise.resolve();

    expect(findButtonByText(modal.contentEl as never, "下一步：编辑字段").disabled).toBe(true);
  });

  it("keeps common-field edits after navigating back and forth", async () => {
    setObsidianTestLanguage("zh-CN");
    const { modal } = createModalFixtures();

    await modal.onOpen();

    findButtonByText(modal.contentEl as never, "下一步：编辑字段").click();
    await Promise.resolve();

    expect(textTree(modal.contentEl as never)).toContain("公共字段");

    const titleInput = findInputByName(modal.contentEl as never, "batch-publish-common-title");
    titleInput.value = "回填后的公共标题";
    titleInput.dispatchEvent("input", { currentTarget: titleInput, target: titleInput });

    findButtonByText(modal.contentEl as never, "上一步：选择目标").click();
    await Promise.resolve();
    expect(textTree(modal.contentEl as never)).toContain("批量发布 - 步骤 1/3");

    findButtonByText(modal.contentEl as never, "下一步：编辑字段").click();
    await Promise.resolve();

    expect(findInputByName(modal.contentEl as never, "batch-publish-common-title").value).toBe("回填后的公共标题");
  });
});
