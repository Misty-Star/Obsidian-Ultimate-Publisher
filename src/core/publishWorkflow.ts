import { TFile } from "obsidian";
import { getRecord } from "../settings";
import { PublishService, PublishServiceResult } from "./publishService";
import { PublishTargetConfig, UltimatePublisherSettings } from "../types";

export type PublishAction = "publish" | "update";
export type BatchPublishTargetStatus = "success" | "failure";

export interface SinglePublishWorkflowResult {
  action: PublishAction;
  record: PublishServiceResult["record"];
  settings: UltimatePublisherSettings;
}

export interface BatchPublishTargetResult {
  targetId: string;
  targetName: string;
  action: PublishAction;
  status: BatchPublishTargetStatus;
  remoteUrl?: string;
  error?: Error;
}

export interface BatchPublishWorkflowResult {
  results: BatchPublishTargetResult[];
  settings: UltimatePublisherSettings;
}

export class PublishWorkflow {
  constructor(private readonly publishService: PublishService) {}

  private resolveAction(file: TFile, target: PublishTargetConfig, settings: UltimatePublisherSettings): PublishAction {
    return getRecord(settings.records, file.path, target.id) ? "update" : "publish";
  }

  async runSingle(
    file: TFile,
    target: PublishTargetConfig,
    settings: UltimatePublisherSettings
  ): Promise<SinglePublishWorkflowResult> {
    const action = this.resolveAction(file, target, settings);
    const serviceResult = await this.publishService.publishFile(file, target, settings);
    const nextSettings = this.publishService.updateSettings(settings, serviceResult.record);

    return {
      action,
      record: serviceResult.record,
      settings: nextSettings,
    };
  }

  async runBatch(
    file: TFile,
    targets: PublishTargetConfig[],
    settings: UltimatePublisherSettings
  ): Promise<BatchPublishWorkflowResult> {
    let currentSettings = settings;
    const results: BatchPublishTargetResult[] = [];

    for (const target of targets) {
      const action = this.resolveAction(file, target, currentSettings);

      try {
        const singleResult = await this.runSingle(file, target, currentSettings);
        currentSettings = singleResult.settings;

        results.push({
          targetId: target.id,
          targetName: target.name,
          action: singleResult.action,
          status: "success",
          remoteUrl: singleResult.record.remoteUrl,
        });
      } catch (error) {
        results.push({
          targetId: target.id,
          targetName: target.name,
          action,
          status: "failure",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return {
      results,
      settings: currentSettings,
    };
  }
}
