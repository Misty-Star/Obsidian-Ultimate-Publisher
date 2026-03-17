import { WorkspaceLeaf, FakeElement } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { deriveDashboardSummary, deriveNoteTargetSummaries, summarizeBatchSelection } from "../src/ui/publishSummary";
import { createLocalExportTarget, createWordpressTarget, createYuqueTarget } from "../src/settings";
import { PublisherDashboardView } from "../src/ui/views/PublisherDashboardView";

function collectText(element: FakeElement): string[] {
  const texts = element.textContent ? [element.textContent] : [];
  for (const child of element.children) {
    texts.push(...collectText(child));
  }
  return texts;
}

function findButton(element: FakeElement, text: string): FakeElement {
  const queue = [element];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    if (current.tagName === "button" && current.textContent === text) {
      return current;
    }
    queue.push(...current.children);
  }
  throw new Error(`Button not found: ${text}`);
}

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

  it("orders note-target summaries with enabled targets first and name order for modal defaults", () => {
    const statuses = deriveNoteTargetSummaries(
      {
        targets: [
          { id: "yuque", name: "Yuque", provider: "yuque", enabled: false },
          { id: "wp", name: "WordPress", provider: "wordpress", enabled: true },
          { id: "local", name: "Local Export", provider: "local-export", enabled: true },
        ],
        records: [],
      } as never,
      "Notes/Post.md"
    );

    expect(statuses.map((item) => item.targetId)).toEqual(["local", "wp", "yuque"]);
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

  it("renders the dashboard view with summary cards, lists, and shortcut buttons", async () => {
    const plugin = {
      settings: {
        targets: [
          { ...createWordpressTarget(), id: "wp", name: "WordPress" },
          { ...createLocalExportTarget(), id: "local", name: "Local Export", enabled: false },
        ],
        records: [
          {
            notePath: "Notes/Latest.md",
            provider: "wordpress",
            targetId: "wp",
            remoteId: "11",
            remoteUrl: "https://example.com/latest",
            lastPublishedAt: "2026-03-17T10:00:00.000Z",
            contentHash: "hash-latest",
          },
          {
            notePath: "Notes/Older.md",
            provider: "wordpress",
            targetId: "wp",
            remoteId: "10",
            lastPublishedAt: "2026-03-16T08:00:00.000Z",
            contentHash: "hash-older",
          },
        ],
      },
      openNormalPublishForActiveNote: vi.fn(),
      openBatchPublishForActiveNote: vi.fn(),
      openPublishSettings: vi.fn(),
    };

    const view = new PublisherDashboardView(new WorkspaceLeaf(), plugin as never);
    await view.onOpen();

    const renderedText = collectText(view.contentEl).join(" ");
    expect(renderedText).toContain("Configured Targets");
    expect(renderedText).toContain("Enabled Targets");
    expect(renderedText).toContain("Last Publish");
    expect(renderedText).toContain("Target Status");
    expect(renderedText).toContain("Recent Records");
    expect(renderedText).toContain("WordPress");
    expect(renderedText).toContain("Notes/Latest.md");

    findButton(view.contentEl, "Normal Publish").click();
    findButton(view.contentEl, "Batch Publish").click();
    findButton(view.contentEl, "Publish Settings").click();

    expect(plugin.openNormalPublishForActiveNote).toHaveBeenCalledTimes(1);
    expect(plugin.openBatchPublishForActiveNote).toHaveBeenCalledTimes(1);
    expect(plugin.openPublishSettings).toHaveBeenCalledTimes(1);
  });
});
