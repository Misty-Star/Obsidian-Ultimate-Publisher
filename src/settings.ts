import { randomUUID } from "node:crypto";
import {
  CsdnTargetConfig,
  JuejinTargetConfig,
  LlmSettings,
  PublishContentFormat,
  PublishRecord,
  PublishTargetConfig,
  UltimatePublisherSettings,
  WordpressTargetConfig,
  YuqueTargetConfig,
  ZhihuTargetConfig,
} from "./types";

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  enabled: false,
  vendor: "openai",
  apiKey: "",
  model: "",
  endpointOverride: "",
  temperature: 0.3,
  timeoutMs: 30000,
  maxInputChars: 12000,
};

export function normalizeLlmSettings(value: Partial<LlmSettings> | null | undefined): LlmSettings {
  return {
    enabled: Boolean(value?.enabled),
    vendor:
      value?.vendor === "anthropic" || value?.vendor === "gemini" || value?.vendor === "openai"
        ? value.vendor
        : DEFAULT_LLM_SETTINGS.vendor,
    apiKey: typeof value?.apiKey === "string" ? value.apiKey : "",
    model: typeof value?.model === "string" ? value.model : "",
    endpointOverride: typeof value?.endpointOverride === "string" ? value.endpointOverride : "",
    temperature:
      typeof value?.temperature === "number" && Number.isFinite(value.temperature)
        ? value.temperature
        : DEFAULT_LLM_SETTINGS.temperature,
    timeoutMs:
      typeof value?.timeoutMs === "number" && value.timeoutMs > 0
        ? value.timeoutMs
        : DEFAULT_LLM_SETTINGS.timeoutMs,
    maxInputChars:
      typeof value?.maxInputChars === "number" && value.maxInputChars > 0
        ? value.maxInputChars
        : DEFAULT_LLM_SETTINGS.maxInputChars,
  };
}

export const DEFAULT_SETTINGS: UltimatePublisherSettings = {
  targets: [],
  records: [],
  llm: { ...DEFAULT_LLM_SETTINGS },
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

export function createZhihuTarget(): ZhihuTargetConfig {
  return {
    id: randomUUID(),
    name: "Zhihu",
    enabled: true,
    provider: "zhihu",
    cookie: "",
    defaultColumnId: "",
    defaultColumnTitle: "",
  };
}

export function createCsdnTarget(): CsdnTargetConfig {
  return {
    id: randomUUID(),
    name: "CSDN",
    enabled: true,
    provider: "csdn",
    cookie: "",
    defaultCategories: [],
    defaultTags: [],
  };
}

export function createJuejinTarget(): JuejinTargetConfig {
  return {
    id: randomUUID(),
    name: "Juejin",
    enabled: true,
    provider: "juejin",
    cookie: "",
    defaultCategoryId: "",
    defaultCategoryName: "",
    defaultTagIds: [],
    defaultTagNames: [],
    defaultBriefContent: "",
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

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeTarget(target: PublishTargetConfig): PublishTargetConfig {
  switch (target.provider) {
    case "wordpress":
      return {
        ...target,
        defaultStatus: target.defaultStatus ?? "draft",
        contentFormat: (target.contentFormat ?? "html") as PublishContentFormat,
      };
    case "yuque":
      return {
        ...target,
        baseUrl: target.baseUrl || "https://www.yuque.com",
        publicLevel: target.publicLevel ?? 0,
      };
    case "zhihu":
      return {
        ...target,
        cookie: target.cookie || "",
        defaultColumnId: target.defaultColumnId || "",
        defaultColumnTitle: target.defaultColumnTitle || "",
      };
    case "csdn":
      return {
        ...target,
        cookie: target.cookie || "",
        defaultCategories: normalizeStringList(target.defaultCategories),
        defaultTags: normalizeStringList(target.defaultTags),
      };
    case "juejin":
      return {
        ...target,
        cookie: target.cookie || "",
        defaultCategoryId: target.defaultCategoryId || "",
        defaultCategoryName: target.defaultCategoryName || "",
        defaultTagIds: normalizeStringList(target.defaultTagIds),
        defaultTagNames: normalizeStringList(target.defaultTagNames),
        defaultBriefContent: target.defaultBriefContent || "",
      };
  }
}
