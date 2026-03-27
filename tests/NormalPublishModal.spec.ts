import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeElement, Notice, TFile, resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { PublishableNote } from "../src/core/note";
import { createWordpressTarget, createZhihuTarget } from "../src/settings";
import { NormalPublishModal } from "../src/ui/modals/NormalPublishModal";

function createApp() {
  return {
    setting: {
      open: vi.fn(),
      openTabById: vi.fn(),
    },
  };
}

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "# Post",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Excerpt",
    slug: "post",
    tags: [],
    categories: [],
    ...overrides,
  };
}

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
  const found = walk(root).find((element) => element.tagName === "input" && element.name === name);
  if (!found) {
    throw new Error(`Input not found: ${name}`);
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

function hasClass(element: FakeElement, className: string): boolean {
  return element.className.split(/\s+/).includes(className);
}

function findByClass(root: FakeElement, className: string): FakeElement {
  const found = walk(root).find((element) => hasClass(element, className));
  if (!found) {
    throw new Error(`Element not found with class: ${className}`);
  }
  return found;
}

function findAllByClass(root: FakeElement, className: string): FakeElement[] {
  return walk(root).filter((element) => hasClass(element, className));
}

afterEach(() => {
  resetObsidianTestState();
});

describe("NormalPublishModal", () => {
  it("renders the normal publish dialog as a two-pane shell with semantic layout classes", async () => {
    setObsidianTestLanguage("en");

    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", defaultColumnId: "column-1" };
    const settings = { targets: [wordpress, zhihu], records: [] };
    const plugin = {
      app: createApp(),
      manifest: { id: "ultimate-publisher" },
      settings,
      saveSettings: vi.fn(async () => {}),
    };
    const workflow = {
      runSingle: vi.fn(async () => ({
        settings,
        action: "publish" as const,
      })),
    };
    const file = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });
    const providerRegistry = {
      get: vi.fn((target) => ({
        loadNormalPublishOptions: vi.fn().mockResolvedValue(
          target.provider === "zhihu"
            ? { zhihuColumns: [{ id: "column-1", label: "Demo Column" }] }
            : {}
        ),
      })),
    };

    const modal = new NormalPublishModal(
      plugin as never,
      file,
      workflow as never,
      providerRegistry as never,
      async () => createNote()
    );
    await modal.onOpen();

    expect(hasClass((modal as any).modalEl, "ultimate-publisher-normal-modal-frame")).toBe(true);
    expect(hasClass((modal as any).containerEl, "ultimate-publisher-normal-modal-container")).toBe(true);
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-modal")).toBeTruthy();
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-header")).toBeTruthy();
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-note-card")).toBeTruthy();
    expect(textTree(modal.contentEl as never)).not.toContain("Notes/Post.md");
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-shell")).toBeTruthy();
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-sidebar")).toBeTruthy();
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-main")).toBeTruthy();
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-detail-panel")).toBeTruthy();
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-detail-body")).toBeTruthy();
    expect(findByClass(modal.contentEl as never, "ultimate-publisher-normal-actions")).toBeTruthy();

    const targetItems = findAllByClass(modal.contentEl as never, "ultimate-publisher-normal-target-item");
    const targetButtons = findAllByClass(modal.contentEl as never, "ultimate-publisher-normal-target-button");
    const targetMeta = findAllByClass(modal.contentEl as never, "ultimate-publisher-normal-target-meta");
    expect(targetItems).toHaveLength(2);
    expect(targetButtons).toHaveLength(2);
    expect(targetMeta).toHaveLength(0);
    expect(targetButtons.some((button) => hasClass(button, "is-selected"))).toBe(true);
  });

  it("shows only enabled targets in the left pane and selects the first one", async () => {
    setObsidianTestLanguage("en");

    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", defaultColumnId: "column-1" };
    const disabled = { ...createZhihuTarget(), id: "disabled", name: "Disabled Target", enabled: false };
    const settings = { targets: [wordpress, zhihu, disabled], records: [] };
    const plugin = {
      app: createApp(),
      manifest: { id: "ultimate-publisher" },
      settings,
      saveSettings: vi.fn(async () => {}),
    };
    const workflow = {
      runSingle: vi.fn(async () => ({
        settings,
        action: "publish" as const,
      })),
    };
    const file = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });
    const providerRegistry = {
      get: vi.fn((target) => ({
        loadNormalPublishOptions: vi.fn().mockResolvedValue(
          target.provider === "zhihu"
            ? { zhihuColumns: [{ id: "column-1", label: "Demo Column" }] }
            : {}
        ),
      })),
    };

    const modal = new NormalPublishModal(
      plugin as never,
      file,
      workflow as never,
      providerRegistry as never,
      async () => createNote()
    );
    await modal.onOpen();

    const treeText = textTree(modal.contentEl as never);
    expect(treeText).toContain("WordPress");
    expect(treeText).toContain("Zhihu");
    expect(treeText).not.toContain("Disabled Target");
    expect(findInputByName(modal.contentEl as never, "normal-publish-title").value).toBe("Post");
    expect((modal as any).selectedTargetId).toBe("wp");
  });

  it("publishes only the currently selected target with explicit detailed context", async () => {
    setObsidianTestLanguage("en");

    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", defaultColumnId: "column-1" };
    const settings = { targets: [wordpress, zhihu], records: [] };
    const plugin = {
      app: createApp(),
      manifest: { id: "ultimate-publisher" },
      settings,
      saveSettings: vi.fn(async () => {}),
    };
    const workflow = {
      runSingle: vi.fn(async () => ({
        settings,
        action: "publish" as const,
      })),
    };
    const file = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });
    const providerRegistry = {
      get: vi.fn((target) => ({
        loadNormalPublishOptions: vi.fn().mockResolvedValue(
          target.provider === "zhihu"
            ? { zhihuColumns: [{ id: "column-1", label: "Demo Column" }] }
            : {}
        ),
      })),
    };

    const modal = new NormalPublishModal(
      plugin as never,
      file,
      workflow as never,
      providerRegistry as never,
      async () => createNote()
    );
    await modal.onOpen();

    findButtonByText(modal.contentEl as never, "Zhihu").click();
    await Promise.resolve();

    const titleInput = findInputByName(modal.contentEl as never, "normal-publish-title");
    titleInput.value = "Custom Title";
    titleInput.dispatchEvent("input", { target: titleInput });

    const columnInput = findInputByName(modal.contentEl as never, "normal-publish-zhihu-columnId");
    columnInput.value = "column-2";
    columnInput.dispatchEvent("input", { target: columnInput });

    findButtonByText(modal.contentEl as never, "Publish").click();
    await Promise.resolve();

    expect(workflow.runSingle).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ id: "zhihu" }),
      settings,
      expect.objectContaining({
        common: { title: "Custom Title" },
        provider: expect.objectContaining({
          provider: "zhihu",
          columnId: "column-2",
        }),
      })
    );
  });

  it("shows remote fallback copy when option loading fails", async () => {
    setObsidianTestLanguage("en");

    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", defaultColumnId: "" };
    const settings = { targets: [zhihu], records: [] };
    const plugin = {
      app: createApp(),
      manifest: { id: "ultimate-publisher" },
      settings,
      saveSettings: vi.fn(async () => {}),
    };
    const workflow = {
      runSingle: vi.fn(async () => ({
        settings,
        action: "publish" as const,
      })),
    };
    const file = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });
    const providerRegistry = {
      get: vi.fn(() => ({
        loadNormalPublishOptions: vi.fn().mockRejectedValue(new Error("network error")),
      })),
    };

    const modal = new NormalPublishModal(
      plugin as never,
      file,
      workflow as never,
      providerRegistry as never,
      async () => createNote()
    );
    await modal.onOpen();

    expect(textTree(modal.contentEl as never)).toContain("Remote options failed to load. Switched to manual input.");
  });

  it("uses past-tense success notice wording in english", async () => {
    setObsidianTestLanguage("en");

    const target = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const settings = { targets: [target], records: [] };
    const plugin = {
      app: createApp(),
      manifest: { id: "ultimate-publisher" },
      settings,
      saveSettings: vi.fn(async () => {}),
    };
    const workflow = {
      runSingle: vi.fn(async () => ({
        settings,
        action: "publish" as const,
      })),
    };
    const file = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });

    const modal = new NormalPublishModal(
      plugin as never,
      file,
      workflow as never,
      undefined,
      async () => createNote()
    );
    await (modal as any).handlePublish(target);

    expect(Notice.instances.at(-1)?.message).toBe("Publish succeeded: WordPress published.");
  });
});
