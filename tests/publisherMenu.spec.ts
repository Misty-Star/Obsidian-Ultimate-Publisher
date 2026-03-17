import { describe, expect, it } from "vitest";
import { buildPublisherMenuModel } from "../src/ui/publisherMenu";

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
});
