import { randomUUID } from "node:crypto";
import { App } from "obsidian";
import { PublishableNote } from "../core/note";
import { PublisherProvider } from "../core/providers";
import { ProviderPublishDraft } from "../core/normalPublish/types";
import {
  CsdnTargetConfig,
  JuejinTargetConfig,
  ProviderCategory,
  ProviderFamilyId,
  ProviderId,
  PublishContentFormat,
  WordpressTargetConfig,
  YuqueTargetConfig,
  ZhihuTargetConfig,
} from "../types";
import { CsdnProvider } from "./csdnProvider";
import { JuejinProvider } from "./juejinProvider";
import { WordpressProvider } from "./wordpressProvider";
import { YuqueProvider } from "./yuqueProvider";
import { ZhihuProvider } from "./zhihuProvider";

type ProviderTargetById = {
  wordpress: WordpressTargetConfig;
  yuque: YuqueTargetConfig;
  zhihu: ZhihuTargetConfig;
  csdn: CsdnTargetConfig;
  juejin: JuejinTargetConfig;
};

export interface ProviderDefinition<TId extends ProviderId> {
  id: TId;
  name: string;
  category: ProviderCategory;
  family: ProviderFamilyId;
  createProvider: (app: App) => PublisherProvider<ProviderTargetById[TId]>;
  createTarget: () => ProviderTargetById[TId];
  normalizeTarget: (target: ProviderTargetById[TId]) => ProviderTargetById[TId];
  buildInitialDraft?: (note: PublishableNote, target: ProviderTargetById[TId]) => ProviderPublishDraft;
  skipNormalPublishOptionsLoad?: boolean;
  getManualFallbackFields?: (target: ProviderTargetById[TId]) => string[];
}

type ProviderDefinitionMap = {
  [TId in ProviderId]: ProviderDefinition<TId>;
};
type AnyProviderDefinition = ProviderDefinitionMap[ProviderId];

function cloneStringList(values: string[]): string[] {
  return values.slice();
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

const providerDefinitionsById: ProviderDefinitionMap = {
  wordpress: {
    id: "wordpress",
    name: "WordPress",
    category: "wordpress",
    family: "rest-api",
    createProvider: (app: App) => new WordpressProvider(app),
    createTarget: () => ({
      id: randomUUID(),
      name: "WordPress",
      enabled: true,
      provider: "wordpress",
      endpoint: "",
      username: "",
      appPassword: "",
      defaultStatus: "draft",
      contentFormat: "html",
    }),
    normalizeTarget: (target: WordpressTargetConfig) => ({
      ...target,
      defaultStatus: target.defaultStatus ?? "draft",
      contentFormat: (target.contentFormat ?? "html") as PublishContentFormat,
    }),
    buildInitialDraft: (note: PublishableNote, target: WordpressTargetConfig) => ({
      provider: "wordpress",
      slug: note.slug,
      excerpt: note.excerpt,
      tags: cloneStringList(note.tags),
      categories: cloneStringList(note.categories),
      status: target.defaultStatus,
      password: "",
    }),
    getManualFallbackFields: () => ["categories", "tags"],
  },
  yuque: {
    id: "yuque",
    name: "Yuque",
    category: "common",
    family: "rest-api",
    createProvider: () => new YuqueProvider(),
    createTarget: () => ({
      id: randomUUID(),
      name: "Yuque",
      enabled: true,
      provider: "yuque",
      baseUrl: "https://www.yuque.com",
      repo: "",
      token: "",
      publicLevel: 0,
    }),
    normalizeTarget: (target: YuqueTargetConfig) => ({
      ...target,
      baseUrl: target.baseUrl || "https://www.yuque.com",
      publicLevel: target.publicLevel ?? 0,
    }),
    buildInitialDraft: (note: PublishableNote, target: YuqueTargetConfig) => ({
      provider: "yuque",
      slug: note.slug,
      publicLevel: target.publicLevel,
    }),
  },
  zhihu: {
    id: "zhihu",
    name: "Zhihu",
    category: "web",
    family: "cookie-web",
    createProvider: (app: App) => new ZhihuProvider(app),
    createTarget: () => ({
      id: randomUUID(),
      name: "Zhihu",
      enabled: true,
      provider: "zhihu",
      cookie: "",
      defaultColumnId: "",
      defaultColumnTitle: "",
    }),
    normalizeTarget: (target: ZhihuTargetConfig) => ({
      ...target,
      cookie: target.cookie || "",
      defaultColumnId: target.defaultColumnId || "",
      defaultColumnTitle: target.defaultColumnTitle || "",
    }),
    buildInitialDraft: (_note: PublishableNote, target: ZhihuTargetConfig) => ({
      provider: "zhihu",
      columnId: target.defaultColumnId,
      columnTitle: target.defaultColumnTitle ?? "",
    }),
    skipNormalPublishOptionsLoad: true,
  },
  csdn: {
    id: "csdn",
    name: "CSDN",
    category: "web",
    family: "cookie-web",
    createProvider: (app: App) => new CsdnProvider(app),
    createTarget: () => ({
      id: randomUUID(),
      name: "CSDN",
      enabled: true,
      provider: "csdn",
      cookie: "",
      defaultCategories: [],
      defaultTags: [],
    }),
    normalizeTarget: (target: CsdnTargetConfig) => ({
      ...target,
      cookie: target.cookie || "",
      defaultCategories: normalizeStringList(target.defaultCategories),
      defaultTags: normalizeStringList(target.defaultTags),
    }),
    buildInitialDraft: (note: PublishableNote, target: CsdnTargetConfig) => ({
      provider: "csdn",
      excerpt: note.excerpt,
      tags: note.tags.length > 0 ? cloneStringList(note.tags) : cloneStringList(target.defaultTags),
      categories: note.categories.length > 0 ? cloneStringList(note.categories) : cloneStringList(target.defaultCategories),
    }),
    getManualFallbackFields: () => ["categories", "tags"],
  },
  juejin: {
    id: "juejin",
    name: "Juejin",
    category: "web",
    family: "cookie-web",
    createProvider: () => new JuejinProvider(),
    createTarget: () => ({
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
    }),
    normalizeTarget: (target: JuejinTargetConfig) => ({
      ...target,
      cookie: target.cookie || "",
      defaultCategoryId: target.defaultCategoryId || "",
      defaultCategoryName: target.defaultCategoryName || "",
      defaultTagIds: normalizeStringList(target.defaultTagIds),
      defaultTagNames: normalizeStringList(target.defaultTagNames),
      defaultBriefContent: target.defaultBriefContent || "",
    }),
    buildInitialDraft: (note: PublishableNote, target: JuejinTargetConfig) => ({
      provider: "juejin",
      categoryId: target.defaultCategoryId,
      categoryName: target.defaultCategoryName ?? "",
      tagIds: cloneStringList(target.defaultTagIds),
      tagNames: cloneStringList(target.defaultTagNames ?? []),
      briefContent: target.defaultBriefContent || note.excerpt,
    }),
    getManualFallbackFields: () => ["categoryId", "tagIds"],
  },
};

const providerDisplayOrder: ProviderId[] = ["wordpress", "yuque", "zhihu", "csdn", "juejin"];

export function getProviderDefinitions(): AnyProviderDefinition[] {
  return providerDisplayOrder.map((providerId) => providerDefinitionsById[providerId]);
}

export function getProviderDefinition<TId extends ProviderId>(providerId: TId): ProviderDefinitionMap[TId] {
  return providerDefinitionsById[providerId];
}
