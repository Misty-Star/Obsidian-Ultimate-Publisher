import { randomUUID } from "node:crypto";
import {
  LocalExportTargetConfig,
  PublishContentFormat,
  PublishRecord,
  PublishTargetConfig,
  UltimatePublisherSettings,
  WordpressTargetConfig,
  YuqueTargetConfig,
} from "./types";

export const DEFAULT_SETTINGS: UltimatePublisherSettings = {
  targets: [],
  records: [],
};

export function createWordpressTarget(): WordpressTargetConfig {
  return {
    id: randomUUID(),
    name: "WordPress",
    enabled: true,
    provider: "wordpress",
    endpoint: "",
    username: "",
    appPassword: "",
    defaultStatus: "draft",
    contentFormat: "html",
  };
}

export function createYuqueTarget(): YuqueTargetConfig {
  return {
    id: randomUUID(),
    name: "Yuque",
    enabled: true,
    provider: "yuque",
    baseUrl: "https://www.yuque.com",
    repo: "",
    token: "",
    publicLevel: 0,
  };
}

export function createLocalExportTarget(): LocalExportTargetConfig {
  return {
    id: randomUUID(),
    name: "Local Export",
    enabled: true,
    provider: "local-export",
    outputDir: "",
    yamlType: "default",
    assetDirName: "assets",
  };
}

export function getRecord(records: PublishRecord[], notePath: string, targetId: string): PublishRecord | undefined {
  return records.find((record) => record.notePath === notePath && record.targetId === targetId);
}

export function upsertRecord(records: PublishRecord[], nextRecord: PublishRecord): PublishRecord[] {
  const existingIndex = records.findIndex(
    (record) => record.notePath === nextRecord.notePath && record.targetId === nextRecord.targetId
  );

  if (existingIndex === -1) {
    return [...records, nextRecord];
  }

  const next = records.slice();
  next[existingIndex] = nextRecord;
  return next;
}

export function removeRecord(records: PublishRecord[], notePath: string, targetId: string): PublishRecord[] {
  return records.filter((record) => !(record.notePath === notePath && record.targetId === targetId));
}

export function cloneTarget(target: PublishTargetConfig): PublishTargetConfig {
  return JSON.parse(JSON.stringify(target)) as PublishTargetConfig;
}

export function normalizeTarget(target: PublishTargetConfig): PublishTargetConfig {
  if (target.provider === "wordpress") {
    return {
      ...target,
      defaultStatus: target.defaultStatus ?? "draft",
      contentFormat: (target.contentFormat ?? "html") as PublishContentFormat,
    };
  }

  if (target.provider === "yuque") {
    return {
      ...target,
      baseUrl: target.baseUrl || "https://www.yuque.com",
      publicLevel: target.publicLevel ?? 0,
    };
  }

  return {
    ...target,
    yamlType: target.yamlType ?? "default",
    assetDirName: target.assetDirName || "assets",
  };
}
