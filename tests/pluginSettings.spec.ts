import { describe, expect, it, vi } from "vitest";
import UltimatePublisherPlugin from "../src/plugin";
import { createWordpressTarget, DEFAULT_LLM_SETTINGS, DEFAULT_SETTINGS } from "../src/settings";

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
});
