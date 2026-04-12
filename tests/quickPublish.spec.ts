import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownView, Notice, TFile, resetObsidianTestState } from "obsidian";
import UltimatePublisherPlugin from "../src/plugin";
import { createJuejinTarget, DEFAULT_SETTINGS } from "../src/settings";

const { extractPublishableNoteMock } = vi.hoisted(() => ({
  extractPublishableNoteMock: vi.fn(),
}));

vi.mock("../src/core/note", async () => {
  const actual = await vi.importActual<typeof import("../src/core/note")>("../src/core/note");
  return {
    ...actual,
    extractPublishableNote: extractPublishableNoteMock,
  };
});

function createApp(activeFile: TFile | null = null) {
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
      getRightLeaf: vi.fn(() => null),
      revealLeaf: vi.fn(async () => {}),
      viewCreators: {},
    },
    setting: {
      open: vi.fn(),
      openTabById: vi.fn(),
    },
  };
}

function createActiveFile(): TFile {
  return new TFile({
    path: "Notes/Post.md",
    basename: "Post",
    extension: "md",
    name: "Post.md",
  });
}

afterEach(() => {
  extractPublishableNoteMock.mockReset();
  resetObsidianTestState();
});

describe("quick publish", () => {
  it("prompts for missing juejin metadata and publishes with one-off context", async () => {
    const file = createActiveFile();
    const app = createApp(file);
    const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
    const target = {
      ...createJuejinTarget(),
      id: "jj",
      name: "Juejin",
      enabled: true,
      cookie: "sessionid=demo",
      defaultCategoryId: "",
      defaultTagIds: [],
    };
    const note = {
      filePath: file.path,
      title: "Post",
      markdown: "# Post",
      frontmatter: {},
      attachments: [],
      unresolvedAttachments: [],
      excerpt: "Post excerpt",
      slug: "post",
      tags: [],
      categories: [],
    };
    const workflow = {
      runSingle: vi.fn().mockResolvedValue({
        action: "publish" as const,
        record: {
          notePath: file.path,
          provider: "juejin",
          targetId: target.id,
          remoteId: "article-1",
          remoteUrl: "https://juejin.cn/post/article-1",
          lastPublishedAt: "2026-04-11T00:00:00.000Z",
          contentHash: "hash",
        },
        settings: {
          ...DEFAULT_SETTINGS,
          targets: [target],
          records: [],
        },
      }),
    };
    const provider = {
      loadNormalPublishOptions: vi.fn().mockResolvedValue({}),
    };

    extractPublishableNoteMock.mockResolvedValue(note);
    const initialSettings = {
      ...DEFAULT_SETTINGS,
      targets: [target],
      records: [],
    };
    plugin.settings = initialSettings;
    (plugin as any).providers = {
      get: vi.fn().mockReturnValue(provider),
    };
    (plugin as any).publishWorkflow = workflow;
    plugin.saveSettings = vi.fn(async () => {});

    const promptDraft = {
      provider: "juejin" as const,
      categoryId: "category-1",
      categoryName: "后端",
      tagIds: ["tag-1", "tag-2"],
      tagNames: ["Obsidian", "插件"],
      briefContent: "Post excerpt",
    };
    const promptSpy = vi
      .spyOn(plugin as any, "promptForJuejinQuickPublishDraft")
      .mockResolvedValue(promptDraft);

    await plugin.runQuickPublishForTarget(target.id);

    expect(promptSpy).toHaveBeenCalledWith(target, note);
    expect(workflow.runSingle).toHaveBeenCalledWith(
      file,
      target,
      initialSettings,
      {
        common: {
          title: "Post",
        },
        provider: promptDraft,
      }
    );
    expect(Notice.instances.at(-1)?.message).toContain("published");
  });

  it("cancels quick publish when juejin metadata prompt is dismissed", async () => {
    const file = createActiveFile();
    const app = createApp(file);
    const plugin = new UltimatePublisherPlugin(app as never, { id: "ultimate-publisher" } as never);
    const target = {
      ...createJuejinTarget(),
      id: "jj",
      name: "Juejin",
      enabled: true,
      cookie: "sessionid=demo",
      defaultCategoryId: "",
      defaultTagIds: [],
    };
    const note = {
      filePath: file.path,
      title: "Post",
      markdown: "# Post",
      frontmatter: {},
      attachments: [],
      unresolvedAttachments: [],
      excerpt: "Post excerpt",
      slug: "post",
      tags: [],
      categories: [],
    };
    const workflow = {
      runSingle: vi.fn(),
    };

    extractPublishableNoteMock.mockResolvedValue(note);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [target],
      records: [],
    };
    (plugin as any).providers = {
      get: vi.fn().mockReturnValue({
        loadNormalPublishOptions: vi.fn().mockResolvedValue({}),
      }),
    };
    (plugin as any).publishWorkflow = workflow;
    plugin.saveSettings = vi.fn(async () => {});

    vi.spyOn(plugin as any, "promptForJuejinQuickPublishDraft").mockResolvedValue(null);

    await plugin.runQuickPublishForTarget(target.id);

    expect(workflow.runSingle).not.toHaveBeenCalled();
    expect(Notice.instances).toHaveLength(0);
  });
});
