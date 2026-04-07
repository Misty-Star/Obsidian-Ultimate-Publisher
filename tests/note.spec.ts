import { App, TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { stripFrontmatter } from "../src/core/content";
import { extractPublishableNote } from "../src/core/note";

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

function createApp(
  markdown: string,
  resolvedFiles: Record<string, TFile> = {},
  frontmatter: Record<string, unknown> = {}
): App {
  return {
    vault: {
      cachedRead: vi.fn().mockResolvedValue(markdown),
    },
    metadataCache: {
      getFileCache: vi.fn().mockReturnValue({ frontmatter }),
      getFirstLinkpathDest: vi.fn((target: string) => resolvedFiles[target] ?? null),
    },
  } as unknown as App;
}

describe("stripFrontmatter", () => {
  it("removes a leading frontmatter block from publish content", () => {
    const input = [
      "---",
      'title: "Hello"',
      "tags:",
      "  - test",
      "---",
      "",
      "# Heading",
      "",
      "Body",
    ].join("\n");

    expect(stripFrontmatter(input)).toBe("# Heading\n\nBody");
  });

  it("leaves markdown without frontmatter unchanged", () => {
    expect(stripFrontmatter("# Heading\n\nBody")).toBe("# Heading\n\nBody");
  });
});

describe("extractPublishableNote", () => {
  it("prefers frontmatter title over the first level-one heading", async () => {
    const app = createApp("Intro line\n\n# Actual Title\n\nBody", {}, { title: "Frontmatter Title" });
    const file = createFile("Notes/Post.md");

    const note = await extractPublishableNote(app, file);

    expect(note.title).toBe("Frontmatter Title");
  });

  it("uses the first level-one heading when frontmatter title is absent", async () => {
    const app = createApp("Intro line\n\n# Actual Title\n\nBody");
    const file = createFile("Notes/Post.md");

    const note = await extractPublishableNote(app, file);

    expect(note.title).toBe("Actual Title");
  });

  it("falls back to the file basename when frontmatter title and level-one heading are both absent", async () => {
    const app = createApp("\n\nFirst line title\n\n## Section\n\nBody");
    const file = createFile("Notes/Fallback Name.md");

    const note = await extractPublishableNote(app, file);

    expect(note.title).toBe("Fallback Name");
  });

  it("falls back to the file basename when the note has no usable title text", async () => {
    const app = createApp("   \n\n\t");
    const file = createFile("Notes/Fallback Name.md");

    const note = await extractPublishableNote(app, file);

    expect(note.title).toBe("Fallback Name");
  });

  it("keeps resolved local image assets and records unresolved ones", async () => {
    const app = createApp("![[assets/cover.png|Cover]]\n![[assets/missing.png]]", {
      "assets/cover.png": createFile("assets/cover.png"),
    });
    const file = createFile("Notes/Post.md");

    const note = await extractPublishableNote(app, file);

    expect(note.attachments).toEqual([
      expect.objectContaining({
        sourcePath: "assets/cover.png",
        fileName: "cover.png",
      }),
    ]);
    expect(note.unresolvedAttachments).toEqual([
      expect.objectContaining({
        reason: "missing",
        reference: expect.objectContaining({
          rawTarget: "assets/missing.png",
        }),
      }),
    ]);
  });

  it("marks non-image embeds as unsupported attachments", async () => {
    const app = createApp("![[assets/reference.pdf]]", {
      "assets/reference.pdf": createFile("assets/reference.pdf"),
    });
    const file = createFile("Notes/Post.md");

    const note = await extractPublishableNote(app, file);

    expect(note.attachments).toEqual([]);
    expect(note.unresolvedAttachments).toEqual([
      expect.objectContaining({
        reason: "unsupported-type",
        reference: expect.objectContaining({
          rawTarget: "assets/reference.pdf",
        }),
      }),
    ]);
  });
});
