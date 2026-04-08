import { TFile } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableNote } from "../src/core/note";
import { NormalPublishExecutionContext } from "../src/core/normalPublish/types";
import { PublishService } from "../src/core/publishService";
import { ProviderOptionCache, UltimatePublisherSettings, WordpressTargetConfig } from "../src/types";

const { extractPublishableNoteMock } = vi.hoisted(() => ({
  extractPublishableNoteMock: vi.fn<() => Promise<PublishableNote>>(),
}));

vi.mock("../src/core/note", async () => {
  const actual = await vi.importActual<typeof import("../src/core/note")>("../src/core/note");
  return {
    ...actual,
    extractPublishableNote: extractPublishableNoteMock,
  };
});

function createFile(path: string): TFile {
  const normalizedPath = path.replace(/\\/g, "/");
  const name = normalizedPath.split("/").pop() ?? normalizedPath;
  const extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
  const basename = extension ? name.slice(0, -(extension.length + 1)) : name;
  const file = Object.create(TFile.prototype) as TFile & {
    path: string;
    name: string;
    basename: string;
    extension: string;
  };

  file.path = normalizedPath;
  file.name = name;
  file.basename = basename;
  file.extension = extension;
  return file;
}

function createTarget(): WordpressTargetConfig {
  return {
    id: "wordpress-target",
    name: "WordPress",
    enabled: true,
    provider: "wordpress",
    endpoint: "https://wp.example",
    username: "demo",
    appPassword: "secret",
    defaultStatus: "draft",
    contentFormat: "html",
  };
}

function createSettings(): UltimatePublisherSettings {
  return {
    targets: [],
    records: [],
    providerOptionCache: {
      juejinByTargetId: {},
    },
  };
}

function createNote(markdown: string): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown,
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Excerpt",
    slug: "post",
    tags: [],
    categories: [],
  };
}

describe("PublishService", () => {
  beforeEach(() => {
    extractPublishableNoteMock.mockReset();
  });

  it("runs the media pipeline before publishing a new post", async () => {
    const extractedNote = createNote("![[assets/cover.png|Cover]]");
    const preparedNote = createNote("![Cover](https://cdn.example.com/cover.png)");
    extractPublishableNoteMock.mockResolvedValue(extractedNote);

    const provider = {
      provider: "wordpress" as const,
      validateConfig: vi.fn().mockResolvedValue(undefined),
      getMediaSupport: vi.fn().mockReturnValue({ mode: "native-upload" as const }),
      loadNormalPublishOptions: vi.fn().mockResolvedValue({}),
      publish: vi.fn().mockResolvedValue({ remoteId: "7", remoteUrl: "https://wp.example/post" }),
      update: vi.fn(),
      delete: vi.fn(),
      getPreviewUrl: vi.fn(),
    };
    const providers = {
      get: vi.fn().mockReturnValue(provider),
    };
    const mediaPipeline = {
      prepare: vi.fn().mockResolvedValue(preparedNote),
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

    const service = new PublishService({} as never, providers as never, mediaPipeline as never);
    const result = await service.publishFile(
      createFile("Notes/Post.md"),
      createTarget(),
      createSettings(),
      normalPublishContext
    );

    expect(providers.get).toHaveBeenCalledWith(createTarget());
    expect(provider.validateConfig).toHaveBeenCalledWith(createTarget());
    expect(extractPublishableNoteMock).toHaveBeenCalled();
    expect(mediaPipeline.prepare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Override",
      }),
      createTarget(),
      provider
    );
    expect(provider.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Override",
      }),
      createTarget(),
      normalPublishContext,
      expect.objectContaining({
        providerOptionCache: {
          juejinByTargetId: {},
        },
        loadNormalPublishOptions: expect.any(Function),
      })
    );
    expect(result.created).toBe(true);
    expect(provider.validateConfig.mock.invocationCallOrder[0]).toBeLessThan(mediaPipeline.prepare.mock.invocationCallOrder[0]);
    expect(mediaPipeline.prepare.mock.invocationCallOrder[0]).toBeLessThan(provider.publish.mock.invocationCallOrder[0]);
  });

  it("merges provider option cache returned by provider into updated settings", () => {
    const originalCache: ProviderOptionCache = {
      juejinByTargetId: {
        existing: {
          fetchedAt: "2026-04-08T00:00:00.000Z",
          categories: [{ id: "existing-category", label: "已有分类" }],
          tags: [{ id: "existing-tag", label: "已有标签" }],
        },
      },
    };
    const returnedCache: ProviderOptionCache = {
      juejinByTargetId: {
        existing: {
          fetchedAt: "2026-04-09T00:00:00.000Z",
          categories: [{ id: "fresh-category", label: "最新分类" }],
          tags: [{ id: "fresh-tag", label: "最新标签" }],
        },
        another: {
          fetchedAt: "2026-04-09T01:00:00.000Z",
          categories: [{ id: "another-category", label: "新增分类" }],
          tags: [{ id: "another-tag", label: "新增标签" }],
        },
      },
    };
    const service = new PublishService({} as never, { get: vi.fn() } as never);

    const nextSettings = service.updateSettings(
      {
        ...createSettings(),
        providerOptionCache: originalCache,
      },
      {
        notePath: "Notes/Post.md",
        provider: "wordpress",
        targetId: "wordpress-target",
        remoteId: "7",
        remoteUrl: "https://wp.example/post",
        lastPublishedAt: "2026-04-09T02:00:00.000Z",
        contentHash: "hash",
      },
      returnedCache
    );

    expect(nextSettings.providerOptionCache).toEqual(returnedCache);
  });
});
