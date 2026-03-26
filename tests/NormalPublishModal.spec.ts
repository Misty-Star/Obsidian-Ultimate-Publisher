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

function findInputByName(root: FakeElement, name: string): FakeElement {
  const found = walk(root).find((element) => element.tagName === "input" && element.name === name);
  if (!found) {
    throw new Error(`Input not found: ${name}`);
  }
  return found;
}

function findButtonByText(root: FakeElement, text: string): FakeElement {
  const found = walk(root).find((element) => element.tagName === "button" && element.textContent === text);
  if (!found) {
    throw new Error(`Button not found: ${text}`);
  }
  return found;
}

afterEach(() => {
  resetObsidianTestState();
});

describe("NormalPublishModal", () => {
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
