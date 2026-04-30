import { App } from "obsidian";
import { PublishableNote } from "../../core/note";
import { MediaSupportMode, PublisherProvider } from "../../core/providers";
import {
  CommonPublishDraft,
  CsdnPublishDraft,
  JuejinPublishDraft,
  NormalPublishAiField,
  ProviderPublishDraft,
  WordpressPublishDraft,
  YuquePublishDraft,
  ZhihuPublishDraft,
} from "../../core/normalPublish/types";
import { Translator } from "../../i18n";
import {
  BilibiliTargetConfig,
  ConfluenceTargetConfig,
  CsdnTargetConfig,
  GithubTargetConfig,
  GitlabTargetConfig,
  HaloTargetConfig,
  HaloWebTargetConfig,
  JianshuTargetConfig,
  JuejinTargetConfig,
  LocalFilesystemTargetConfig,
  MetaWeblogTargetConfig,
  NotionTargetConfig,
  ProviderCategory,
  ProviderFamilyId,
  ProviderId,
  PublishTargetConfig,
  TelegraphTargetConfig,
  WechatTargetConfig,
  WordpressTargetConfig,
  XiaohongshuTargetConfig,
  YuqueTargetConfig,
  ZhihuTargetConfig,
} from "../../types";

export type ProviderTargetById = {
  wordpress: WordpressTargetConfig;
  "wordpress-com": MetaWeblogTargetConfig<"wordpress-com">;
  metaweblog: MetaWeblogTargetConfig<"metaweblog">;
  cnblogs: MetaWeblogTargetConfig<"cnblogs">;
  typecho: MetaWeblogTargetConfig<"typecho">;
  jvue: MetaWeblogTargetConfig<"jvue">;
  yuque: YuqueTargetConfig;
  notion: NotionTargetConfig;
  halo: HaloTargetConfig;
  telegraph: TelegraphTargetConfig;
  confluence: ConfluenceTargetConfig;
  zhihu: ZhihuTargetConfig;
  csdn: CsdnTargetConfig;
  juejin: JuejinTargetConfig;
  jianshu: JianshuTargetConfig;
  wechat: WechatTargetConfig;
  "halo-web": HaloWebTargetConfig;
  bilibili: BilibiliTargetConfig;
  xiaohongshu: XiaohongshuTargetConfig;
  github: GithubTargetConfig;
  gitlab: GitlabTargetConfig;
  "local-filesystem": LocalFilesystemTargetConfig;
};

export type ProviderDraftById = {
  wordpress: WordpressPublishDraft;
  "wordpress-com": WordpressPublishDraft;
  metaweblog: WordpressPublishDraft;
  cnblogs: WordpressPublishDraft;
  typecho: WordpressPublishDraft;
  jvue: WordpressPublishDraft;
  yuque: YuquePublishDraft;
  notion: never;
  halo: never;
  telegraph: never;
  confluence: never;
  zhihu: ZhihuPublishDraft;
  csdn: CsdnPublishDraft;
  juejin: JuejinPublishDraft;
  jianshu: never;
  wechat: never;
  "halo-web": never;
  bilibili: never;
  xiaohongshu: never;
  github: never;
  gitlab: never;
  "local-filesystem": never;
};

export type ProviderCapabilityFlag =
  | "publish"
  | "update"
  | "delete"
  | "native-media-upload"
  | "local-copy-media"
  | "normal-publish"
  | "quick-publish"
  | "web-auth";

export interface ProviderCapabilities {
  publish: boolean;
  update: boolean;
  delete: boolean;
  media: MediaSupportMode;
  normalPublish: boolean;
  quickPublish?: boolean;
  webAuth?: boolean;
}

