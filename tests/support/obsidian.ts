import { vi } from "vitest";

export interface CachedMetadata {
  frontmatter?: Record<string, unknown>;
}

export interface App {
  vault: {
    cachedRead(path: unknown): Promise<string>;
    adapter?: {
      readBinary(path: string): Promise<ArrayBuffer | Uint8Array | Buffer>;
    };
  };
  metadataCache: {
    getFileCache(file: unknown): CachedMetadata | null;
    getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;
  };
}

export class TFile {
  path = "";
  name = "";
  basename = "";
  extension = "";
}

export class Notice {
  constructor(
    public readonly message: string,
    public readonly timeout?: number
  ) {}
}

export class Component {
  load(): void {}

  unload(): void {}
}

export const MarkdownRenderer = {
  render: vi.fn(async (_app: unknown, markdown: string, container: { innerHTML: string }) => {
    container.innerHTML = markdown;
  }),
};

export const requestUrl = vi.fn(async () => {
  throw new Error("requestUrl mock not configured");
});

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}
