import { randomUUID } from "node:crypto";
import { ConfluenceTargetConfig, HaloTargetConfig, NotionTargetConfig, TelegraphTargetConfig } from "../../types";
import { ConfluenceProvider, HaloProvider, NotionProvider, TelegraphProvider } from "../apiProviders";
import { COMMON_FIELDS, defineSettingsForm, splitCommaSeparatedValue } from "./settingsForm";
import { ProviderDefinition, ProviderSettingsFieldDefinition } from "./types";

const NOTION_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "token", label: "Integration token", type: "password" },
  { key: "databaseId", label: "Database ID", description: "Required when publishing into a database.", type: "text" },
  { key: "parentPageId", label: "Parent page ID", description: "Used when database ID is empty.", type: "text" },
  { key: "notionVersion", label: "Notion API version", type: "text" },
];

const notionSettingsForm = defineSettingsForm<NotionTargetConfig>({
  fields: [...COMMON_FIELDS, ...NOTION_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "token":
        return target.token;
      case "databaseId":
        return target.databaseId;
      case "parentPageId":
        return target.parentPageId;
      case "notionVersion":
        return target.notionVersion;
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "token":
        target.token = String(value).trim();
        return target;
      case "databaseId":
        target.databaseId = String(value).trim();
        return target;
      case "parentPageId":
        target.parentPageId = String(value).trim();
        return target;
      case "notionVersion":
        target.notionVersion = String(value).trim() || "2022-06-28";
        return target;
      default:
        return target;
    }
  },
});

export const notionDefinition: ProviderDefinition<"notion"> = {
  id: "notion",
  name: "Notion",
  category: "common",
  family: "rest-api",
  capabilities: { publish: true, update: true, delete: true, media: "unsupported", normalPublish: false, quickPublish: true },
  createProvider: () => new NotionProvider(),
  createTarget: () => ({
    id: randomUUID(),
    name: "Notion",
    enabled: true,
    provider: "notion",
    token: "",
    databaseId: "",
    parentPageId: "",
    notionVersion: "2022-06-28",
  }),
  normalizeTarget: (target) => ({ ...target, token: target.token ?? "", databaseId: target.databaseId ?? "", parentPageId: target.parentPageId ?? "", notionVersion: target.notionVersion || "2022-06-28" }),
  settingsForm: notionSettingsForm,
};

const HALO_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "baseUrl", label: "Base URL", description: "Example: https://halo.example.com", type: "text" },
  { key: "token", label: "Token", type: "password" },
  { key: "defaultCategory", label: "Default category", type: "text" },
  { key: "defaultTags", label: "Default tags", description: "Comma-separated tag names.", type: "text" },
  { key: "defaultPublish", label: "Publish by default", type: "toggle" },
];

const haloSettingsForm = defineSettingsForm<HaloTargetConfig>({
  fields: [...COMMON_FIELDS, ...HALO_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "baseUrl":
        return target.baseUrl;
      case "token":
        return target.token;
      case "defaultCategory":
        return target.defaultCategory;
      case "defaultTags":
        return target.defaultTags.join(", ");
      case "defaultPublish":
        return target.defaultPublish;
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "baseUrl":
        target.baseUrl = String(value).trim();
        return target;
      case "token":
        target.token = String(value).trim();
        return target;
      case "defaultCategory":
        target.defaultCategory = String(value).trim();
        return target;
      case "defaultTags":
        target.defaultTags = splitCommaSeparatedValue(String(value));
        return target;
      case "defaultPublish":
        target.defaultPublish = Boolean(value);
        return target;
      default:
        return target;
    }
  },
});

export const haloDefinition: ProviderDefinition<"halo"> = {
  id: "halo",
  name: "Halo API",
  category: "common",
  family: "rest-api",
  capabilities: { publish: true, update: true, delete: true, media: "unsupported", normalPublish: false, quickPublish: true },
  createProvider: () => new HaloProvider(),
  createTarget: () => ({ id: randomUUID(), name: "Halo API", enabled: true, provider: "halo", baseUrl: "", token: "", defaultCategory: "", defaultTags: [], defaultPublish: false }),
  normalizeTarget: (target) => ({ ...target, baseUrl: target.baseUrl ?? "", token: target.token ?? "", defaultCategory: target.defaultCategory ?? "", defaultTags: Array.isArray(target.defaultTags) ? target.defaultTags : [], defaultPublish: Boolean(target.defaultPublish) }),
  settingsForm: haloSettingsForm,
};

const TELEGRAPH_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "accessToken", label: "Access token", type: "password" },
  { key: "authorName", label: "Author name", type: "text" },
];

const telegraphSettingsForm = defineSettingsForm<TelegraphTargetConfig>({
  fields: [...COMMON_FIELDS, ...TELEGRAPH_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "accessToken":
        return target.accessToken;
      case "authorName":
        return target.authorName;
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "accessToken":
        target.accessToken = String(value).trim();
        return target;
      case "authorName":
        target.authorName = String(value).trim();
        return target;
      default:
        return target;
    }
  },
});

export const telegraphDefinition: ProviderDefinition<"telegraph"> = {
  id: "telegraph",
  name: "Telegraph",
  category: "common",
  family: "rest-api",
  capabilities: { publish: true, update: true, delete: false, media: "unsupported", normalPublish: false, quickPublish: true },
  createProvider: () => new TelegraphProvider(),
  createTarget: () => ({ id: randomUUID(), name: "Telegraph", enabled: true, provider: "telegraph", accessToken: "", authorName: "" }),
  normalizeTarget: (target) => ({ ...target, accessToken: target.accessToken ?? "", authorName: target.authorName ?? "" }),
  settingsForm: telegraphSettingsForm,
};

const CONFLUENCE_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "baseUrl", label: "Base URL", description: "Example: https://example.atlassian.net/wiki", type: "text" },
  { key: "username", label: "Username", type: "text" },
  { key: "apiToken", label: "API token", type: "password" },
  { key: "spaceKey", label: "Space key", type: "text" },
  { key: "parentId", label: "Parent page ID", type: "text" },
];

const confluenceSettingsForm = defineSettingsForm<ConfluenceTargetConfig>({
  fields: [...COMMON_FIELDS, ...CONFLUENCE_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "baseUrl":
        return target.baseUrl;
      case "username":
        return target.username;
      case "apiToken":
        return target.apiToken;
      case "spaceKey":
        return target.spaceKey;
      case "parentId":
        return target.parentId;
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "baseUrl":
        target.baseUrl = String(value).trim();
        return target;
      case "username":
        target.username = String(value).trim();
        return target;
      case "apiToken":
        target.apiToken = String(value).trim();
        return target;
      case "spaceKey":
        target.spaceKey = String(value).trim();
        return target;
      case "parentId":
        target.parentId = String(value).trim();
        return target;
      default:
        return target;
    }
  },
});

export const confluenceDefinition: ProviderDefinition<"confluence"> = {
  id: "confluence",
  name: "Confluence",
  category: "common",
  family: "rest-api",
  capabilities: { publish: true, update: true, delete: true, media: "unsupported", normalPublish: false, quickPublish: true },
  createProvider: () => new ConfluenceProvider(),
  createTarget: () => ({ id: randomUUID(), name: "Confluence", enabled: true, provider: "confluence", baseUrl: "", username: "", apiToken: "", spaceKey: "", parentId: "" }),
  normalizeTarget: (target) => ({ ...target, baseUrl: target.baseUrl ?? "", username: target.username ?? "", apiToken: target.apiToken ?? "", spaceKey: target.spaceKey ?? "", parentId: target.parentId ?? "" }),
  settingsForm: confluenceSettingsForm,
};
