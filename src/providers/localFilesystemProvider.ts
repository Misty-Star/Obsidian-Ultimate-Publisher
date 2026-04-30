import { App, normalizePath } from "obsidian";
import { PublishableNote } from "../core/note";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import { MediaSupport, ProviderRuntimeOptions, PublisherProvider, PublishResult } from "../core/providers";
import { buildStaticSiteContentPath, buildStaticSiteMarkdown } from "../core/staticSite/content";
import { LocalFilesystemTargetConfig } from "../types";

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function sanitizeVaultRelativePath(value: string): string {
  const normalized = normalizePath(trimSlashes(value || "published"));
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Local filesystem output path must stay inside the vault.");
  }
  return normalized;
}

function joinVaultPath(root: string, contentPath: string): string {
  return normalizePath(`${sanitizeVaultRelativePath(root)}/${trimSlashes(contentPath)}`);
}

export class LocalFilesystemProvider implements PublisherProvider<LocalFilesystemTargetConfig> {
  readonly provider = "local-filesystem" as const;

  constructor(private readonly app: App) {}

  getMediaSupport(_target: LocalFilesystemTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: LocalFilesystemTargetConfig): Promise<void> {
    sanitizeVaultRelativePath(target.localOutputPath);
  }

  async publish(
    note: PublishableNote,
    target: LocalFilesystemTargetConfig,
    _context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<LocalFilesystemTargetConfig>
  ): Promise<PublishResult> {
    const contentPath = buildStaticSiteContentPath(note, {
      generator: target.siteGenerator,
      contentRoot: "",
    });
    const vaultPath = joinVaultPath(target.localOutputPath, contentPath);
    const markdown = buildStaticSiteMarkdown(note);
    const adapter = this.app.vault.adapter;
    if (!adapter || typeof adapter.write !== "function") {
      throw new Error("Local filesystem publishing requires a vault adapter with write support.");
    }
    if (!target.overwriteExisting && typeof adapter.exists === "function" && (await adapter.exists(vaultPath))) {
      throw new Error(`Local filesystem publish would overwrite existing file: ${vaultPath}`);
    }
    await adapter.write(vaultPath, markdown);
    return { remoteId: vaultPath, remoteUrl: vaultPath };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: LocalFilesystemTargetConfig,
    context?: NormalPublishExecutionContext,
    runtime?: ProviderRuntimeOptions<LocalFilesystemTargetConfig>
  ): Promise<PublishResult> {
    const pathTarget = remoteId ? { ...target, localOutputPath: "" } : target;
    if (remoteId) {
      const adapter = this.app.vault.adapter;
      if (!adapter || typeof adapter.write !== "function") {
        throw new Error("Local filesystem publishing requires a vault adapter with write support.");
      }
      await adapter.write(sanitizeVaultRelativePath(remoteId), buildStaticSiteMarkdown(note));
      return { remoteId: sanitizeVaultRelativePath(remoteId), remoteUrl: sanitizeVaultRelativePath(remoteId) };
    }
    return this.publish(note, pathTarget, context, runtime);
  }

  async delete(remoteId: string, _target: LocalFilesystemTargetConfig): Promise<void> {
    const adapter = this.app.vault.adapter;
    if (!adapter || typeof adapter.remove !== "function") {
      throw new Error("Local filesystem delete requires a vault adapter with remove support.");
    }
    await adapter.remove(sanitizeVaultRelativePath(remoteId));
  }

  async getPreviewUrl(remoteId: string, _target: LocalFilesystemTargetConfig): Promise<string | undefined> {
    return sanitizeVaultRelativePath(remoteId);
  }
}
