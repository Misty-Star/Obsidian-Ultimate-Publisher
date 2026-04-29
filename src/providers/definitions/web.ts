import { randomUUID } from "node:crypto";
import { App } from "obsidian";
import { CsdnTargetConfig, JuejinTargetConfig, ZhihuTargetConfig } from "../../types";
import { CsdnProvider } from "../csdnProvider";
import { JuejinProvider } from "../juejinProvider";
import { ZhihuProvider } from "../zhihuProvider";
import { cloneStringList, normalizeStringList } from "./shared";
import {
  COMMON_FIELDS,
  WEB_AUTH_COMMON_FIELDS,
  defineSettingsForm,
  splitCommaSeparatedValue,
} from "./settingsForm";
import { ProviderDefinition, ProviderNormalPublishDefinition, ProviderSettingsFieldDefinition } from "./types";

const CSDN_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "defaultCategories", label: "Default categories", description: "Comma-separated category names.", type: "text" },
  { key: "defaultTags", label: "Default tags", description: "Comma-separated tag names.", type: "text" },
];

const JUEJIN_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "defaultCategoryId", label: "Default category ID", type: "text" },
  { key: "defaultTagIds", label: "Default tag IDs", description: "Comma-separated tag IDs.", type: "text" },
  { key: "defaultBriefContent", label: "Default brief content", type: "text" },
];

const zhihuSettingsForm = defineSettingsForm<ZhihuTargetConfig>({
  fields: [...COMMON_FIELDS, ...WEB_AUTH_COMMON_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "defaultColumnId":
        return target.defaultColumnId;
      case "defaultColumnTitle":
        return target.defaultColumnTitle ?? "";
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "defaultColumnId":
        target.defaultColumnId = String(value).trim();
        return target;
      case "defaultColumnTitle":
        target.defaultColumnTitle = String(value).trim();
        return target;
      default:
        return target;
    }
  },
});

const csdnSettingsForm = defineSettingsForm<CsdnTargetConfig>({
  fields: [...COMMON_FIELDS, ...WEB_AUTH_COMMON_FIELDS, ...CSDN_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "defaultCategories":
        return target.defaultCategories.join(", ");
      case "defaultTags":
        return target.defaultTags.join(", ");
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "defaultCategories":
        target.defaultCategories = splitCommaSeparatedValue(String(value));
        return target;
      case "defaultTags":
        target.defaultTags = splitCommaSeparatedValue(String(value));
        return target;
      default:
        return target;
    }
  },
});

const juejinSettingsForm = defineSettingsForm<JuejinTargetConfig>({
  fields: [...COMMON_FIELDS, ...WEB_AUTH_COMMON_FIELDS, ...JUEJIN_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "defaultCategoryId":
        return target.defaultCategoryId;
      case "defaultTagIds":
        return target.defaultTagIds.join(", ");
      case "defaultBriefContent":
        return target.defaultBriefContent;
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "defaultCategoryId":
        target.defaultCategoryId = String(value).trim();
        return target;
      case "defaultTagIds":
        target.defaultTagIds = splitCommaSeparatedValue(String(value));
        return target;
      case "defaultBriefContent":
        target.defaultBriefContent = String(value).trim();
        return target;
      default:
        return target;
    }
  },
});

const zhihuNormalPublish: ProviderNormalPublishDefinition<"zhihu"> = {
  supportedAiFields: ["title"],
  skipOptionsLoad: true,
  buildInitialDraft: (_note, target) => ({
    provider: "zhihu",
    columnId: target.defaultColumnId,
    columnTitle: target.defaultColumnTitle ?? "",
  }),
};

const csdnNormalPublish: ProviderNormalPublishDefinition<"csdn"> = {
  supportedAiFields: ["title", "excerpt"],
  buildInitialDraft: (note, target) => ({
    provider: "csdn",
    excerpt: note.excerpt,
    tags: note.tags.length > 0 ? cloneStringList(note.tags) : cloneStringList(target.defaultTags),
    categories: note.categories.length > 0 ? cloneStringList(note.categories) : cloneStringList(target.defaultCategories),
  }),
  getManualFallbackFields: () => ["categories", "tags"],
  applyDraftToNote: (note, draft) => ({
    ...note,
    excerpt: draft.excerpt,
    tags: cloneStringList(draft.tags),
    categories: cloneStringList(draft.categories),
  }),
};

const juejinNormalPublish: ProviderNormalPublishDefinition<"juejin"> = {
  supportedAiFields: ["title", "briefContent"],
  buildInitialDraft: (note, target) => ({
    provider: "juejin",
    categoryId: target.defaultCategoryId,
    categoryName: target.defaultCategoryName ?? "",
    tagIds: cloneStringList(target.defaultTagIds),
    tagNames: cloneStringList(target.defaultTagNames ?? []),
    briefContent: target.defaultBriefContent || note.excerpt,
  }),
  getManualFallbackFields: () => ["categoryId", "tagIds"],
  validateDraft: (draft) => {
    if (!draft.categoryId.trim()) {
      return "Juejin publish requires a categoryId.";
    }
    if (draft.tagIds.length === 0) {
      return "Juejin publish requires at least one tagId.";
    }
    return null;
  },
};

export const zhihuDefinition: ProviderDefinition<"zhihu"> = {
  id: "zhihu",
  name: "Zhihu",
  category: "web",
  family: "cookie-web",
  capabilities: {
    publish: true,
    update: true,
    delete: true,
    media: "unsupported",
    normalPublish: true,
    quickPublish: true,
    webAuth: true,
  },
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
  settingsForm: zhihuSettingsForm,
  normalPublish: zhihuNormalPublish,
  buildInitialDraft: zhihuNormalPublish.buildInitialDraft,
  skipNormalPublishOptionsLoad: zhihuNormalPublish.skipOptionsLoad,
};

export const csdnDefinition: ProviderDefinition<"csdn"> = {
  id: "csdn",
  name: "CSDN",
  category: "web",
  family: "cookie-web",
  capabilities: {
    publish: true,
    update: true,
    delete: true,
    media: "unsupported",
    normalPublish: true,
    quickPublish: true,
    webAuth: true,
  },
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
  settingsForm: csdnSettingsForm,
  normalPublish: csdnNormalPublish,
  buildInitialDraft: csdnNormalPublish.buildInitialDraft,
  getManualFallbackFields: csdnNormalPublish.getManualFallbackFields,
};

export const juejinDefinition: ProviderDefinition<"juejin"> = {
  id: "juejin",
  name: "Juejin",
  category: "web",
  family: "cookie-web",
  capabilities: {
    publish: true,
    update: true,
    delete: true,
    media: "unsupported",
    normalPublish: true,
    quickPublish: true,
    webAuth: true,
  },
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
  settingsForm: juejinSettingsForm,
  normalPublish: juejinNormalPublish,
  buildInitialDraft: juejinNormalPublish.buildInitialDraft,
  getManualFallbackFields: juejinNormalPublish.getManualFallbackFields,
};
