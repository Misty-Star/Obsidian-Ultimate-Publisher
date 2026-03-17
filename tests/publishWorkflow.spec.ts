import { describe, expect, it, vi } from "vitest";
import { PublishWorkflow } from "../src/core/publishWorkflow";

describe("PublishWorkflow", () => {
  it("runs a single publish and reports update when a record already exists", async () => {
    const target = { id: "wp", name: "WordPress", provider: "wordpress", enabled: true };
    const file = { path: "Notes/Post.md", basename: "Post" };
    const record = {
      notePath: "Notes/Post.md",
      provider: "wordpress",
      targetId: "wp",
      remoteId: "123",
      lastPublishedAt: "2026-03-17T00:00:00.000Z",
      contentHash: "hash",
    };
    const publishService = {
      publishFile: vi.fn().mockResolvedValue({ record, created: false }),
      updateSettings: vi.fn((settings, nextRecord) => ({ ...settings, records: [nextRecord] })),
    };

    const workflow = new PublishWorkflow(publishService as never);
    const result = await workflow.runSingle(file as never, target as never, { targets: [target], records: [record] } as never);

    expect(result.action).toBe("update");
    expect(result.settings.records).toHaveLength(1);
  });

  it("runs batch targets sequentially and keeps later targets running after a failure", async () => {
    const file = { path: "Notes/Post.md", basename: "Post" };
    const wp = { id: "wp", name: "WordPress", provider: "wordpress", enabled: true };
    const local = { id: "local", name: "Local Export", provider: "local-export", enabled: true };
    const publishService = {
      publishFile: vi
        .fn()
        .mockRejectedValueOnce(new Error("bad target config"))
        .mockResolvedValueOnce({
          record: {
            notePath: "Notes/Post.md",
            provider: "local-export",
            targetId: "local",
            remoteId: "file.md",
            lastPublishedAt: "2026-03-17T00:00:00.000Z",
            contentHash: "hash",
          },
          created: true,
        }),
      updateSettings: vi.fn((settings, nextRecord) => ({ ...settings, records: [...settings.records, nextRecord] })),
    };

    const workflow = new PublishWorkflow(publishService as never);
    const result = await workflow.runBatch(file as never, [wp, local] as never, { targets: [wp, local], records: [] } as never);

    expect(result.results.map((item) => [item.targetId, item.status])).toEqual([
      ["wp", "failure"],
      ["local", "success"],
    ]);
    expect(result.settings.records).toHaveLength(1);
  });
});
