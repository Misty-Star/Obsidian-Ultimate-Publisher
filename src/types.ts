export type ProviderId = "wordpress" | "yuque" | "local-export" | "zhihu" | "csdn" | "juejin";

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

export interface LocalExportTargetConfig extends BaseTargetConfig {
  provider: "local-export";
  outputDir: string;
  yamlType: "default" | "hexo";
  assetDirName: string;
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

export type PublishTargetConfig =
  | WordpressTargetConfig
  | YuqueTargetConfig
  | LocalExportTargetConfig
  | ZhihuTargetConfig
  | CsdnTargetConfig
  | JuejinTargetConfig;

export interface UltimatePublisherSettings {
  targets: PublishTargetConfig[];
  records: PublishRecord[];
}
