import { getProviderDefinition } from "./providers/definitions";
import {
  CachedProviderOption,
  CsdnTargetConfig,
  FrontmatterAutomationSettings,
  GithubTargetConfig,
  GitlabTargetConfig,
  JuejinTargetConfig,
  JuejinProviderOptionCacheEntry,
  LocalFilesystemTargetConfig,
  LlmSettings,
  ProviderOptionCache,
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
  return getProviderDefinition("wordpress").createTarget();
}

export function createYuqueTarget(): YuqueTargetConfig {
  return getProviderDefinition("yuque").createTarget();
}

export function createZhihuTarget(): ZhihuTargetConfig {
  return getProviderDefinition("zhihu").createTarget();
}

export function createCsdnTarget(): CsdnTargetConfig {
  return getProviderDefinition("csdn").createTarget();
}

export function createJuejinTarget(): JuejinTargetConfig {
  return getProviderDefinition("juejin").createTarget();
}

export function createGithubTarget(): GithubTargetConfig {
  return getProviderDefinition("github").createTarget();
}

export function createGitlabTarget(): GitlabTargetConfig {
  return getProviderDefinition("gitlab").createTarget();
}

export function createLocalFilesystemTarget(): LocalFilesystemTargetConfig {
  return getProviderDefinition("local-filesystem").createTarget();
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
  switch (target.provider) {
    case "wordpress":
      return getProviderDefinition("wordpress").normalizeTarget(target);
    case "yuque":
      return getProviderDefinition("yuque").normalizeTarget(target);
    case "zhihu":
      return getProviderDefinition("zhihu").normalizeTarget(target);
    case "csdn":
      return getProviderDefinition("csdn").normalizeTarget(target);
    case "juejin":
      return getProviderDefinition("juejin").normalizeTarget(target);
    case "github":
      return getProviderDefinition("github").normalizeTarget(target);
    case "gitlab":
      return getProviderDefinition("gitlab").normalizeTarget(target);
    case "local-filesystem":
      return getProviderDefinition("local-filesystem").normalizeTarget(target);
  }
}
