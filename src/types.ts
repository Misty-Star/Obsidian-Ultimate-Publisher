export const SUPPORTED_PROVIDER_IDS = [
  "wordpress",
  "wordpress-com",
  "metaweblog",
  "cnblogs",
  "typecho",
  "jvue",
  "yuque",
  "notion",
  "halo",
  "telegraph",
  "confluence",
  "zhihu",
  "csdn",
  "juejin",
  "jianshu",
  "wechat",
  "halo-web",
  "bilibili",
  "xiaohongshu",
  "github-hugo",
  "github-hexo",
  "github-jekyll",
  "github-vuepress",
  "github-vuepress2",
  "github-vitepress",
  "github-quartz",
  "gitlab-hugo",
  "gitlab-hexo",
  "gitlab-jekyll",
  "gitlab-vuepress",
  "gitlab-vuepress2",
  "gitlab-vitepress",
] as const;

export type ProviderId = (typeof SUPPORTED_PROVIDER_IDS)[number];
export type ProviderCategory = "common" | "wordpress" | "metaweblog" | "github" | "gitlab" | "web";
export type ProviderFamilyId = "rest-api" | "xml-rpc" | "cookie-web" | "github-static-site" | "gitlab-static-site";

export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" &&
    (SUPPORTED_PROVIDER_IDS as readonly string[]).includes(value)
  );
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

export type MetaWeblogProviderId = "wordpress-com" | "metaweblog" | "cnblogs" | "typecho" | "jvue";

export interface MetaWeblogTargetConfig<TProvider extends MetaWeblogProviderId = MetaWeblogProviderId> extends BaseTargetConfig {
  provider: TProvider;
  endpoint: string;
  username: string;
  appPassword: string;
  blogId: string;
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

export interface NotionTargetConfig extends BaseTargetConfig {
  provider: "notion";
  token: string;
  databaseId: string;
  parentPageId: string;
  notionVersion: string;
}

export interface HaloTargetConfig extends BaseTargetConfig {
  provider: "halo";
  baseUrl: string;
  token: string;
  defaultCategory: string;
  defaultTags: string[];
  defaultPublish: boolean;
}

export interface TelegraphTargetConfig extends BaseTargetConfig {
  provider: "telegraph";
  accessToken: string;
  authorName: string;
}

export interface ConfluenceTargetConfig extends BaseTargetConfig {
  provider: "confluence";
  baseUrl: string;
  username: string;
  apiToken: string;
  spaceKey: string;
  parentId: string;
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

export interface JianshuTargetConfig extends WebAuthTargetBase {
  provider: "jianshu";
}

export interface WechatTargetConfig extends WebAuthTargetBase {
  provider: "wechat";
}

export interface HaloWebTargetConfig extends WebAuthTargetBase {
  provider: "halo-web";
  baseUrl: string;
}

export interface BilibiliTargetConfig extends WebAuthTargetBase {
  provider: "bilibili";
}

export interface XiaohongshuTargetConfig extends WebAuthTargetBase {
  provider: "xiaohongshu";
}

export type StaticSiteGenerator =
  | "hugo"
  | "hexo"
  | "jekyll"
  | "vuepress"
  | "vuepress2"
  | "vitepress"
  | "quartz";

export type GithubStaticSiteProviderId =
  | "github-hugo"
  | "github-hexo"
  | "github-jekyll"
  | "github-vuepress"
  | "github-vuepress2"
  | "github-vitepress"
  | "github-quartz";

export type GitlabStaticSiteProviderId =
  | "gitlab-hugo"
  | "gitlab-hexo"
  | "gitlab-jekyll"
  | "gitlab-vuepress"
  | "gitlab-vuepress2"
  | "gitlab-vitepress";

export interface GithubTargetConfig<TProvider extends GithubStaticSiteProviderId = GithubStaticSiteProviderId> extends BaseTargetConfig {
  provider: TProvider;
  siteGenerator: StaticSiteGenerator;
  owner: string;
  repo: string;
  branch: string;
  contentRoot: string;
  token: string;
  commitMessageTemplate: string;
  previewBaseUrl?: string;
}

export interface GitlabTargetConfig<TProvider extends GitlabStaticSiteProviderId = GitlabStaticSiteProviderId> extends BaseTargetConfig {
  provider: TProvider;
  siteGenerator: StaticSiteGenerator;
  baseUrl: string;
  projectIdOrPath: string;
  branch: string;
  contentRoot: string;
  token: string;
  commitMessageTemplate: string;
  previewBaseUrl?: string;
}

export type PublishTargetConfig =
  | WordpressTargetConfig
  | MetaWeblogTargetConfig
  | YuqueTargetConfig
  | NotionTargetConfig
  | HaloTargetConfig
  | TelegraphTargetConfig
  | ConfluenceTargetConfig
  | ZhihuTargetConfig
  | CsdnTargetConfig
  | JuejinTargetConfig
  | JianshuTargetConfig
  | WechatTargetConfig
  | HaloWebTargetConfig
  | BilibiliTargetConfig
  | XiaohongshuTargetConfig
  | GithubTargetConfig
  | GitlabTargetConfig;
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
