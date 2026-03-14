import { Notice } from "obsidian";
import { PublishRecord, PublishTargetConfig } from "../types";
import { PublishableNote } from "./note";

export interface PublishResult {
  remoteId: string;
  remoteUrl?: string;
}

export interface PublisherProvider<TConfig extends PublishTargetConfig = PublishTargetConfig> {
  readonly provider: TConfig["provider"];
  validateConfig(target: TConfig): Promise<void>;
  publish(note: PublishableNote, target: TConfig): Promise<PublishResult>;
  update(remoteId: string, note: PublishableNote, target: TConfig): Promise<PublishResult>;
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
