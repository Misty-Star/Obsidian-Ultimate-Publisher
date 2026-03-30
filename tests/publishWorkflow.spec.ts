import { describe, expect, it, vi } from "vitest";
import { NormalPublishExecutionContext } from "../src/core/normalPublish/types";
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
    const normalPublishContext: NormalPublishExecutionContext = {
      common: {
        title: "Override",
      },
      provider: {
        provider: "wordpress",
        slug: "custom-post",
        excerpt: "Custom excerpt",
        tags: ["Obsidian"],
        categories: ["Notes"],
        status: "publish",
        password: "secret",
      },
    };

    const workflow = new PublishWorkflow(publishService as never);
    const result = await workflow.runSingle(
      file as never,
      target as never,
      { targets: [target], records: [record] } as never,
      normalPublishContext
    );

    expect(result.action).toBe("update");
    expect(result.settings.records).toHaveLength(1);
    expect(publishService.publishFile).toHaveBeenCalledWith(
      file,
      target,
      { targets: [target], records: [record] },
      normalPublishContext
    );
  });

  it("runs batch targets sequentially and keeps later targets running after a failure", async () => {
    const file = { path: "Notes/Post.md", basename: "Post" };
    const wp = { id: "wp", name: "WordPress", provider: "wordpress", enabled: true };
    const zhihu = { id: "zh", name: "Zhihu", provider: "zhihu", enabled: true };
    const publishService = {
      publishFile: vi
        .fn()
        .mockRejectedValueOnce(new Error("bad target config"))
        .mockResolvedValueOnce({
          record: {
            notePath: "Notes/Post.md",
            provider: "zhihu",
            targetId: "zh",
            remoteId: "draft-1",
            lastPublishedAt: "2026-03-17T00:00:00.000Z",
            contentHash: "hash",
          },
          created: true,
        }),
      updateSettings: vi.fn((settings, nextRecord) => ({ ...settings, records: [...settings.records, nextRecord] })),
    };

    const workflow = new PublishWorkflow(publishService as never);
    const result = await workflow.runBatch(file as never, [wp, zhihu] as never, {
      targets: [wp, zhihu],
      records: [],
    } as never);

    expect(result.results.map((item) => [item.targetId, item.status])).toEqual([
      ["wp", "failure"],
      ["zh", "success"],
    ]);
    expect(result.settings.records).toHaveLength(1);
  });

  it("returns batch results that can be counted directly for summary output", async () => {
    const file = { path: "Notes/Post.md", basename: "Post" };
    const wp = { id: "wp", name: "WordPress", provider: "wordpress", enabled: true };
    const zhihu = { id: "zh", name: "Zhihu", provider: "zhihu", enabled: true };
    const publishService = {
      publishFile: vi
        .fn()
        .mockResolvedValueOnce({
          record: {
            notePath: "Notes/Post.md",
            provider: "wordpress",
            targetId: "wp",
            remoteId: "1",
            lastPublishedAt: "2026-03-17T00:00:00.000Z",
            contentHash: "a",
          },
          created: false,
        })
        .mockRejectedValueOnce(new Error("permission denied")),
      updateSettings: vi.fn((settings, nextRecord) => ({ ...settings, records: [...settings.records, nextRecord] })),
    };

    const workflow = new PublishWorkflow(publishService as never);
    const result = await workflow.runBatch(file as never, [wp, zhihu] as never, {
      targets: [wp, zhihu],
      records: [],
    } as never);

    expect(result.results.filter((item) => item.status === "success")).toHaveLength(1);
    expect(result.results.filter((item) => item.status === "failure")).toHaveLength(1);
  });

  it("forwards a target-specific execution context and emits ordered progress events", async () => {
    const file = { path: "Notes/Post.md", basename: "Post" };
    const wp = { id: "wp", name: "WordPress", provider: "wordpress", enabled: true };
    const zhihu = { id: "zh", name: "Zhihu", provider: "zhihu", enabled: true };
    const wpContext: NormalPublishExecutionContext = {
      common: {
        title: "WP Title",
      },
      provider: {
        provider: "wordpress",
        tags: ["TagA"],
      },
    };
    const zhContext: NormalPublishExecutionContext = {
      common: {
        title: "ZH Title",
      },
      provider: {
        provider: "zhihu",
        topics: ["TopicA"],
      },
    };
    const progressEvents: Array<{ targetId: string; status: string }> = [];
    const publishService = {
      publishFile: vi
        .fn()
        .mockResolvedValueOnce({
          record: {
            notePath: "Notes/Post.md",
            provider: "wordpress",
            targetId: "wp",
            remoteId: "wp-1",
            lastPublishedAt: "2026-03-17T00:00:00.000Z",
            contentHash: "a",
          },
          created: true,
        })
        .mockResolvedValueOnce({
          record: {
            notePath: "Notes/Post.md",
            provider: "zhihu",
            targetId: "zh",
            remoteId: "zh-1",
            lastPublishedAt: "2026-03-17T00:00:00.000Z",
            contentHash: "b",
          },
          created: true,
        }),
      updateSettings: vi.fn((settings, nextRecord) => ({ ...settings, records: [...settings.records, nextRecord] })),
    };

    const workflow = new PublishWorkflow(publishService as never);
    await workflow.runBatch(
      file as never,
      [wp, zhihu] as never,
      {
        targets: [wp, zhihu],
        records: [],
      } as never,
      {
        contextByTargetId: {
          wp: wpContext,
          zh: zhContext,
        },
        onProgress: async (event) => {
          progressEvents.push({ targetId: event.targetId, status: event.status });
        },
      }
    );

    expect(publishService.publishFile).toHaveBeenNthCalledWith(
      1,
      file,
      wp,
      {
        targets: [wp, zhihu],
        records: [],
      },
      wpContext
    );
    expect(progressEvents).toEqual([
      { targetId: "wp", status: "running" },
      { targetId: "wp", status: "success" },
      { targetId: "zh", status: "running" },
      { targetId: "zh", status: "success" },
    ]);
  });

  it("records failures with duration and still publishes later targets", async () => {
    const file = { path: "Notes/Post.md", basename: "Post" };
    const wp = { id: "wp", name: "WordPress", provider: "wordpress", enabled: true };
    const zhihu = { id: "zh", name: "Zhihu", provider: "zhihu", enabled: true };
    const publishService = {
      publishFile: vi
        .fn()
        .mockRejectedValueOnce(new Error("bad target config"))
        .mockResolvedValueOnce({
          record: {
            notePath: "Notes/Post.md",
            provider: "zhihu",
            targetId: "zh",
            remoteId: "zh-1",
            lastPublishedAt: "2026-03-17T00:00:00.000Z",
            contentHash: "hash",
          },
          created: true,
        }),
      updateSettings: vi.fn((settings, nextRecord) => ({ ...settings, records: [...settings.records, nextRecord] })),
    };

    const workflow = new PublishWorkflow(publishService as never);
    const result = await workflow.runBatch(file as never, [wp, zhihu] as never, {
      targets: [wp, zhihu],
      records: [],
    } as never);

    expect(result.results[0]).toMatchObject({
      targetId: "wp",
      status: "failure",
      durationMs: expect.any(Number),
    });
    expect(result.results[1]).toMatchObject({
      targetId: "zh",
      status: "success",
      durationMs: expect.any(Number),
    });
    expect(publishService.publishFile).toHaveBeenCalledTimes(2);
  });
});
