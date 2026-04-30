import { getProviderDefinition } from "./providers/definitions";
import {
  CachedProviderOption,
  BilibiliTargetConfig,
  ConfluenceTargetConfig,
  CsdnTargetConfig,
  FrontmatterAutomationSettings,
  GithubTargetConfig,
  GitlabTargetConfig,
  HaloTargetConfig,
  HaloWebTargetConfig,
  JianshuTargetConfig,
  JuejinTargetConfig,
  JuejinProviderOptionCacheEntry,
  LlmSettings,
  MetaWeblogTargetConfig,
  NotionTargetConfig,
  ProviderOptionCache,
  PublishRecord,
  PublishTargetConfig,
  UltimatePublisherSettings,
  TelegraphTargetConfig,
  WechatTargetConfig,
  WordpressTargetConfig,
  XiaohongshuTargetConfig,
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

export const DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS: FrontmatterAutomationSettings =
  {
    enabled: false,
    includeOptionComments: true,
  };

export const EMPTY_PROVIDER_OPTION_CACHE: ProviderOptionCache = {
  juejinByTargetId: {},
};

export function normalizeLlmSettings(
  value: Partial<LlmSettings> | null | undefined,
): LlmSettings {
  return {
    enabled: Boolean(value?.enabled),
    vendor:
      value?.vendor === "anthropic" ||
      value?.vendor === "gemini" ||
      value?.vendor === "openai" ||
      value?.vendor === "openai-compatible"
        ? value.vendor
        : DEFAULT_LLM_SETTINGS.vendor,
    apiKey: typeof value?.apiKey === "string" ? value.apiKey : "",
    model: typeof value?.model === "string" ? value.model : "",
    endpointOverride:
      typeof value?.endpointOverride === "string" ? value.endpointOverride : "",
    temperature:
      typeof value?.temperature === "number" &&
      Number.isFinite(value.temperature)
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

function normalizeCachedProviderOption(
  value: unknown,
): CachedProviderOption | null {
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
    description:
      typeof raw.description === "string" ? raw.description : undefined,
  };
}

function normalizeCachedProviderOptionList(
  value: unknown,
): CachedProviderOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeCachedProviderOption(item))
    .filter((item): item is CachedProviderOption => item !== null);
}

function normalizeJuejinProviderOptionCacheEntry(
  value: unknown,
): JuejinProviderOptionCacheEntry | null {
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
  value: Partial<FrontmatterAutomationSettings> | null | undefined,
): FrontmatterAutomationSettings {
  return {
    enabled:
      typeof value?.enabled === "boolean"
        ? value.enabled
        : DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS.enabled,
    includeOptionComments:
      typeof value?.includeOptionComments === "boolean"
        ? value.includeOptionComments
        : DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS.includeOptionComments,
  };
}

