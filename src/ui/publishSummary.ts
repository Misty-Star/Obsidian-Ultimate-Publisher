import { ProviderId, PublishRecord, UltimatePublisherSettings } from "../types";

const DEFAULT_DASHBOARD_RECORD_LIMIT = 10;

export type NoteTargetAction = "publish" | "update";

export interface DashboardSummary {
  configuredCount: number;
  enabledCount: number;
  recentRecords: PublishRecord[];
  recordLimit: number;
  targetSummaries: DashboardTargetSummary[];
}

export interface DashboardTargetSummary {
  targetId: string;
  name: string;
  provider: ProviderId;
  enabled: boolean;
  lastPublishedAt?: string;
}

export interface NoteTargetSummary {
  targetId: string;
  name: string;
  provider: ProviderId;
  enabled: boolean;
  action: NoteTargetAction;
  lastPublishedAt?: string;
}

export interface BatchSelectionTarget {
  targetId: string;
  action: NoteTargetAction;
  enabled: boolean;
}

export interface BatchSelectionSummary {
  selectedCount: number;
  publishCount: number;
  updateCount: number;
}

function parseTimestamp(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareTimestampsDesc(a: string, b: string): number {
  return parseTimestamp(b) - parseTimestamp(a);
}

function isAfter(candidate: string, reference: string): boolean {
  return parseTimestamp(candidate) > parseTimestamp(reference);
}

function mapLatestRecordByTarget(records: PublishRecord[]): Map<string, PublishRecord> {
  return records.reduce((acc, record) => {
    const existing = acc.get(record.targetId);
    if (!existing || isAfter(record.lastPublishedAt, existing.lastPublishedAt)) {
      acc.set(record.targetId, record);
    }
    return acc;
  }, new Map<string, PublishRecord>());
}

export function deriveDashboardSummary(
  settings: UltimatePublisherSettings,
  recordLimit = DEFAULT_DASHBOARD_RECORD_LIMIT
): DashboardSummary {
  const configuredCount = settings.targets.length;
  const enabledCount = settings.targets.filter((target) => target.enabled).length;
  const limit = Math.max(0, recordLimit);

  const recentRecords = [...settings.records]
    .sort((a, b) => compareTimestampsDesc(a.lastPublishedAt, b.lastPublishedAt))
    .slice(0, limit);

  const latestRecords = mapLatestRecordByTarget(settings.records);

  const targetSummaries: DashboardTargetSummary[] = settings.targets
    .map((target) => ({
      targetId: target.id,
      name: target.name,
      provider: target.provider,
      enabled: target.enabled,
      lastPublishedAt: latestRecords.get(target.id)?.lastPublishedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    configuredCount,
    enabledCount,
    recentRecords,
    recordLimit: limit,
    targetSummaries,
  };
}

export function deriveNoteTargetSummaries(
  settings: UltimatePublisherSettings,
  notePath: string
): NoteTargetSummary[] {
  const recordsForNote = settings.records.filter((record) => record.notePath === notePath);
  const latestRecords = mapLatestRecordByTarget(recordsForNote);

  const summaries: NoteTargetSummary[] = settings.targets.map((target) => {
    const record = latestRecords.get(target.id);
    return {
      targetId: target.id,
      name: target.name,
      provider: target.provider,
      enabled: target.enabled,
      action: record ? "update" : "publish",
      lastPublishedAt: record?.lastPublishedAt,
    };
  });

  return summaries.sort((a, b) => {
    if (a.enabled === b.enabled) {
      return a.name.localeCompare(b.name);
    }
    return a.enabled ? -1 : 1;
  });
}

export function summarizeBatchSelection(
  targets: BatchSelectionTarget[],
  selectedTargetIds: string[]
): BatchSelectionSummary {
  const selectedSet = new Set(selectedTargetIds);
  const selectedTargets = targets.filter((target) => selectedSet.has(target.targetId));

  const publishCount = selectedTargets.filter((target) => target.action === "publish").length;
  const updateCount = selectedTargets.filter((target) => target.action === "update").length;

  return {
    selectedCount: selectedTargets.length,
    publishCount,
    updateCount,
  };
}
