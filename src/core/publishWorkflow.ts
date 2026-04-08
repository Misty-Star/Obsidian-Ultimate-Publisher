import { TFile } from "obsidian";
import { getRecord } from "../settings";
import { NormalPublishExecutionContext } from "./normalPublish/types";
import { mergeProviderOptionCacheIntoSettings, PublishService, PublishServiceResult } from "./publishService";
import {
  getPublishFailureProviderOptionCache,
  getPublishFailureSettings,
  withPublishFailureDetails,
} from "./providers";
import { PublishTargetConfig, UltimatePublisherSettings } from "../types";

export type PublishAction = "publish" | "update";
export type BatchPublishTargetStatus = "success" | "failure";
export type BatchPublishProgressStatus = "running" | "success" | "failure";

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
  durationMs?: number;
  remoteUrl?: string;
  error?: Error;
}

export interface BatchPublishProgressEvent {
  targetId: string;
  targetName: string;
  action: PublishAction;
  status: BatchPublishProgressStatus;
  currentIndex: number;
  totalCount: number;
  durationMs?: number;
  remoteUrl?: string;
  error?: Error;
}

export interface BatchPublishRunOptions {
  contextByTargetId?: Record<string, NormalPublishExecutionContext>;
  onProgress?: (event: BatchPublishProgressEvent) => void | Promise<void>;
}

export interface BatchPublishWorkflowResult {
  results: BatchPublishTargetResult[];
  totalCount: number;
  successCount: number;
  failureCount: number;
  settings: UltimatePublisherSettings;
}

export class PublishWorkflow {
  constructor(private readonly publishService: PublishService) {}

  private async emitProgressSafely(
    options: BatchPublishRunOptions,
    event: BatchPublishProgressEvent
  ): Promise<void> {
    try {
      await options.onProgress?.(event);
    } catch {
      // Swallow progress callback errors so they do not interrupt batch publishing.
    }
  }

  private resolveAction(file: TFile, target: PublishTargetConfig, settings: UltimatePublisherSettings): PublishAction {
    return getRecord(settings.records, file.path, target.id) ? "update" : "publish";
  }

  async runSingle(
    file: TFile,
    target: PublishTargetConfig,
    settings: UltimatePublisherSettings,
    context?: NormalPublishExecutionContext
  ): Promise<SinglePublishWorkflowResult> {
    const action = this.resolveAction(file, target, settings);
    try {
      const serviceResult = await this.publishService.publishFile(file, target, settings, context);
      const nextSettings = this.publishService.updateSettings(
        settings,
        serviceResult.record,
        serviceResult.providerOptionCache
      );

      return {
        action,
        record: serviceResult.record,
        settings: nextSettings,
      };
    } catch (error) {
      const cachedSettings = getPublishFailureSettings(error);
      if (cachedSettings) {
        throw withPublishFailureDetails(error, { settings: cachedSettings });
      }

      const providerOptionCache = getPublishFailureProviderOptionCache(error);
      if (providerOptionCache) {
        throw withPublishFailureDetails(error, {
          providerOptionCache,
          settings: mergeProviderOptionCacheIntoSettings(settings, providerOptionCache),
        });
      }

      throw error;
    }
  }

  async runBatch(
    file: TFile,
    targets: PublishTargetConfig[],
    settings: UltimatePublisherSettings,
    options: BatchPublishRunOptions = {}
  ): Promise<BatchPublishWorkflowResult> {
    let currentSettings = settings;
    const results: BatchPublishTargetResult[] = [];
    const totalCount = targets.length;

    for (const [index, target] of targets.entries()) {
      const action = this.resolveAction(file, target, currentSettings);
      const context = options.contextByTargetId?.[target.id];
      const currentIndex = index + 1;

      await this.emitProgressSafely(options, {
        targetId: target.id,
        targetName: target.name,
        action,
        status: "running",
        currentIndex,
        totalCount,
      });
      const startedAt = Date.now();

      try {
        const singleResult = await this.runSingle(file, target, currentSettings, context);
        const durationMs = Date.now() - startedAt;
        currentSettings = singleResult.settings;

        results.push({
          targetId: target.id,
          targetName: target.name,
          action: singleResult.action,
          status: "success",
          durationMs,
          remoteUrl: singleResult.record.remoteUrl,
        });

        await this.emitProgressSafely(options, {
          targetId: target.id,
          targetName: target.name,
          action: singleResult.action,
          status: "success",
          currentIndex,
          totalCount,
          durationMs,
          remoteUrl: singleResult.record.remoteUrl,
        });
      } catch (error) {
        const cachedSettings = getPublishFailureSettings(error);
        if (cachedSettings) {
          currentSettings = cachedSettings;
        } else {
          const providerOptionCache = getPublishFailureProviderOptionCache(error);
          if (providerOptionCache) {
            currentSettings = mergeProviderOptionCacheIntoSettings(currentSettings, providerOptionCache);
          }
        }

        const normalizedError = error instanceof Error ? error : new Error(String(error));
        const durationMs = Date.now() - startedAt;

        results.push({
          targetId: target.id,
          targetName: target.name,
          action,
          status: "failure",
          durationMs,
          error: normalizedError,
        });

        await this.emitProgressSafely(options, {
          targetId: target.id,
          targetName: target.name,
          action,
          status: "failure",
          currentIndex,
          totalCount,
          durationMs,
          error: normalizedError,
        });
      }
    }

    const successCount = results.filter((item) => item.status === "success").length;
    const failureCount = results.length - successCount;

    return {
      results,
      totalCount,
      successCount,
      failureCount,
      settings: currentSettings,
    };
  }
}
