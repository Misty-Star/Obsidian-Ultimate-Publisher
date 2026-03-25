import { describe, expect, it, vi } from "vitest";
import UltimatePublisherPlugin from "../src/plugin";

const { mountSettingsView } = vi.hoisted(() => ({
  mountSettingsView: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

vi.mock("../src/ui/settings/renderSettingsRoot", () => ({
  mountSettingsView,
}));

import { UltimatePublisherSettingTab } from "../src/ui/UltimatePublisherSettingTab";

function createApp() {
  return {
    workspace: {
      viewCreators: {},
    },
  };
}

describe("UltimatePublisherSettingTab", () => {
  it("mounts the React settings view when displayed", () => {
    const plugin = new UltimatePublisherPlugin(createApp() as never, { id: "ultimate-publisher" } as never);
    plugin.settings = {
      targets: [],
      records: [],
    };

    const tab = new UltimatePublisherSettingTab(plugin);
    tab.display();

    expect(mountSettingsView).toHaveBeenCalledTimes(1);
    expect(mountSettingsView).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        plugin,
        settings: plugin.settings,
        requestRefresh: expect.any(Function),
      })
    );
  });
});
