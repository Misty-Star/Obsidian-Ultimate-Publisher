import { describe, expect, it } from "vitest";
import { PublishableNote } from "../src/core/note";
import {
  buildBatchPublishExecutionContext,
  buildBatchPublishWizardState,
  updateBatchCommonDraft,
  updateBatchTargetDraft,
} from "../src/core/batchPublish/state";
import {
  createCsdnTarget,
  createWordpressTarget,
  createYuqueTarget,
  createZhihuTarget,
} from "../src/settings";

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/Batch.md",
    title: "Batch Title",
    markdown: "# Batch Title",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Batch excerpt",
    slug: "batch-title",
    tags: ["obsidian", "batch"],
    categories: ["engineering"],
    ...overrides,
  };
}

describe("batch publish wizard state", () => {
  it("selects all enabled targets and initializes common/provider/execution fields", () => {
    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress", enabled: true };
    const csdn = { ...createCsdnTarget(), id: "csdn", name: "CSDN", enabled: true };
    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", enabled: false };

    const state = buildBatchPublishWizardState(createNote(), [wordpress, csdn, zhihu]);

    expect(Array.from(state.selectedTargetIds).sort()).toEqual(["csdn", "wp"]);
    expect(state.commonDraft).toEqual({
      title: "Batch Title",
      tags: ["obsidian", "batch"],
      excerpt: "Batch excerpt",
    });
    expect(state.remoteOptions.wp).toMatchObject({
      status: "idle",
      data: {},
      manualFallbackFields: [],
    });
    expect(state.remoteOptions.csdn).toMatchObject({
      status: "idle",
      data: {},
      manualFallbackFields: [],
    });
    expect(state.executionState.results).toHaveLength(2);
    expect(state.executionState.results).toEqual([
      {
        targetId: "wp",
        targetName: "WordPress",
        action: "publish",
        status: "waiting",
      },
      {
        targetId: "csdn",
        targetName: "CSDN",
        action: "publish",
        status: "waiting",
      },
    ]);
  });

  it("clones common tags to avoid sharing note tag references", () => {
    const note = createNote();
    const state = buildBatchPublishWizardState(note, [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }]);

    expect(state.commonDraft.tags).toEqual(note.tags);
    expect(state.commonDraft.tags).not.toBe(note.tags);
  });

  it("fans out shared excerpt and tags only to providers with same draft fields", () => {
    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const csdn = { ...createCsdnTarget(), id: "csdn", name: "CSDN" };
    const yuque = { ...createYuqueTarget(), id: "yuque", name: "Yuque" };
    const zhihu = { ...createZhihuTarget(), id: "zhihu", name: "Zhihu", defaultColumnId: "col-1" };

    const initialState = buildBatchPublishWizardState(createNote(), [wordpress, csdn, yuque, zhihu]);
    const beforeYuqueDraft = initialState.targetDrafts.yuque;
    const beforeZhihuDraft = initialState.targetDrafts.zhihu;

    const excerptUpdated = updateBatchCommonDraft(initialState, "excerpt", "Updated excerpt");
    const tagsUpdated = updateBatchCommonDraft(excerptUpdated, "tags", ["release", "notes"]);

    expect(tagsUpdated.commonDraft).toEqual({
      title: "Batch Title",
      excerpt: "Updated excerpt",
      tags: ["release", "notes"],
    });
    expect(tagsUpdated.targetDrafts.wp).toMatchObject({
      provider: "wordpress",
      excerpt: "Updated excerpt",
      tags: ["release", "notes"],
    });
    expect(tagsUpdated.targetDrafts.csdn).toMatchObject({
      provider: "csdn",
      excerpt: "Updated excerpt",
      tags: ["release", "notes"],
    });
    expect(tagsUpdated.targetDrafts.yuque).toEqual(beforeYuqueDraft);
    expect(tagsUpdated.targetDrafts.zhihu).toEqual(beforeZhihuDraft);
  });

  it("builds execution context with common title only and target-specific provider draft", () => {
    const wordpress = { ...createWordpressTarget(), id: "wp", name: "WordPress" };
    const csdn = { ...createCsdnTarget(), id: "csdn", name: "CSDN" };
    const state = updateBatchCommonDraft(
      buildBatchPublishWizardState(createNote({ title: "Original Title" }), [wordpress, csdn]),
      "title",
      "Batch Final Title"
    );

    const context = buildBatchPublishExecutionContext(state, "csdn");

    expect(context.common).toEqual({ title: "Batch Final Title" });
    expect(context.provider).toEqual(state.targetDrafts.csdn);
  });

  it("throws clear error when target draft does not exist", () => {
    const state = buildBatchPublishWizardState(createNote(), [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }]);

    expect(() => buildBatchPublishExecutionContext(state, "missing")).toThrowError(
      "Batch publish target draft not found: missing"
    );
  });

  it("updates target draft via callback updater", () => {
    const state = buildBatchPublishWizardState(createNote(), [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }]);

    const next = updateBatchTargetDraft(state, "wp", (draft) => {
      expect(draft).toMatchObject({
        provider: "wordpress",
        excerpt: "Batch excerpt",
      });
      return {
        ...draft,
        excerpt: "Callback excerpt",
      };
    });

    expect(next.targetDrafts.wp).toMatchObject({
      provider: "wordpress",
      excerpt: "Callback excerpt",
    });
  });

  it("throws clear error when callback updater target does not exist", () => {
    const state = buildBatchPublishWizardState(createNote(), [{ ...createWordpressTarget(), id: "wp", name: "WordPress" }]);

    expect(() =>
      updateBatchTargetDraft(state, "missing", (draft) => ({
        ...draft,
      }))
    ).toThrowError("Batch publish target draft not found: missing");
  });
});