export function normalizeProviderOptionCache(
  value: unknown,
): ProviderOptionCache {
  const rawValue =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
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

export function createMetaWeblogTarget(provider: MetaWeblogTargetConfig["provider"] = "metaweblog"): MetaWeblogTargetConfig {
  return getProviderDefinition(provider).createTarget() as MetaWeblogTargetConfig;
}

export function createYuqueTarget(): YuqueTargetConfig {
  return getProviderDefinition("yuque").createTarget();
}

export function createNotionTarget(): NotionTargetConfig {
  return getProviderDefinition("notion").createTarget();
}

export function createHaloTarget(): HaloTargetConfig {
  return getProviderDefinition("halo").createTarget();
}

export function createTelegraphTarget(): TelegraphTargetConfig {
  return getProviderDefinition("telegraph").createTarget();
}

export function createConfluenceTarget(): ConfluenceTargetConfig {
  return getProviderDefinition("confluence").createTarget();
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

export function createJianshuTarget(): JianshuTargetConfig {
  return getProviderDefinition("jianshu").createTarget();
}

export function createWechatTarget(): WechatTargetConfig {
  return getProviderDefinition("wechat").createTarget();
}

export function createHaloWebTarget(): HaloWebTargetConfig {
  return getProviderDefinition("halo-web").createTarget();
}

export function createBilibiliTarget(): BilibiliTargetConfig {
  return getProviderDefinition("bilibili").createTarget();
}

export function createXiaohongshuTarget(): XiaohongshuTargetConfig {
  return getProviderDefinition("xiaohongshu").createTarget();
}

export function createGithubTarget(): GithubTargetConfig {
  return getProviderDefinition("github-hugo").createTarget();
}

export function createGitlabTarget(): GitlabTargetConfig {
  return getProviderDefinition("gitlab-hugo").createTarget();
}


export function getRecord(
  records: PublishRecord[],
  notePath: string,
  targetId: string,
): PublishRecord | undefined {
  return records.find(
    (record) => record.notePath === notePath && record.targetId === targetId,
  );
}

export function upsertRecord(
  records: PublishRecord[],
  nextRecord: PublishRecord,
): PublishRecord[] {
  const existingIndex = records.findIndex(
    (record) =>
      record.notePath === nextRecord.notePath &&
      record.targetId === nextRecord.targetId,
  );

  if (existingIndex === -1) {
    return [...records, nextRecord];
  }

  const next = records.slice();
  next[existingIndex] = nextRecord;
  return next;
}

export function removeRecord(
  records: PublishRecord[],
  notePath: string,
  targetId: string,
): PublishRecord[] {
  return records.filter(
    (record) => !(record.notePath === notePath && record.targetId === targetId),
  );
}

export function cloneTarget(target: PublishTargetConfig): PublishTargetConfig {
  return JSON.parse(JSON.stringify(target)) as PublishTargetConfig;
}

export function normalizeTarget(
  target: PublishTargetConfig,
): PublishTargetConfig {
  switch (target.provider) {
    case "wordpress":
      return getProviderDefinition("wordpress").normalizeTarget(target);
    case "wordpress-com":
      return getProviderDefinition("wordpress-com").normalizeTarget(
        target as MetaWeblogTargetConfig & { provider: "wordpress-com" },
      );
    case "metaweblog":
      return getProviderDefinition("metaweblog").normalizeTarget(
        target as MetaWeblogTargetConfig & { provider: "metaweblog" },
      );
    case "cnblogs":
      return getProviderDefinition("cnblogs").normalizeTarget(
        target as MetaWeblogTargetConfig & { provider: "cnblogs" },
      );
    case "typecho":
      return getProviderDefinition("typecho").normalizeTarget(
        target as MetaWeblogTargetConfig & { provider: "typecho" },
      );
    case "jvue":
      return getProviderDefinition("jvue").normalizeTarget(
        target as MetaWeblogTargetConfig & { provider: "jvue" },
      );
    case "yuque":
      return getProviderDefinition("yuque").normalizeTarget(target);
    case "notion":
      return getProviderDefinition("notion").normalizeTarget(target);
    case "halo":
      return getProviderDefinition("halo").normalizeTarget(target);
    case "telegraph":
      return getProviderDefinition("telegraph").normalizeTarget(target);
    case "confluence":
      return getProviderDefinition("confluence").normalizeTarget(target);
    case "zhihu":
      return getProviderDefinition("zhihu").normalizeTarget(target);
    case "csdn":
      return getProviderDefinition("csdn").normalizeTarget(target);
    case "juejin":
      return getProviderDefinition("juejin").normalizeTarget(target);
    case "jianshu":
      return getProviderDefinition("jianshu").normalizeTarget(target);
    case "wechat":
      return getProviderDefinition("wechat").normalizeTarget(target);
    case "halo-web":
      return getProviderDefinition("halo-web").normalizeTarget(target);
    case "bilibili":
      return getProviderDefinition("bilibili").normalizeTarget(target);
    case "xiaohongshu":
      return getProviderDefinition("xiaohongshu").normalizeTarget(target);
    case "github-hugo":
      return getProviderDefinition("github-hugo").normalizeTarget(target as GithubTargetConfig<"github-hugo">);
    case "github-hexo":
      return getProviderDefinition("github-hexo").normalizeTarget(target as GithubTargetConfig<"github-hexo">);
    case "github-jekyll":
      return getProviderDefinition("github-jekyll").normalizeTarget(target as GithubTargetConfig<"github-jekyll">);
    case "github-vuepress":
      return getProviderDefinition("github-vuepress").normalizeTarget(target as GithubTargetConfig<"github-vuepress">);
    case "github-vuepress2":
      return getProviderDefinition("github-vuepress2").normalizeTarget(target as GithubTargetConfig<"github-vuepress2">);
    case "github-vitepress":
      return getProviderDefinition("github-vitepress").normalizeTarget(target as GithubTargetConfig<"github-vitepress">);
    case "github-quartz":
      return getProviderDefinition("github-quartz").normalizeTarget(target as GithubTargetConfig<"github-quartz">);
    case "gitlab-hugo":
      return getProviderDefinition("gitlab-hugo").normalizeTarget(target as GitlabTargetConfig<"gitlab-hugo">);
    case "gitlab-hexo":
      return getProviderDefinition("gitlab-hexo").normalizeTarget(target as GitlabTargetConfig<"gitlab-hexo">);
    case "gitlab-jekyll":
      return getProviderDefinition("gitlab-jekyll").normalizeTarget(target as GitlabTargetConfig<"gitlab-jekyll">);
    case "gitlab-vuepress":
      return getProviderDefinition("gitlab-vuepress").normalizeTarget(target as GitlabTargetConfig<"gitlab-vuepress">);
    case "gitlab-vuepress2":
      return getProviderDefinition("gitlab-vuepress2").normalizeTarget(target as GitlabTargetConfig<"gitlab-vuepress2">);
    case "gitlab-vitepress":
      return getProviderDefinition("gitlab-vitepress").normalizeTarget(target as GitlabTargetConfig<"gitlab-vitepress">);
  }
}
