import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureRemoteOptionsLoaded } from "../src/core/normalPublish/remoteOptions";
import { buildNormalPublishSessionState } from "../src/core/normalPublish/drafts";
import { PublishableNote } from "../src/core/note";
import * as providerDefinitions from "../src/providers/definitions";
import { createCsdnTarget, createZhihuTarget } from "../src/settings";

function createNote(overrides: Partial<PublishableNote> = {}): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "# Post",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Excerpt",
    slug: "post",
    tags: [],
    categories: [],
    ...overrides,
  };
}

describe("normal publish remote options", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates remote-options decisions to provider definitions", async () => {
    const definitionSpy = vi.spyOn(providerDefinitions, "getProviderDefinition");
    const target = {
      ...createZhihuTarget(),
      id: "zhihu-target",
    };
    const registry = {
      get: vi.fn(),
    };

    const initialState = buildNormalPublishSessionState(createNote(), [target]);
    await ensureRemoteOptionsLoaded(initialState, target, registry as never);

    expect(definitionSpy).toHaveBeenCalledWith("zhihu");
    expect(registry.get).not.toHaveBeenCalled();
  });

  it("skips zhihu remote options because normal publish no longer exposes a zhihu-specific field", async () => {
    const target = {
      ...createZhihuTarget(),
      id: "zhihu-target",
    };
    const provider = {
      loadNormalPublishOptions: vi.fn().mockResolvedValue({
        zhihuColumns: [
          {
            id: "column-1",
            label: "Demo Column",
            description: "https://zhuanlan.zhihu.com/c/demo",
          },
        ],
      }),
    };
    const registry = {
      get: vi.fn().mockReturnValue(provider),
    };

    const initialState = buildNormalPublishSessionState(createNote(), [target]);
    const nextState = await ensureRemoteOptionsLoaded(initialState, target, registry as never);
    const cachedState = await ensureRemoteOptionsLoaded(nextState, target, registry as never);

    expect(provider.loadNormalPublishOptions).not.toHaveBeenCalled();
    expect(cachedState.remoteOptions[target.id]).toMatchObject({
      status: "loaded",
      data: {},
      manualFallbackFields: [],
    });
  });

  it("marks manual fallback fields when remote loading fails", async () => {
    const target = {
      ...createCsdnTarget(),
      id: "csdn-target",
    };
    const provider = {
      loadNormalPublishOptions: vi.fn().mockRejectedValue(new Error("network error")),
    };
    const registry = {
      get: vi.fn().mockReturnValue(provider),
    };

    const initialState = buildNormalPublishSessionState(createNote(), [target]);
    const nextState = await ensureRemoteOptionsLoaded(initialState, target, registry as never);

    expect(nextState.remoteOptions[target.id]).toMatchObject({
      status: "error",
      errorMessage: "network error",
      manualFallbackFields: ["categories", "tags"],
    });
  });
});
