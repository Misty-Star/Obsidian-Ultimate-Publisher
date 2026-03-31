import { readFileSync } from "node:fs";
import { FakeElement, MarkdownView, Menu, Notice, TFile, resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/i18n";
import UltimatePublisherPlugin from "../src/plugin";
import { createWordpressTarget, createZhihuTarget } from "../src/settings";
import { buildPublisherMenuModel } from "../src/ui/publisherMenu";

const pluginStyles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

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

type DocumentStub = ReturnType<typeof createDocumentStub>;

const originalDocument = globalThis.document;

function createDocumentStub() {
  const body = new FakeElement("body");
  return {
    body,
    createElement(tagName: string) {
      return new FakeElement(tagName);
    },
    querySelector(selector: string) {
      return body.querySelector(selector);
    },
    querySelectorAll(selector: string) {
      return body.querySelectorAll(selector);
    },
  };
}

function installDocumentStub(doc: DocumentStub): void {
  (globalThis as typeof globalThis & { document?: Document }).document = doc as never;
}

function restoreDocumentStub(): void {
  if (originalDocument) {
    (globalThis as typeof globalThis & { document?: Document }).document = originalDocument;
    return;
  }

  Reflect.deleteProperty(globalThis, "document");
}

afterEach(() => {
  restoreDocumentStub();
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
      x: 120,
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

  it("renders ribbon menu DOM nodes that can be queried by menu class and data-section", () => {
    const doc = createDocumentStub();
    installDocumentStub(doc);
    const activeFile = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });
    const app = createApp(activeFile);
    const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
      records: [],
    };

    plugin.openRibbonMenu({
      getBoundingClientRect: () => ({ left: 8, bottom: 24, width: 16 }),
    } as never);

    expect(doc.querySelector(".menu")).toBeTruthy();
    expect(doc.querySelectorAll(".menu-item")).toHaveLength(5);
    expect(doc.querySelector('[data-section="ultimate-publisher-quick-publish"]')).toBeTruthy();
  });

  it("opens a submenu after 250ms hover and keeps it open when entering the submenu before the 300ms close delay", () => {
    vi.useFakeTimers();
    try {
      const doc = createDocumentStub();
      installDocumentStub(doc);
      const activeFile = new TFile({
        path: "Notes/Post.md",
        basename: "Post",
        extension: "md",
        name: "Post.md",
      });
      const app = createApp(activeFile);
      const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
      plugin.settings = {
        targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
        records: [],
      };

      plugin.openRibbonMenu({
        getBoundingClientRect: () => ({ left: 8, bottom: 24, width: 16 }),
      } as never);
      vi.runOnlyPendingTimers();

      const quickPublishItem = doc.querySelector('[data-section="ultimate-publisher-quick-publish"]');
      expect(quickPublishItem).toBeTruthy();

      quickPublishItem?.dispatchEvent("mouseenter", {
        currentTarget: quickPublishItem,
        target: quickPublishItem,
      });

      vi.advanceTimersByTime(249);
      expect(Menu.instances).toHaveLength(1);
      expect(doc.querySelector('[aria-label="WordPress"]')).toBeNull();

      vi.advanceTimersByTime(1);
      vi.runOnlyPendingTimers();
      expect(Menu.instances).toHaveLength(2);
      expect(doc.querySelector('[aria-label="WordPress"]')).toBeTruthy();

      quickPublishItem?.dispatchEvent("mouseleave", {
        currentTarget: quickPublishItem,
        target: quickPublishItem,
      });

      vi.advanceTimersByTime(299);
      expect(doc.querySelectorAll(".menu")).toHaveLength(2);

      const submenuEl = doc.querySelectorAll(".menu")[1] ?? null;
      expect(submenuEl).toBeTruthy();
      submenuEl?.dispatchEvent("mouseenter", {
        currentTarget: submenuEl,
        target: submenuEl,
      });

      vi.advanceTimersByTime(1);
      expect(doc.querySelectorAll(".menu")).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes the hovered submenu after the full 300ms leave delay when the pointer does not enter the submenu", () => {
    vi.useFakeTimers();
    try {
      const doc = createDocumentStub();
      installDocumentStub(doc);
      const activeFile = new TFile({
        path: "Notes/Post.md",
        basename: "Post",
        extension: "md",
        name: "Post.md",
      });
      const app = createApp(activeFile);
      const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
      plugin.settings = {
        targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
        records: [],
      };

      plugin.openRibbonMenu({
        getBoundingClientRect: () => ({ left: 8, bottom: 24, width: 16 }),
      } as never);
      vi.runOnlyPendingTimers();

      const quickPublishItem = doc.querySelector('[data-section="ultimate-publisher-quick-publish"]');
      quickPublishItem?.dispatchEvent("mouseenter", {
        currentTarget: quickPublishItem,
        target: quickPublishItem,
      });

      vi.advanceTimersByTime(250);
      vi.runOnlyPendingTimers();
      expect(doc.querySelector('[aria-label="WordPress"]')).toBeTruthy();

      quickPublishItem?.dispatchEvent("mouseleave", {
        currentTarget: quickPublishItem,
        target: quickPublishItem,
      });

      vi.advanceTimersByTime(299);
      expect(doc.querySelector('[aria-label="WordPress"]')).toBeTruthy();

      vi.advanceTimersByTime(1);
      expect(doc.querySelector('[aria-label="WordPress"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("clicks a parent item to toggle its submenu immediately", async () => {
    const doc = createDocumentStub();
    installDocumentStub(doc);
    const activeFile = new TFile({
      path: "Notes/Post.md",
      basename: "Post",
      extension: "md",
      name: "Post.md",
    });
    const app = createApp(activeFile);
    const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
      records: [],
    };

    const runQuickPublish = vi.spyOn(plugin, "runQuickPublishForTarget").mockResolvedValue();

    plugin.openRibbonMenu({
      getBoundingClientRect: () => ({ left: 8, bottom: 24, width: 16 }),
    } as never);

    const quickPublishItem = doc.querySelector('[data-section="ultimate-publisher-quick-publish"]');
    expect(quickPublishItem).toBeTruthy();

    quickPublishItem?.dispatchEvent("click", {
      currentTarget: quickPublishItem,
      target: quickPublishItem,
    });

    expect(doc.querySelector('[aria-label="WordPress"]')).toBeTruthy();
    expect(runQuickPublish).not.toHaveBeenCalled();

    quickPublishItem?.dispatchEvent("click", {
      currentTarget: quickPublishItem,
      target: quickPublishItem,
    });

    expect(doc.querySelector('[aria-label="WordPress"]')).toBeNull();
    expect(runQuickPublish).not.toHaveBeenCalled();
  });

  it("anchors the quick publish submenu to the parent menu edge even when the hovered row is visually narrower", () => {
    vi.useFakeTimers();
    try {
      const doc = createDocumentStub();
      installDocumentStub(doc);
      const activeFile = new TFile({
        path: "Notes/Post.md",
        basename: "Post",
        extension: "md",
        name: "Post.md",
      });
      const app = createApp(activeFile);
      const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
      plugin.settings = {
        targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
        records: [],
      };

      plugin.openRibbonMenu({
        getBoundingClientRect: () => ({ left: 8, bottom: 24, width: 16 }),
      } as never);
      vi.runOnlyPendingTimers();

      const rootMenuEl = doc.querySelector(".menu");
      const quickPublishItem = doc.querySelector('[data-section="ultimate-publisher-quick-publish"]');
      expect(rootMenuEl).toBeTruthy();
      expect(quickPublishItem).toBeTruthy();

      rootMenuEl?.setBoundingClientRect({
        left: 8,
        right: 188,
        top: 24,
        bottom: 164,
        width: 180,
        height: 140,
      });
      quickPublishItem?.setBoundingClientRect({
        left: 24,
        right: 140,
        top: 52,
        bottom: 80,
        width: 116,
        height: 28,
      });

      quickPublishItem?.dispatchEvent("mouseenter", {
        currentTarget: quickPublishItem,
        target: quickPublishItem,
      });

      vi.advanceTimersByTime(250);
      vi.runOnlyPendingTimers();

      expect(Menu.instances[1]?.lastPosition).toEqual({
        x: 8,
        y: 52,
        width: 180,
      });
      expect(doc.querySelectorAll(".menu")[1]?.getBoundingClientRect().left).toBe(188);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears pending hover timers when the root menu hides", () => {
    vi.useFakeTimers();
    try {
      const doc = createDocumentStub();
      installDocumentStub(doc);
      const activeFile = new TFile({
        path: "Notes/Post.md",
        basename: "Post",
        extension: "md",
        name: "Post.md",
      });
      const app = createApp(activeFile);
      const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
      plugin.settings = {
        targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
        records: [],
      };

      plugin.openRibbonMenu({
        getBoundingClientRect: () => ({ left: 8, bottom: 24, width: 16 }),
      } as never);
      vi.runOnlyPendingTimers();

      const quickPublishItem = doc.querySelector('[data-section="ultimate-publisher-quick-publish"]');
      quickPublishItem?.dispatchEvent("mouseenter", {
        currentTarget: quickPublishItem,
        target: quickPublishItem,
      });

      Menu.instances[0]?.hide();
      vi.runOnlyPendingTimers();
      vi.advanceTimersByTime(250);

      expect(Menu.instances).toHaveLength(1);
      expect(doc.querySelector('[aria-label="WordPress"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("adds a single-child quick publish target style hook so a lone submenu row aligns vertically with its parent row", () => {
    expect(pluginStyles).toContain('.menu-item[data-section="ultimate-publisher-quick-publish-targets"]:only-child');
    expect(pluginStyles).toContain("padding-top: 6px;");
    expect(pluginStyles).toContain("margin-top: 2px;");
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
