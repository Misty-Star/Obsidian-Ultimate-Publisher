import { describe, expect, it, vi } from "vitest";
import UltimatePublisherPlugin from "../src/plugin";
import {
  createWordpressTarget,
  DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS,
  DEFAULT_LLM_SETTINGS,
  DEFAULT_SETTINGS,
  EMPTY_PROVIDER_OPTION_CACHE,
  normalizeProviderOptionCache,
} from "../src/settings";

function createApp() {
  return {
    workspace: {
      viewCreators: {},
    },
  };
}

describe("plugin settings loading", () => {
  it("keeps default llm settings object independent from DEFAULT_SETTINGS", () => {
    expect(DEFAULT_SETTINGS.llm).toEqual(DEFAULT_LLM_SETTINGS);
    expect(DEFAULT_SETTINGS.llm).not.toBe(DEFAULT_LLM_SETTINGS);
  });

  it("drops legacy local-export targets and their records while loading saved settings", async () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    vi.spyOn(plugin, "loadData").mockResolvedValue({
      targets: [
        { ...createWordpressTarget(), id: "wp", name: "WordPress" },
        {
          id: "local",
          name: "Local Export",
          enabled: true,
          provider: "local-export",
          outputDir: "/tmp/export",
          yamlType: "default",
          assetDirName: "assets",
        },
      ],
      records: [
        {
          notePath: "Notes/Post.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "123",
          lastPublishedAt: "2026-03-27T00:00:00.000Z",
          contentHash: "hash",
        },
        {
          notePath: "Notes/Post.md",
          provider: "local-export",
          targetId: "local",
          remoteId: "/tmp/export/post.md",
          lastPublishedAt: "2026-03-27T00:00:00.000Z",
          contentHash: "hash-local",
        },
      ],
    });
    const saveData = vi.spyOn(plugin, "saveData").mockResolvedValue();

    await plugin.loadSettings();

    expect(plugin.settings.targets.map((target) => target.id)).toEqual(["wp"]);
    expect(plugin.settings.records.map((record) => record.targetId)).toEqual(["wp"]);
    expect(saveData).toHaveBeenCalledWith(plugin.settings);
  });

  it("fills missing llm settings with defaults and persists the migration", async () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    vi.spyOn(plugin, "loadData").mockResolvedValue({
      targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
      records: [],
    });
    const saveData = vi.spyOn(plugin, "saveData").mockResolvedValue();

    await plugin.loadSettings();

    expect(plugin.settings.llm).toEqual(DEFAULT_LLM_SETTINGS);
    expect(saveData).toHaveBeenCalledWith(
      expect.objectContaining({
        llm: DEFAULT_LLM_SETTINGS,
      })
    );
  });

  it("fills missing frontmatterAutomation/providerOptionCache with defaults and persists the migration", async () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    vi.spyOn(plugin, "loadData").mockResolvedValue({
      targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
      records: [],
      llm: { ...DEFAULT_LLM_SETTINGS },
    });
    const saveData = vi.spyOn(plugin, "saveData").mockResolvedValue();

    await plugin.loadSettings();

    expect(plugin.settings.frontmatterAutomation).toEqual(DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS);
    expect(plugin.settings.providerOptionCache).toEqual(EMPTY_PROVIDER_OPTION_CACHE);
    expect(saveData).toHaveBeenCalledWith(
      expect.objectContaining({
        frontmatterAutomation: DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS,
        providerOptionCache: EMPTY_PROVIDER_OPTION_CACHE,
      })
    );
  });

  it("updates llm settings without touching targets or records", async () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
      records: [
        {
          notePath: "Notes/Post.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "123",
          lastPublishedAt: "2026-04-02T00:00:00.000Z",
          contentHash: "hash",
        },
      ],
    };
    const saveSettings = vi.spyOn(plugin, "saveSettings").mockResolvedValue();

    await plugin.updateLlmSettings((draft) => {
      draft.enabled = true;
      draft.vendor = "gemini";
      draft.model = "gemini-2.5-flash";
      draft.apiKey = "secret";
    });

    expect(plugin.settings.targets.map((target) => target.id)).toEqual(["wp"]);
    expect(plugin.settings.records.map((record) => record.remoteId)).toEqual(["123"]);
    expect(plugin.settings.llm).toMatchObject({
      enabled: true,
      vendor: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "secret",
    });
    expect(saveSettings).toHaveBeenCalled();
  });

  it("updates frontmatter automation settings without touching targets/records/llm", async () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
      records: [
        {
          notePath: "Notes/Post.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "123",
          lastPublishedAt: "2026-04-02T00:00:00.000Z",
          contentHash: "hash",
        },
      ],
      llm: {
        ...DEFAULT_LLM_SETTINGS,
        enabled: true,
        vendor: "openai-compatible",
        model: "gpt-4.1-mini",
        apiKey: "secret",
      },
    };
    const saveSettings = vi.spyOn(plugin, "saveSettings").mockResolvedValue();

    await plugin.updateFrontmatterAutomationSettings((draft) => {
      draft.enabled = false;
      draft.includeOptionComments = false;
    });

    expect(plugin.settings.targets.map((target) => target.id)).toEqual(["wp"]);
    expect(plugin.settings.records.map((record) => record.remoteId)).toEqual(["123"]);
    expect(plugin.settings.llm).toMatchObject({
      enabled: true,
      vendor: "openai-compatible",
      model: "gpt-4.1-mini",
      apiKey: "secret",
    });
    expect(plugin.settings.frontmatterAutomation).toEqual({
      enabled: false,
      includeOptionComments: false,
    });
    expect(saveSettings).toHaveBeenCalled();
  });

  it("updates provider option cache without touching targets/records/llm", async () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }],
      records: [
        {
          notePath: "Notes/Post.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "123",
          lastPublishedAt: "2026-04-02T00:00:00.000Z",
          contentHash: "hash",
        },
      ],
      llm: {
        ...DEFAULT_LLM_SETTINGS,
        enabled: true,
        vendor: "anthropic",
        model: "claude-sonnet-4-5",
        apiKey: "secret",
      },
      providerOptionCache: { juejinByTargetId: {} },
    };
    const saveSettings = vi.spyOn(plugin, "saveSettings").mockResolvedValue();

    await plugin.updateProviderOptionCache((cache) => {
      cache.juejinByTargetId.wp = {
        fetchedAt: "2026-04-08T00:00:00.000Z",
        categories: [{ id: "cat-1", label: "Tech" }],
        tags: [{ id: "tag-1", label: "TypeScript" }],
      };
    });

    expect(plugin.settings.targets.map((target) => target.id)).toEqual(["wp"]);
    expect(plugin.settings.records.map((record) => record.remoteId)).toEqual(["123"]);
    expect(plugin.settings.llm).toMatchObject({
      enabled: true,
      vendor: "anthropic",
      model: "claude-sonnet-4-5",
      apiKey: "secret",
    });
    expect(plugin.settings.providerOptionCache).toEqual({
      juejinByTargetId: {
        wp: {
          fetchedAt: "2026-04-08T00:00:00.000Z",
          categories: [{ id: "cat-1", label: "Tech" }],
          tags: [{ id: "tag-1", label: "TypeScript" }],
        },
      },
    });
    expect(saveSettings).toHaveBeenCalled();
  });

  it("removeTarget clears matching provider option cache entry", async () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      targets: [
        { ...createWordpressTarget(), id: "wp", name: "WordPress" },
        { ...createWordpressTarget(), id: "wp2", name: "WordPress 2" },
      ],
      records: [
        {
          notePath: "Notes/Post.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "123",
          lastPublishedAt: "2026-04-02T00:00:00.000Z",
          contentHash: "hash",
        },
      ],
      providerOptionCache: {
        juejinByTargetId: {
          wp: {
            fetchedAt: "2026-04-08T00:00:00.000Z",
            categories: [{ id: "cat-1", label: "Tech" }],
            tags: [{ id: "tag-1", label: "TypeScript" }],
          },
          wp2: {
            fetchedAt: "2026-04-08T00:00:00.000Z",
            categories: [{ id: "cat-2", label: "Life" }],
            tags: [{ id: "tag-2", label: "Note" }],
          },
        },
      },
    };
    const saveSettings = vi.spyOn(plugin, "saveSettings").mockResolvedValue();

    await plugin.removeTarget("wp");

    expect(plugin.settings.targets.map((target) => target.id)).toEqual(["wp2"]);
    expect(plugin.settings.records).toHaveLength(0);
    expect(plugin.settings.providerOptionCache).toEqual({
      juejinByTargetId: {
        wp2: {
          fetchedAt: "2026-04-08T00:00:00.000Z",
          categories: [{ id: "cat-2", label: "Life" }],
          tags: [{ id: "tag-2", label: "Note" }],
        },
      },
    });
    expect(saveSettings).toHaveBeenCalled();
  });

  it("normalizeProviderOptionCache drops invalid entries and keeps valid entries", () => {
    const normalized = normalizeProviderOptionCache({
      juejinByTargetId: {
        good: {
          fetchedAt: "2026-04-08T00:00:00.000Z",
          categories: [
            { id: "cat-1", label: "Tech" },
            { id: 123 as never, label: "Bad" } as never,
          ],
          tags: [{ id: "tag-1", label: "TypeScript", description: "desc" }],
        },
        bad: {
          fetchedAt: 123,
          categories: [{ id: "x", label: "x" }],
          tags: [{ id: "y", label: "y" }],
        } as never,
      },
    } as never);

    expect(normalized).toEqual({
      juejinByTargetId: {
        good: {
          fetchedAt: "2026-04-08T00:00:00.000Z",
          categories: [{ id: "cat-1", label: "Tech" }],
          tags: [{ id: "tag-1", label: "TypeScript", description: "desc" }],
        },
      },
    });
  });
});
