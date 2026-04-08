import { MarkdownView, Notice, TFile, resetObsidianTestState } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/i18n";
import UltimatePublisherPlugin from "../src/plugin";
import { createWordpressTarget, DEFAULT_SETTINGS } from "../src/settings";

interface AppHarness {
  app: Record<string, unknown>;
  readContent(): string;
  emitCreate(file: TFile): Promise<void>;
  vaultModifySpy: ReturnType<typeof vi.fn>;
}

function createAppHarness(activeFile: TFile | null, initialContent: string): AppHarness {
  let content = initialContent;
  const createHandlers: Array<(file: TFile) => unknown> = [];
  const vaultModifySpy = vi.fn(async (_file: TFile, nextContent: string) => {
    content = nextContent;
  });

  const app = {
    vault: {
      cachedRead: vi.fn(async () => content),
      modify: vaultModifySpy,
      on: vi.fn((type: string, callback: (file: TFile) => unknown) => {
        if (type === "create") {
          createHandlers.push(callback);
        }
        return { type, callback };
      }),
      adapter: {
        readBinary: vi.fn(async () => new ArrayBuffer(0)),
      },
    },
    metadataCache: {
      getFileCache: vi.fn(() => null),
      getFirstLinkpathDest: vi.fn(() => null),
    },
    workspace: {
      getActiveViewOfType: vi.fn(() => (activeFile ? new MarkdownView(activeFile) : null)),
      getActiveFile: vi.fn(() => activeFile),
      getLeavesOfType: vi.fn(() => []),
      getRightLeaf: vi.fn(() => null),
      revealLeaf: vi.fn(async () => {}),
      viewCreators: {},
    },
    setting: {
      open: vi.fn(),
      openTabById: vi.fn(),
    },
  };

  return {
    app,
    readContent(): string {
      return content;
    },
    async emitCreate(file: TFile): Promise<void> {
      for (const callback of createHandlers) {
        callback(file);
      }
      await Promise.resolve();
    },
    vaultModifySpy,
  };
}

function createMarkdownFile(path: string): TFile {
  const basename = path.split("/").pop()?.replace(/\.md$/i, "") ?? "Untitled";
  return new TFile({
    path,
    name: `${basename}.md`,
    basename,
    extension: "md",
  });
}

afterEach(() => {
  resetObsidianTestState();
});

describe("frontmatter automation", () => {
  it("manually inserts publish frontmatter into the active markdown note", async () => {
    const file = createMarkdownFile("Notes/New.md");
    const harness = createAppHarness(file, "# Hello");
    const plugin = new UltimatePublisherPlugin(harness.app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "Main Blog", enabled: true }],
      records: [],
      frontmatterAutomation: {
        enabled: false,
        includeOptionComments: false,
      },
    };

    await plugin.insertPublishFrontmatterForActiveNote();

    expect(harness.vaultModifySpy).toHaveBeenCalledTimes(1);
    expect(harness.readContent().startsWith("---\ntitle:\nslug:\ntags: []\ncategories: []\ndescription:\nstatus:\n---\n\n")).toBe(true);
    expect(harness.readContent()).toContain("# Hello");
    expect(Notice.instances.at(-1)?.message).toBe(createI18n("en").t("notice.frontmatter.inserted"));
  });

  it("does not overwrite when active markdown already has frontmatter", async () => {
    const file = createMarkdownFile("Notes/Existing.md");
    const harness = createAppHarness(file, "---\ntitle: Existing\n---\n\n# Existing");
    const plugin = new UltimatePublisherPlugin(harness.app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "Main Blog", enabled: true }],
      records: [],
      frontmatterAutomation: {
        enabled: false,
        includeOptionComments: false,
      },
    };

    await plugin.insertPublishFrontmatterForActiveNote();

    expect(harness.vaultModifySpy).not.toHaveBeenCalled();
    expect(harness.readContent()).toBe("---\ntitle: Existing\n---\n\n# Existing");
    expect(Notice.instances.at(-1)?.message).toBe(createI18n("en").t("notice.frontmatter.skippedExisting"));
  });

  it("auto-inserts on create event when automation is enabled", async () => {
    const harness = createAppHarness(null, "# Auto");
    const plugin = new UltimatePublisherPlugin(harness.app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "Main Blog", enabled: true }],
      records: [],
      frontmatterAutomation: {
        enabled: true,
        includeOptionComments: false,
      },
    };
    vi.spyOn(plugin, "loadSettings").mockResolvedValue();

    await plugin.onload();

    await harness.emitCreate(createMarkdownFile("Notes/Auto.md"));
    await vi.waitFor(() => {
      expect(harness.vaultModifySpy).toHaveBeenCalledTimes(1);
    });

    expect(harness.readContent()).toContain("# Auto");
    expect(Notice.instances).toHaveLength(0);
  });

  it("re-reads latest markdown before write and does not overwrite create-time updates", async () => {
    const harness = createAppHarness(null, "# Initial");
    const plugin = new UltimatePublisherPlugin(harness.app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "Main Blog", enabled: true }],
      records: [],
      frontmatterAutomation: {
        enabled: true,
        includeOptionComments: false,
      },
    };
    vi.spyOn(plugin, "loadSettings").mockResolvedValue();

    const cachedReadSpy = harness.app.vault.cachedRead as ReturnType<typeof vi.fn>;
    cachedReadSpy
      .mockImplementationOnce(async () => "# Initial")
      .mockImplementationOnce(async () => "# Updated after create");

    await plugin.onload();

    await harness.emitCreate(createMarkdownFile("Notes/Updated.md"));
    await vi.waitFor(() => {
      expect(harness.vaultModifySpy).toHaveBeenCalledTimes(1);
    });

    expect(cachedReadSpy).toHaveBeenCalledTimes(2);
    expect(harness.readContent()).toContain("# Updated after create");
    expect(harness.readContent()).not.toContain("# Initial");
  });

  it("debounces repeated create events for the same markdown file", async () => {
    const harness = createAppHarness(null, "# Debounce");
    const plugin = new UltimatePublisherPlugin(harness.app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "Main Blog", enabled: true }],
      records: [],
      frontmatterAutomation: {
        enabled: true,
        includeOptionComments: false,
      },
    };
    vi.spyOn(plugin, "loadSettings").mockResolvedValue();
    (harness.app.vault as { cachedRead: (file: TFile) => Promise<string> }).cachedRead = vi.fn(async () => "# Debounce");

    await plugin.onload();

    const file = createMarkdownFile("Notes/Debounce.md");
    await harness.emitCreate(file);
    await vi.waitFor(() => {
      expect(harness.vaultModifySpy).toHaveBeenCalledTimes(1);
    });

    await harness.emitCreate(file);
    expect(harness.vaultModifySpy).toHaveBeenCalledTimes(1);
    expect(Notice.instances).toHaveLength(0);
  });
});
