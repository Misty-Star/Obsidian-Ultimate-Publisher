import { describe, expect, it, vi } from "vitest";
import UltimatePublisherPlugin from "../src/plugin";
import { createWordpressTarget } from "../src/settings";

function createApp() {
  return {
    workspace: {
      viewCreators: {},
    },
  };
}

describe("plugin settings loading", () => {
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
});
