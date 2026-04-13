import { randomUUID } from "node:crypto";
import { PublishableNote } from "../core/note";
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
  createTarget: () => ProviderTargetById[TId];
  normalizeTarget: (target: ProviderTargetById[TId]) => ProviderTargetById[TId];
  buildInitialDraft?: (note: PublishableNote, target: ProviderTargetById[TId]) => ProviderPublishDraft;
  skipNormalPublishOptionsLoad?: boolean;
  getManualFallbackFields?: (target: ProviderTargetById[TId]) => string[];
}

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

const providerDefinitions = [
  {
    id: "wordpress",
    name: "WordPress",
    category: "wordpress",
    family: "rest-api",
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
  } satisfies ProviderDefinition<"wordpress">,
  {
    id: "yuque",
    name: "Yuque",
    category: "common",
    family: "rest-api",
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
  } satisfies ProviderDefinition<"yuque">,
  {
    id: "zhihu",
    name: "Zhihu",
    category: "web",
    family: "cookie-web",
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
  } satisfies ProviderDefinition<"zhihu">,
  {
    id: "csdn",
    name: "CSDN",
    category: "web",
    family: "cookie-web",
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
  } satisfies ProviderDefinition<"csdn">,
  {
    id: "juejin",
    name: "Juejin",
    category: "web",
    family: "cookie-web",
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
  } satisfies ProviderDefinition<"juejin">,
] as const;

const providerDefinitionById: Record<ProviderId, ProviderDefinition<ProviderId>> = Object.fromEntries(
  providerDefinitions.map((definition) => [definition.id, definition])
) as Record<ProviderId, ProviderDefinition<ProviderId>>;

export function getProviderDefinitions(): ProviderDefinition<ProviderId>[] {
  return providerDefinitions as unknown as ProviderDefinition<ProviderId>[];
}

export function getProviderDefinition<TId extends ProviderId>(providerId: TId): ProviderDefinition<TId> {
  const definition = providerDefinitionById[providerId];
  if (!definition) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
  return definition as ProviderDefinition<TId>;
}