export type ProviderSettingsFieldKey =
  | "enabled"
  | "name"
  | "cookie"
  | "endpoint"
  | "username"
  | "appPassword"
  | "blogId"
  | "defaultStatus"
  | "contentFormat"
  | "baseUrl"
  | "repo"
  | "token"
  | "publicLevel"
  | "databaseId"
  | "parentPageId"
  | "notionVersion"
  | "accessToken"
  | "authorName"
  | "defaultCategory"
  | "defaultPublish"
  | "apiToken"
  | "spaceKey"
  | "parentId"
  | "defaultColumnId"
  | "defaultColumnTitle"
  | "defaultCategories"
  | "defaultTags"
  | "defaultCategoryId"
  | "defaultTagIds"
  | "defaultBriefContent"
  | "siteGenerator"
  | "owner"
  | "branch"
  | "contentRoot"
  | "commitMessageTemplate"
  | "previewBaseUrl"
  | "projectIdOrPath"
  | "localOutputPath"
  | "overwriteExisting";

export type ProviderSettingsFieldType =
  | "toggle"
  | "text"
  | "password"
  | "dropdown";

export interface ProviderSettingsFieldOption {
  value: string;
  label: string;
}

export interface ProviderSettingsFieldDefinition {
  key: ProviderSettingsFieldKey;
  label: string;
  description?: string;
  type: ProviderSettingsFieldType;
  options?: ProviderSettingsFieldOption[];
}

export interface ProviderSettingsForm<TTarget extends PublishTargetConfig> {
  getFields(
    target: TTarget,
    i18n: Translator,
  ): ProviderSettingsFieldDefinition[];
  readFieldValue(
    target: TTarget,
    key: ProviderSettingsFieldKey,
  ): string | boolean;
  applyFieldValue(
    target: TTarget,
    key: ProviderSettingsFieldKey,
    value: string | boolean,
  ): TTarget;
}

export interface ProviderNormalPublishDefinition<TId extends ProviderId> {
  buildInitialDraft: (
    note: PublishableNote,
    target: ProviderTargetById[TId],
  ) => ProviderDraftById[TId];
  skipOptionsLoad?: boolean;
  getManualFallbackFields?: (target: ProviderTargetById[TId]) => string[];
  supportedAiFields: NormalPublishAiField[];
  validateDraft?: (draft: ProviderDraftById[TId]) => string | null;
  applyDraftToNote?: (
    note: PublishableNote,
    draft: ProviderDraftById[TId],
    common: CommonPublishDraft,
  ) => PublishableNote;
}

export interface ProviderDefinition<TId extends ProviderId> {
  id: TId;
  name: string;
  category: ProviderCategory;
  family: ProviderFamilyId;
  capabilities: ProviderCapabilities;
  createProvider: (app: App) => PublisherProvider<ProviderTargetById[TId]>;
  createTarget: () => ProviderTargetById[TId];
  normalizeTarget: (target: ProviderTargetById[TId]) => ProviderTargetById[TId];
  settingsForm: ProviderSettingsForm<ProviderTargetById[TId]>;
  normalPublish?: ProviderNormalPublishDefinition<TId>;
  /** @deprecated Use normalPublish.buildInitialDraft. Kept for compatibility while callers migrate. */
  buildInitialDraft?: ProviderNormalPublishDefinition<TId>["buildInitialDraft"];
  /** @deprecated Use normalPublish.skipOptionsLoad. Kept for compatibility while callers migrate. */
  skipNormalPublishOptionsLoad?: boolean;
  /** @deprecated Use normalPublish.getManualFallbackFields. Kept for compatibility while callers migrate. */
  getManualFallbackFields?: ProviderNormalPublishDefinition<TId>["getManualFallbackFields"];
}

export type ProviderDefinitionMap = {
  [TId in ProviderId]: ProviderDefinition<TId>;
};

export type AnyProviderDefinition = ProviderDefinitionMap[ProviderId];

export function hasNormalPublishDefinition<TId extends ProviderId>(
  definition: ProviderDefinition<TId>,
): definition is ProviderDefinition<TId> & {
  normalPublish: ProviderNormalPublishDefinition<TId>;
} {
  return Boolean(definition.normalPublish);
}

export type AnyProviderPublishDraft = ProviderPublishDraft;
