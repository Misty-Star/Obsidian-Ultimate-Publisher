import { MarkdownView, Menu, TFile, resetObsidianTestState } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";
import UltimatePublisherPlugin from "../src/plugin";
import { createLocalExportTarget, createWordpressTarget } from "../src/settings";
import { buildPublisherMenuModel } from "../src/ui/publisherMenu";

function createApp(activeFile: TFile | null = null) {
  const rightLeaf = {
    setViewState: vi.fn(async () => {}),
  };

  return {
    vault: {
      cachedRead: vi.fn(async () => ""),
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
      getRightLeaf: vi.fn(() => rightLeaf),
      revealLeaf: vi.fn(async () => {}),
      viewCreators: {},
    },
    setting: {
      open: vi.fn(),
      openTabById: vi.fn(),
    },
    rightLeaf,
  };
}

afterEach(() => {
  resetObsidianTestState();
});

describe("buildPublisherMenuModel", () => {
  it("returns the five fixed menu entries with enabled-target quick publish children", () => {
    const model = buildPublisherMenuModel({
      hasActiveMarkdown: true,
      enabledTargets: [
        { id: "wp", name: "WordPress", provider: "wordpress" },
        { id: "local", name: "Local Export", provider: "local-export" },
      ],
    });

    expect(model.map((item) => item.key)).toEqual([
      "dashboard",
      "quick-publish",
      "normal-publish",
      "batch-publish",
      "publish-settings",
    ]);
    expect(model[1].children?.map((item) => item.targetId)).toEqual(["local", "wp"]);
  });

  it("disables note-dependent entries when no markdown note is active", () => {
    const model = buildPublisherMenuModel({
      hasActiveMarkdown: false,
      enabledTargets: [{ id: "wp", name: "WordPress", provider: "wordpress" }],
    });

    expect(model.find((item) => item.key === "dashboard")?.disabled).toBe(false);
    expect(model.find((item) => item.key === "normal-publish")?.disabled).toBe(true);
    expect(model.find((item) => item.key === "batch-publish")?.disabled).toBe(true);
  });

  it("shows a disabled quick-publish placeholder when no targets are enabled", () => {
    const model = buildPublisherMenuModel({
      hasActiveMarkdown: true,
      enabledTargets: [],
    });

    const quickPublish = model.find((item) => item.key === "quick-publish");
    expect(quickPublish?.children).toEqual([
      expect.objectContaining({
        key: "quick-publish-empty",
        disabled: true,
      }),
    ]);
  });

  it("opens the ribbon menu and routes menu actions through thin plugin methods", async () => {
    const activeFile = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });
    const app = createApp(activeFile);
    const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      targets: [
        { ...createWordpressTarget(), id: "wp", name: "WordPress" },
        { ...createLocalExportTarget(), id: "local", name: "Local Export" },
      ],
      records: [],
    };

    const openDashboard = vi.spyOn(plugin, "openDashboard").mockResolvedValue();
    const runQuickPublish = vi.spyOn(plugin, "runQuickPublishForTarget").mockResolvedValue();
    const openNormalPublish = vi.spyOn(plugin, "openNormalPublishForActiveNote").mockImplementation(() => {});
    const openBatchPublish = vi.spyOn(plugin, "openBatchPublishForActiveNote").mockImplementation(() => {});
    const openPublishSettings = vi.spyOn(plugin, "openPublishSettings").mockImplementation(() => {});

    plugin.openRibbonMenu({
      getBoundingClientRect: () => ({ left: 8, bottom: 24, width: 16 }),
    } as never);

    const rootMenu = Menu.instances[0];
    expect(rootMenu.items.map((item) => item.title)).toEqual([
      "Dashboard",
      "Quick Publish",
      "Normal Publish",
      "Batch Publish",
      "Publish Settings",
    ]);

    await rootMenu.items[0].trigger();
    expect(openDashboard).toHaveBeenCalledTimes(1);

    await rootMenu.items[1].trigger({
      currentTarget: {
        getBoundingClientRect: () => ({ left: 120, right: 300, top: 64, bottom: 92, width: 180 }),
      },
    });
    const quickPublishMenu = Menu.instances[1];
    expect(quickPublishMenu.items.map((item) => item.title)).toEqual(["Local Export", "WordPress"]);
    expect(quickPublishMenu.lastPosition).toEqual({
      x: 300,
      y: 64,
      width: 180,
    });
    await quickPublishMenu.items[0].trigger();
    expect(runQuickPublish).toHaveBeenCalledWith("local");

    await rootMenu.items[2].trigger();
    await rootMenu.items[3].trigger();
    await rootMenu.items[4].trigger();
    expect(openNormalPublish).toHaveBeenCalledTimes(1);
    expect(openBatchPublish).toHaveBeenCalledTimes(1);
    expect(openPublishSettings).toHaveBeenCalledTimes(1);
  });

  it("opens publish settings through the existing Obsidian settings UI", () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);

    plugin.openPublishSettings();

    expect(plugin.app.setting?.open).toHaveBeenCalledTimes(1);
    expect(plugin.app.setting?.openTabById).toHaveBeenCalledWith("ultimate-publisher");
  });
});
