import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { App, normalizePath } from "obsidian";
import { PublishableNote, ResolvedAsset, sanitizeFileName } from "../core/note";
import { MediaSupport, MediaUploadResult, PublishResult, PublisherProvider } from "../core/providers";
import { buildExportFrontmatter, serializeFrontmatter } from "../core/yaml";
import { LocalExportTargetConfig } from "../types";

export class LocalExportProvider implements PublisherProvider<LocalExportTargetConfig> {
  readonly provider = "local-export" as const;

  constructor(private readonly app: App) {}

  getMediaSupport(_target: LocalExportTargetConfig): MediaSupport {
    return { mode: "local-copy" };
  }

  async validateConfig(target: LocalExportTargetConfig): Promise<void> {
    if (!target.outputDir) {
      throw new Error("Local export target is missing outputDir.");
    }
    await mkdir(target.outputDir, { recursive: true });
  }

  async publish(note: PublishableNote, target: LocalExportTargetConfig): Promise<PublishResult> {
    return this.writeExport(undefined, note, target);
  }

  async update(remoteId: string, note: PublishableNote, target: LocalExportTargetConfig): Promise<PublishResult> {
    return this.writeExport(remoteId, note, target);
  }

  async delete(remoteId: string): Promise<void> {
    void remoteId;
  }

  async getPreviewUrl(remoteId: string): Promise<string | undefined> {
    return remoteId;
  }

  private async writeExport(remoteId: string | undefined, note: PublishableNote, target: LocalExportTargetConfig): Promise<PublishResult> {
    const slug = sanitizeFileName(note.slug || note.title, "note");
    const outputPath = remoteId || join(target.outputDir, `${slug}.md`);
    await mkdir(target.outputDir, { recursive: true });

    const frontmatter = buildExportFrontmatter(
      {
        title: note.title,
        slug: note.slug,
        excerpt: note.excerpt,
        tags: note.tags,
        categories: note.categories,
        date: note.date,
        extra: note.frontmatter,
      },
      target.yamlType
    );
    const content = `${serializeFrontmatter(frontmatter)}\n\n${note.markdown.trim()}\n`;
    await writeFile(outputPath, content, "utf8");

    return {
      remoteId: outputPath,
      remoteUrl: outputPath,
    };
  }

  async copyAsset(
    asset: ResolvedAsset,
    note: PublishableNote,
    target: LocalExportTargetConfig
  ): Promise<MediaUploadResult> {
    const sourceData = await this.app.vault.adapter.readBinary(normalizePath(asset.sourcePath));
    const slug = sanitizeFileName(note.slug || note.title, "note");
    const assetDir = join(target.outputDir, target.assetDirName || "assets");
    await mkdir(assetDir, { recursive: true });
    const extension = extname(asset.fileName);
    const baseName = extension ? asset.fileName.slice(0, -extension.length) : asset.fileName;
    const assetName = `${slug}-${sanitizeFileName(baseName, "asset")}${extension}`;
    const destination = join(assetDir, assetName);
    await writeFile(destination, Buffer.from(sourceData));
    const relativeDir = target.assetDirName || "assets";
    return {
      url: `./${relativeDir}/${assetName}`,
    };
  }
}
