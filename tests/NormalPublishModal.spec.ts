import { afterEach, describe, expect, it, vi } from "vitest";
import { Notice, TFile, resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { createWordpressTarget } from "../src/settings";
import { NormalPublishModal } from "../src/ui/modals/NormalPublishModal";

function createApp() {
  return {
    setting: {
      open: vi.fn(),
      openTabById: vi.fn(),
    },
  };
}

afterEach(() => {
  resetObsidianTestState();
});

describe("NormalPublishModal", () => {
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

    const modal = new NormalPublishModal(plugin as never, file, workflow as never);
    await (modal as any).handlePublish(target);

    expect(Notice.instances.at(-1)?.message).toBe("Publish succeeded: WordPress published.");
  });
});
