import { MarkdownView, Menu, Notice, TFile, resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/i18n";
import UltimatePublisherPlugin from "../src/plugin";
import { createWordpressTarget, createZhihuTarget } from "../src/settings";
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
        { id: "zh", name: "Zhihu", provider: "zhihu" },
      ],
    }, createI18n("en"));

    expect(model.map((item) => ({
      key: item.key,
      icon: item.icon,
      section: item.section,
    }))).toEqual([
      {
        key: "dashboard",
        icon: "layout-dashboard",
        section: "ultimate-publisher-dashboard",
      },
      {
        key: "quick-publish",
        icon: "zap",
        section: "ultimate-publisher-quick-publish",
      },
      {
        key: "normal-publish",
        icon: "send",
        section: "ultimate-publisher-normal-publish",
      },
      {
        key: "batch-publish",
        icon: "layers-3",
        section: "ultimate-publisher-batch-publish",
      },
      {
        key: "publish-settings",
        icon: "settings",
        section: "ultimate-publisher-settings",
      },
    ]);
    expect(model[1].children).toEqual([
      expect.objectContaining({
        targetId: "wp",
        icon: "globe",
        section: "ultimate-publisher-quick-publish-targets",
      }),
      expect.objectContaining({
        targetId: "zh",
        icon: "upload",
        section: "ultimate-publisher-quick-publish-targets",
      }),
    ]);
  });

  it("disables note-dependent entries when no markdown note is active", () => {
    const model = buildPublisherMenuModel({
      hasActiveMarkdown: false,
      enabledTargets: [{ id: "wp", name: "WordPress", provider: "wordpress" }],
    }, createI18n("en"));

    expect(model.find((item) => item.key === "dashboard")?.disabled).toBe(false);
    expect(model.find((item) => item.key === "normal-publish")?.disabled).toBe(true);
    expect(model.find((item) => item.key === "batch-publish")?.disabled).toBe(true);
  });

  it("shows a disabled quick-publish placeholder when no targets are enabled", () => {
    const model = buildPublisherMenuModel({
      hasActiveMarkdown: true,
      enabledTargets: [],
    }, createI18n("en"));

    const quickPublish = model.find((item) => item.key === "quick-publish");
    expect(quickPublish?.children).toEqual([
      expect.objectContaining({
        key: "quick-publish-empty",
        title: "Enable at least one publish target",
        icon: "circle-alert",
        section: "ultimate-publisher-quick-publish-empty",
        disabled: true,
      }),
    ]);
  });

  it("localizes menu titles and empty placeholder in zh-CN", () => {
    const model = buildPublisherMenuModel({
      hasActiveMarkdown: true,
      enabledTargets: [],
    }, createI18n("zh-CN"));

    expect(model.map((item) => item.title)).toEqual([
      "仪表盘",
      "快速发布",
      "普通发布",
      "批量发布",
      "发布设置",
    ]);

    const quickPublish = model.find((item) => item.key === "quick-publish");
    expect(quickPublish?.children).toEqual([
      expect.objectContaining({
        key: "quick-publish-empty",
        title: "请至少启用一个发布目标",
        helpText: "当前没有可用的快速发布目标",
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
        { ...createZhihuTarget(), id: "zh", name: "Zhihu" },
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
    expect(rootMenu.useNativeMenu).toBe(false);
    expect(rootMenu.items.map((item) => ({
      title: item.title,
      icon: item.icon,
      section: item.section,
    }))).toEqual([
      {
        title: "Dashboard",
        icon: "layout-dashboard",
        section: "ultimate-publisher-dashboard",
      },
      {
        title: "Quick Publish",
        icon: "zap",
        section: "ultimate-publisher-quick-publish",
      },
      {
        title: "Normal Publish",
        icon: "send",
        section: "ultimate-publisher-normal-publish",
      },
      {
        title: "Batch Publish",
        icon: "layers-3",
        section: "ultimate-publisher-batch-publish",
      },
      {
        title: "Publish Settings",
        icon: "settings",
        section: "ultimate-publisher-settings",
      },
    ]);

    await rootMenu.items[0].trigger();
    expect(openDashboard).toHaveBeenCalledTimes(1);

    await rootMenu.items[1].trigger({
      currentTarget: {
        getBoundingClientRect: () => ({ left: 120, right: 300, top: 64, bottom: 92, width: 180 }),
      },
    });
    const quickPublishMenu = Menu.instances[1];
    expect(quickPublishMenu.useNativeMenu).toBe(false);
    expect(quickPublishMenu.items.map((item) => ({
      title: item.title,
      icon: item.icon,
      section: item.section,
    }))).toEqual([
      {
        title: "WordPress",
        icon: "globe",
        section: "ultimate-publisher-quick-publish-targets",
      },
      {
        title: "Zhihu",
        icon: "upload",
        section: "ultimate-publisher-quick-publish-targets",
      },
    ]);
    expect(quickPublishMenu.lastPosition).toEqual({
      x: 300,
      y: 64,
      width: 180,
    });
    await quickPublishMenu.items[0].trigger();
    expect(runQuickPublish).toHaveBeenCalledWith("wp");

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

  it("shows zh-CN notice when publishing without an active markdown note", async () => {
    setObsidianTestLanguage("zh-CN");
    const plugin = new UltimatePublisherPlugin(createApp(null) as never, { id: "ultimate-publisher" } as never);

    await plugin.publishActiveNote();

    expect(Notice.instances.at(-1)?.message).toBe("请先打开一个 Markdown 笔记再发布。");
  });
});
