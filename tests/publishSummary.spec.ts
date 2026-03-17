import { describe, expect, it } from "vitest";
import { deriveDashboardSummary, deriveNoteTargetSummaries, summarizeBatchSelection } from "../src/ui/publishSummary";
import { createLocalExportTarget, createWordpressTarget, createYuqueTarget } from "../src/settings";

describe("publishSummary", () => {
  it("sorts recent publish records newest-first and limits the dashboard slice", () => {
    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const yuque = { ...createYuqueTarget(), id: "yuque", name: "Yuque", enabled: false };
    const settings = {
      targets: [wordpress, yuque],
      records: [
        {
          notePath: "Notes/Old.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "1",
          lastPublishedAt: "2026-03-16T00:00:00.000Z",
          contentHash: "a",
        },
        {
          notePath: "Notes/New.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "2",
          lastPublishedAt: "2026-03-17T00:00:00.000Z",
          contentHash: "b",
        },
      ],
    };

    const summary = deriveDashboardSummary(settings, 1);

    expect(summary.configuredCount).toBe(2);
    expect(summary.enabledCount).toBe(1);
    expect(summary.recentRecords).toHaveLength(1);
    expect(summary.recentRecords[0].notePath).toBe("Notes/New.md");
  });

  it("labels note targets as publish or update for the current note snapshot", () => {
    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const local = { ...createLocalExportTarget(), id: "local", name: "Local Export" };
    const settings = {
      targets: [wordpress, local],
      records: [
        {
          notePath: "Notes/Post.md",
          provider: "wordpress",
          targetId: "wp",
          remoteId: "99",
          lastPublishedAt: "2026-03-17T00:00:00.000Z",
          contentHash: "hash",
        },
      ],
    };

    const statuses = deriveNoteTargetSummaries(settings, "Notes/Post.md");

    expect(statuses.map((item) => [item.targetId, item.action])).toEqual([
      ["local", "publish"],
      ["wp", "update"],
    ]);
  });

  it("summarizes batch selection counts for publish and update targets", () => {
    const summary = summarizeBatchSelection(
      [
        { targetId: "wp", action: "update", enabled: true },
        { targetId: "local", action: "publish", enabled: true },
        { targetId: "yuque", action: "publish", enabled: false },
      ],
      ["wp", "local"]
    );

    expect(summary.selectedCount).toBe(2);
    expect(summary.publishCount).toBe(1);
    expect(summary.updateCount).toBe(1);
  });
});
