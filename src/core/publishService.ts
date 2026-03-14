import { App, TFile } from "obsidian";
import { extractPublishableNote, computeContentHash } from "./note";
import { ProviderRegistry } from "../providers/registry";
import { PublishRecord, PublishTargetConfig, UltimatePublisherSettings } from "../types";
import { getRecord, upsertRecord } from "../settings";

export interface PublishServiceResult {
  record: PublishRecord;
  created: boolean;
}

export class PublishService {
  constructor(private readonly app: App, private readonly providers: ProviderRegistry) {}

  async publishFile(
    file: TFile,
    target: PublishTargetConfig,
    settings: UltimatePublisherSettings
  ): Promise<PublishServiceResult> {
    const provider = this.providers.get(target);
    await provider.validateConfig(target as never);

    const note = await extractPublishableNote(this.app, file);
    const contentHash = computeContentHash(note);
    const existing = getRecord(settings.records, file.path, target.id);

    const result = existing
      ? await provider.update(existing.remoteId, note, target as never)
      : await provider.publish(note, target as never);

    const previewUrl = result.remoteUrl ?? (await provider.getPreviewUrl(result.remoteId, target as never));
    const record: PublishRecord = {
      notePath: file.path,
      provider: target.provider,
      targetId: target.id,
      remoteId: result.remoteId,
      remoteUrl: previewUrl,
      lastPublishedAt: new Date().toISOString(),
      contentHash,
    };

    return {
      record,
      created: !existing,
    };
  }

  updateSettings(settings: UltimatePublisherSettings, record: PublishRecord): UltimatePublisherSettings {
    return {
      ...settings,
      records: upsertRecord(settings.records, record),
    };
  }
}
