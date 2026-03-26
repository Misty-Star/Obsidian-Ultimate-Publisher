import { Notice } from "obsidian";
import { PublishRecord, PublishTargetConfig } from "../types";
import { PublishableNote, ResolvedAsset } from "./note";
import { NormalPublishExecutionContext } from "./normalPublish/types";

export interface PublishResult {
  remoteId: string;
  remoteUrl?: string;
}

export type MediaSupportMode = "unsupported" | "local-copy" | "native-upload";

export interface MediaSupport {
  mode: MediaSupportMode;
}

export interface MediaUploadResult {
  url: string;
}

export interface NormalPublishOptionItem {
  id: string;
  label: string;
  description?: string;
}

export interface ProviderRemoteOptions {
  wordpressCategories?: NormalPublishOptionItem[];
  wordpressTags?: NormalPublishOptionItem[];
  zhihuColumns?: NormalPublishOptionItem[];
  csdnCategories?: NormalPublishOptionItem[];
  csdnTags?: NormalPublishOptionItem[];
  juejinCategories?: NormalPublishOptionItem[];
  juejinTags?: NormalPublishOptionItem[];
}

export interface PublisherProvider<TConfig extends PublishTargetConfig = PublishTargetConfig> {
  readonly provider: TConfig["provider"];
  getMediaSupport(target: TConfig): MediaSupport;
  uploadAsset?(asset: ResolvedAsset, note: PublishableNote, target: TConfig): Promise<MediaUploadResult>;
  copyAsset?(asset: ResolvedAsset, note: PublishableNote, target: TConfig): Promise<MediaUploadResult>;
  loadNormalPublishOptions?(target: TConfig): Promise<ProviderRemoteOptions>;
  validateConfig(target: TConfig): Promise<void>;
  publish(note: PublishableNote, target: TConfig, context?: NormalPublishExecutionContext): Promise<PublishResult>;
  update(remoteId: string, note: PublishableNote, target: TConfig, context?: NormalPublishExecutionContext): Promise<PublishResult>;
  delete(remoteId: string, target: TConfig): Promise<void>;
  getPreviewUrl(remoteId: string, target: TConfig): Promise<string | undefined>;
}

export interface PublishContext {
  target: PublishTargetConfig;
  record?: PublishRecord;
}

export function assertRemoteAssetsSupported(note: PublishableNote, targetName: string): void {
  if (note.attachments.length === 0) {
    return;
  }
  const files = note.attachments.map((asset) => asset.sourcePath).join(", ");
  throw new Error(`${targetName} does not support local Obsidian assets in the MVP. Remove or externalize these files first: ${files}`);
}

export function showPublishNotice(message: string): Notice {
  return new Notice(message, 5000);
}
