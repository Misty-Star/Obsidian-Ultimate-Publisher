import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { App, normalizePath } from "obsidian";
import { PublishableNote, ResolvedAsset, sanitizeFileName } from "../core/note";
import { PublishResult, PublisherProvider } from "../core/providers";
import { replaceAssetReference } from "../core/markdown";
import { buildExportFrontmatter, serializeFrontmatter } from "../core/yaml";
import { LocalExportTargetConfig } from "../types";

export class LocalExportProvider implements PublisherProvider<LocalExportTargetConfig> {
  readonly provider = "local-export" as const;

  constructor(private readonly app: App) {}

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
    const assetDir = join(target.outputDir, target.assetDirName || "assets");
    await mkdir(target.outputDir, { recursive: true });
    await mkdir(assetDir, { recursive: true });

    let markdown = note.markdown;
    for (const asset of note.attachments) {
      const rewritten = await this.copyAsset(asset, slug, assetDir, target);
      markdown = replaceAssetReference(markdown, asset.reference, rewritten);
    }

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
    const content = `${serializeFrontmatter(frontmatter)}\n\n${markdown.trim()}\n`;
    await writeFile(outputPath, content, "utf8");

    return {
      remoteId: outputPath,
      remoteUrl: outputPath,
    };
  }

  private async copyAsset(
    asset: ResolvedAsset,
    slug: string,
    assetDir: string,
    target: LocalExportTargetConfig
  ): Promise<string> {
    const sourceData = await this.app.vault.adapter.readBinary(normalizePath(asset.sourcePath));
    const assetName = `${slug}-${sanitizeFileName(asset.fileName, "asset")}`;
    const destination = join(assetDir, assetName);
    await writeFile(destination, Buffer.from(sourceData));
    const relativeDir = target.assetDirName || "assets";
    return `./${relativeDir}/${assetName}`;
  }
}
