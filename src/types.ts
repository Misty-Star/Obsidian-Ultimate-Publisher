export const SUPPORTED_PROVIDER_IDS = [
  "wordpress",
  "yuque",
  "zhihu",
  "csdn",
  "juejin",
  "github",
  "gitlab",
  "local-filesystem",
] as const;

export type ProviderId = (typeof SUPPORTED_PROVIDER_IDS)[number];
export type ProviderCategory = "common" | "wordpress" | "metaweblog" | "github" | "gitlab" | "web" | "filesystem";
export type ProviderFamilyId = "rest-api" | "cookie-web" | "github-static-site" | "gitlab-static-site" | "filesystem-local";

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (SUPPORTED_PROVIDER_IDS as readonly string[]).includes(value);
}

export type WordpressStatus = "draft" | "publish" | "private" | "pending";
export type PublishContentFormat = "markdown" | "html";

export interface PublishRecord {
  notePath: string;
  provider: ProviderId;
  targetId: string;
  remoteId: string;
  remoteUrl?: string;
  lastPublishedAt: string;
  contentHash: string;
}

export interface BaseTargetConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: ProviderId;
}

export type WebAuthSource = "browser" | "manual";

export interface WebAuthTargetBase extends BaseTargetConfig {
  cookie: string;
  authSource?: WebAuthSource;
  lastAuthAt?: string;
  lastValidatedAt?: string;
  accountId?: string;
  accountName?: string;
  accountAvatarUrl?: string;
}

export interface WordpressTargetConfig extends BaseTargetConfig {
  provider: "wordpress";
  endpoint: string;
  username: string;
  appPassword: string;
  defaultStatus: WordpressStatus;
  contentFormat: PublishContentFormat;
}

export interface YuqueTargetConfig extends BaseTargetConfig {
  provider: "yuque";
  baseUrl: string;
  repo: string;
  token: string;
  publicLevel: 0 | 1;
}

export interface ZhihuTargetConfig extends WebAuthTargetBase {
  provider: "zhihu";
  defaultColumnId: string;
  defaultColumnTitle?: string;
}

export interface CsdnTargetConfig extends WebAuthTargetBase {
  provider: "csdn";
  defaultCategories: string[];
  defaultTags: string[];
}

export interface JuejinTargetConfig extends WebAuthTargetBase {
  provider: "juejin";
  defaultCategoryId: string;
  defaultCategoryName?: string;
  defaultTagIds: string[];
  defaultTagNames?: string[];
  defaultBriefContent: string;
}

export type StaticSiteGenerator = "hugo" | "hexo" | "jekyll" | "vuepress" | "vuepress2" | "vitepress" | "quartz";

export interface GithubTargetConfig extends BaseTargetConfig {
  provider: "github";
  siteGenerator: StaticSiteGenerator;
  owner: string;
  repo: string;
  branch: string;
  contentRoot: string;
  token: string;
  commitMessageTemplate: string;
  previewBaseUrl?: string;
}

export interface GitlabTargetConfig extends BaseTargetConfig {
  provider: "gitlab";
  siteGenerator: StaticSiteGenerator;
  baseUrl: string;
  projectIdOrPath: string;
  branch: string;
  contentRoot: string;
  token: string;
  commitMessageTemplate: string;
  previewBaseUrl?: string;
}

export interface LocalFilesystemTargetConfig extends BaseTargetConfig {
  provider: "local-filesystem";
  localOutputPath: string;
  siteGenerator: StaticSiteGenerator;
  overwriteExisting: boolean;
}

export type PublishTargetConfig =
  | WordpressTargetConfig
  | YuqueTargetConfig
  | ZhihuTargetConfig
  | CsdnTargetConfig
  | JuejinTargetConfig
  | GithubTargetConfig
  | GitlabTargetConfig
  | LocalFilesystemTargetConfig;
export type LlmVendor = "openai" | "openai-compatible" | "anthropic" | "gemini";

export interface LlmSettings {
  enabled: boolean;
  vendor: LlmVendor;
  apiKey: string;
  model: string;
  endpointOverride?: string;
  temperature: number;
  timeoutMs: number;
  maxInputChars: number;
}

export interface FrontmatterAutomationSettings {
  enabled: boolean;
  includeOptionComments: boolean;
}

export interface CachedProviderOption {
  id: string;
  label: string;
  description?: string;
}

export interface JuejinProviderOptionCacheEntry {
  fetchedAt: string;
  categories: CachedProviderOption[];
  tags: CachedProviderOption[];
}

export interface ProviderOptionCache {
  juejinByTargetId: Record<string, JuejinProviderOptionCacheEntry>;
}

export interface UltimatePublisherSettings {
  targets: PublishTargetConfig[];
  records: PublishRecord[];
  frontmatterAutomation?: FrontmatterAutomationSettings;
  providerOptionCache?: ProviderOptionCache;
  llm?: LlmSettings;
}
