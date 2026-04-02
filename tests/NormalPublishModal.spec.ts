import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeElement, Notice, TFile, resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { PublishableNote } from "../src/core/note";
import { createCsdnTarget, createWordpressTarget, createZhihuTarget } from "../src/settings";
import { NormalPublishModal } from "../src/ui/modals/NormalPublishModal";

function createApp() {
  return {
    setting: {
      open: vi.fn(),
      openTabById: vi.fn(),
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
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

function findTextEntryByName(root: FakeElement, name: string): FakeElement {
  const found = walk(root).find(
    (element) => (element.tagName === "input" || element.tagName === "textarea") && element.name === name
  );
  if (!found) {
    throw new Error(`Text entry not found: ${name}`);
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
    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", defaultColumnId: "" };
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

    expect(() => findInputByName(modal.contentEl as never, "normal-publish-zhihu-columnId")).toThrow(/Input not found/);

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
        }),
      })
    );
  });

  it("preserves selected wordpress categories when another detailed field changes before publish", async () => {
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
    const providerRegistry = {
      get: vi.fn(() => ({
        loadNormalPublishOptions: vi.fn().mockResolvedValue({
          wordpressCategories: [{ id: "1", label: "Notes", description: "notes" }],
          wordpressTags: [],
        }),
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

    const categoryInput = findInputByName(modal.contentEl as never, "normal-publish-wordpress-categories");
    categoryInput.click();

    const categoryOption = findInputByName(modal.contentEl as never, "normal-publish-wordpress-categories-option-1");
    categoryOption.checked = true;
    categoryOption.dispatchEvent("change", { currentTarget: categoryOption, target: categoryOption });

    const statusSelect = findSelectByName(modal.contentEl as never, "normal-publish-wordpress-status");
    statusSelect.value = "publish";
    statusSelect.dispatchEvent("change", { currentTarget: statusSelect, target: statusSelect });

    findButtonByText(modal.contentEl as never, "Publish").click();
    await Promise.resolve();

    expect(workflow.runSingle).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ id: "wp" }),
      settings,
      expect.objectContaining({
        provider: expect.objectContaining({
          provider: "wordpress",
          categories: ["Notes"],
          status: "publish",
        }),
      })
    );
  });

  it("does not try to load zhihu remote options when normal publish has no zhihu-specific field", async () => {
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

    expect(textTree(modal.contentEl as never)).not.toContain("Remote options failed to load. Switched to manual input.");
    expect(() => findInputByName(modal.contentEl as never, "normal-publish-zhihu-columnId")).toThrow(/Input not found/);
  });

  it("uses llm generation to update the common title draft", async () => {
    setObsidianTestLanguage("en");

    const target = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const settings = {
      targets: [target],
      records: [],
      llm: {
        enabled: true,
        vendor: "openai" as const,
        apiKey: "secret",
        model: "gpt-5-mini",
        endpointOverride: "",
        temperature: 0.3,
        timeoutMs: 30000,
        maxInputChars: 12000,
      },
    };
    const llmService = {
      generate: vi.fn().mockResolvedValue({
        text: "Sharper Title",
        vendor: "openai",
        model: "gpt-5-mini",
      }),
    };

    const modal = new NormalPublishModal(
      {
        app: createApp(),
        manifest: { id: "ultimate-publisher" },
        settings,
        saveSettings: vi.fn(async () => {}),
      } as never,
      new TFile({ path: "Notes/Post.md", basename: "Post", extension: "md", name: "Post.md" }),
      { runSingle: vi.fn() } as never,
      { get: vi.fn(() => ({})) } as never,
      async () => createNote(),
      llmService as never
    );

    await modal.onOpen();

    findButtonByText(modal.contentEl as never, "Optimize Title").click();
    await Promise.resolve();

    expect(findInputByName(modal.contentEl as never, "normal-publish-title").value).toBe("Sharper Title");
    expect(llmService.generate).toHaveBeenCalled();
  });

  it("shows a field-level ai error without blocking publish actions", async () => {
    setObsidianTestLanguage("en");

    const target = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const settings = {
      targets: [target],
      records: [],
      llm: {
        enabled: true,
        vendor: "openai" as const,
        apiKey: "secret",
        model: "gpt-5-mini",
        endpointOverride: "",
        temperature: 0.3,
        timeoutMs: 30000,
        maxInputChars: 12000,
      },
    };
    const llmService = {
      generate: vi.fn().mockRejectedValue(new Error("LLM request was rate-limited. Please retry later.")),
    };

    const modal = new NormalPublishModal(
      {
        app: createApp(),
        manifest: { id: "ultimate-publisher" },
        settings,
        saveSettings: vi.fn(async () => {}),
      } as never,
      new TFile({ path: "Notes/Post.md", basename: "Post", extension: "md", name: "Post.md" }),
      { runSingle: vi.fn() } as never,
      { get: vi.fn(() => ({})) } as never,
      async () => createNote(),
      llmService as never
    );

    await modal.onOpen();

    findButtonByText(modal.contentEl as never, "Generate").click();
    await Promise.resolve();

    expect(textTree(modal.contentEl as never)).toContain("LLM request was rate-limited. Please retry later.");
    expect(findButtonByText(modal.contentEl as never, "Publish").disabled).toBe(false);
  });

  it("applies excerpt ai results to the initiating target after switching targets mid-flight", async () => {
    setObsidianTestLanguage("en");

    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const csdn = { ...createCsdnTarget(), id: "csdn", name: "CSDN" };
    const settings = {
      targets: [wordpress, csdn],
      records: [],
      llm: {
        enabled: true,
        vendor: "openai" as const,
        apiKey: "secret",
        model: "gpt-5-mini",
        endpointOverride: "",
        temperature: 0.3,
        timeoutMs: 30000,
        maxInputChars: 12000,
      },
    };
    const deferred = createDeferred<{ text: string; vendor: string; model: string }>();
    const llmService = {
      generate: vi.fn().mockReturnValue(deferred.promise),
    };

    const modal = new NormalPublishModal(
      {
        app: createApp(),
        manifest: { id: "ultimate-publisher" },
        settings,
        saveSettings: vi.fn(async () => {}),
      } as never,
      new TFile({ path: "Notes/Post.md", basename: "Post", extension: "md", name: "Post.md" }),
      { runSingle: vi.fn() } as never,
      { get: vi.fn(() => ({})) } as never,
      async () => createNote(),
      llmService as never
    );

    await modal.onOpen();

    findButtonByText(modal.contentEl as never, "Generate").click();
    await Promise.resolve();

    expect(textTree(modal.contentEl as never)).toContain("Generating...");

    findButtonByText(modal.contentEl as never, "CSDN").click();
    await Promise.resolve();

    deferred.resolve({
      text: "WordPress excerpt from AI",
      vendor: "openai",
      model: "gpt-5-mini",
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(findTextEntryByName(modal.contentEl as never, "normal-publish-csdn-excerpt").value).toBe("Excerpt");

    findButtonByText(modal.contentEl as never, "WordPress").click();
    await Promise.resolve();

    expect(findTextEntryByName(modal.contentEl as never, "normal-publish-wordpress-excerpt").value).toBe("WordPress excerpt from AI");
    expect(textTree(modal.contentEl as never)).not.toContain("Generating...");
  });

  it("keeps title ai busy state under a common key across target switches", async () => {
    setObsidianTestLanguage("en");

    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", defaultColumnId: "" };
    const settings = {
      targets: [wordpress, zhihu],
      records: [],
      llm: {
        enabled: true,
        vendor: "openai" as const,
        apiKey: "secret",
        model: "gpt-5-mini",
        endpointOverride: "",
        temperature: 0.3,
        timeoutMs: 30000,
        maxInputChars: 12000,
      },
    };
    const deferred = createDeferred<{ text: string; vendor: string; model: string }>();
    const llmService = {
      generate: vi.fn().mockReturnValue(deferred.promise),
    };

    const modal = new NormalPublishModal(
      {
        app: createApp(),
        manifest: { id: "ultimate-publisher" },
        settings,
        saveSettings: vi.fn(async () => {}),
      } as never,
      new TFile({ path: "Notes/Post.md", basename: "Post", extension: "md", name: "Post.md" }),
      { runSingle: vi.fn() } as never,
      { get: vi.fn(() => ({})) } as never,
      async () => createNote(),
      llmService as never
    );

    await modal.onOpen();

    findButtonByText(modal.contentEl as never, "Optimize Title").click();
    await Promise.resolve();

    findButtonByText(modal.contentEl as never, "Zhihu").click();
    await Promise.resolve();

    expect(textTree(modal.contentEl as never)).toContain("Generating...");

    deferred.resolve({
      text: "Shared AI Title",
      vendor: "openai",
      model: "gpt-5-mini",
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(findInputByName(modal.contentEl as never, "normal-publish-title").value).toBe("Shared AI Title");
    expect(textTree(modal.contentEl as never)).not.toContain("Generating...");
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
