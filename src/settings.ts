import { randomUUID } from "node:crypto";
import {
  CachedProviderOption,
  CsdnTargetConfig,
  FrontmatterAutomationSettings,
  JuejinTargetConfig,
  JuejinProviderOptionCacheEntry,
  LlmSettings,
  ProviderOptionCache,
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

export const DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS: FrontmatterAutomationSettings = {
  enabled: false,
  includeOptionComments: true,
};

export const EMPTY_PROVIDER_OPTION_CACHE: ProviderOptionCache = {
  juejinByTargetId: {},
};

export function normalizeLlmSettings(value: Partial<LlmSettings> | null | undefined): LlmSettings {
  return {
    enabled: Boolean(value?.enabled),
    vendor:
      value?.vendor === "anthropic" || value?.vendor === "gemini" || value?.vendor === "openai" || value?.vendor === "openai-compatible"
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

function normalizeCachedProviderOption(value: unknown): CachedProviderOption | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.label !== "string") {
    return null;
  }

  return {
    id: raw.id,
    label: raw.label,
    description: typeof raw.description === "string" ? raw.description : undefined,
  };
}

function normalizeCachedProviderOptionList(value: unknown): CachedProviderOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeCachedProviderOption(item))
    .filter((item): item is CachedProviderOption => item !== null);
}

function normalizeJuejinProviderOptionCacheEntry(value: unknown): JuejinProviderOptionCacheEntry | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.fetchedAt !== "string") {
    return null;
  }

  return {
    fetchedAt: raw.fetchedAt,
    categories: normalizeCachedProviderOptionList(raw.categories),
    tags: normalizeCachedProviderOptionList(raw.tags),
  };
}

export function normalizeFrontmatterAutomationSettings(
  value: Partial<FrontmatterAutomationSettings> | null | undefined
): FrontmatterAutomationSettings {
  return {
    enabled: typeof value?.enabled === "boolean" ? value.enabled : DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS.enabled,
    includeOptionComments:
      typeof value?.includeOptionComments === "boolean"
        ? value.includeOptionComments
        : DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS.includeOptionComments,
  };
}

export function normalizeProviderOptionCache(value: unknown): ProviderOptionCache {
  const rawValue = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  const rawJuejinByTargetId = rawValue?.juejinByTargetId;
  if (typeof rawJuejinByTargetId !== "object" || rawJuejinByTargetId === null) {
    return {
      juejinByTargetId: {},
    };
  }

  const juejinByTargetId: Record<string, JuejinProviderOptionCacheEntry> = {};
  for (const [targetId, entry] of Object.entries(rawJuejinByTargetId)) {
    const normalizedEntry = normalizeJuejinProviderOptionCacheEntry(entry);
    if (normalizedEntry) {
      juejinByTargetId[targetId] = normalizedEntry;
    }
  }

  return {
    juejinByTargetId,
  };
}

export const DEFAULT_SETTINGS: UltimatePublisherSettings = {
  targets: [],
  records: [],
  frontmatterAutomation: { ...DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS },
  providerOptionCache: {
    juejinByTargetId: {},
  },
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
