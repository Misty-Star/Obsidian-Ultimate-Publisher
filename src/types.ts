export type ProviderId = "wordpress" | "yuque" | "local-export";

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

export type PublishTargetConfig = WordpressTargetConfig | YuqueTargetConfig | LocalExportTargetConfig;

export interface UltimatePublisherSettings {
  targets: PublishTargetConfig[];
  records: PublishRecord[];
}
