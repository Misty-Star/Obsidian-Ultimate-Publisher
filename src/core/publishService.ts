import { App, TFile } from "obsidian";
import { extractPublishableNote, computeContentHash } from "./note";
import { prepareNoteForPublish } from "./mediaPipeline";
import { PublisherProvider } from "./providers";
import { applyNormalPublishContextToNote } from "./normalPublish/overrides";
import { NormalPublishExecutionContext } from "./normalPublish/types";
import { ProviderRegistry } from "../providers/registry";
import { PublishRecord, PublishTargetConfig, UltimatePublisherSettings } from "../types";
import { getRecord, upsertRecord } from "../settings";

export interface PublishServiceResult {
  record: PublishRecord;
  created: boolean;
}

export interface PublishMediaPipeline {
  prepare(
    note: ReturnType<typeof extractPublishableNote> extends Promise<infer T> ? T : never,
    target: PublishTargetConfig,
    provider: PublisherProvider
  ): Promise<ReturnType<typeof extractPublishableNote> extends Promise<infer T> ? T : never>;
}

export class PublishService {
  constructor(
    private readonly app: App,
    private readonly providers: ProviderRegistry,
    private readonly mediaPipeline: PublishMediaPipeline = {
      prepare: prepareNoteForPublish,
    }
  ) {}

  async publishFile(
    file: TFile,
    target: PublishTargetConfig,
    settings: UltimatePublisherSettings,
    context?: NormalPublishExecutionContext
  ): Promise<PublishServiceResult> {
    const provider = this.providers.get(target);
    await provider.validateConfig(target as never);

    const extractedNote = await extractPublishableNote(this.app, file);
    const note = applyNormalPublishContextToNote(extractedNote, context);
    const contentHash = computeContentHash(note);
    const preparedNote = applyNormalPublishContextToNote(
      await this.mediaPipeline.prepare(note, target, provider),
      context
    );
    const existing = getRecord(settings.records, file.path, target.id);

    const result = existing
      ? await provider.update(existing.remoteId, preparedNote, target as never, context)
      : await provider.publish(preparedNote, target as never, context);

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
