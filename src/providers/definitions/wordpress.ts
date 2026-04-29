import { randomUUID } from "node:crypto";
import { App } from "obsidian";
import { WordpressTargetConfig, WordpressStatus, PublishContentFormat } from "../../types";
import { WordpressProvider } from "../wordpressProvider";
import { cloneStringList } from "./shared";
import { COMMON_FIELDS, defineSettingsForm } from "./settingsForm";
import { ProviderDefinition, ProviderNormalPublishDefinition, ProviderSettingsFieldDefinition } from "./types";

const WORDPRESS_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "endpoint", label: "Endpoint", description: "Example: https://example.com", type: "text" },
  { key: "username", label: "Username", type: "text" },
  { key: "appPassword", label: "Application password", type: "password" },
  {
    key: "defaultStatus",
    label: "Default status",
    type: "dropdown",
    options: [
      { value: "draft", label: "Draft" },
      { value: "publish", label: "Publish" },
      { value: "private", label: "Private" },
      { value: "pending", label: "Pending" },
    ],
  },
  {
    key: "contentFormat",
    label: "Publish format",
    description: "Choose whether WordPress receives Markdown text or rendered HTML.",
    type: "dropdown",
    options: [
      { value: "markdown", label: "Markdown" },
      { value: "html", label: "HTML" },
    ],
  },
];

const settingsForm = defineSettingsForm<WordpressTargetConfig>({
  fields: [...COMMON_FIELDS, ...WORDPRESS_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "endpoint":
        return target.endpoint;
      case "username":
        return target.username;
      case "appPassword":
        return target.appPassword;
      case "defaultStatus":
        return target.defaultStatus;
      case "contentFormat":
        return target.contentFormat;
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "endpoint":
        target.endpoint = String(value).trim();
        return target;
      case "username":
        target.username = String(value).trim();
        return target;
      case "appPassword":
        target.appPassword = String(value).trim();
        return target;
      case "defaultStatus":
        target.defaultStatus = String(value) as WordpressStatus;
        return target;
      case "contentFormat":
        target.contentFormat = String(value) as PublishContentFormat;
        return target;
      default:
        return target;
    }
  },
});

const wordpressNormalPublish: ProviderNormalPublishDefinition<"wordpress"> = {
  supportedAiFields: ["title", "excerpt"],
  buildInitialDraft: (note, target) => ({
    provider: "wordpress",
    slug: note.slug,
    excerpt: note.excerpt,
    tags: cloneStringList(note.tags),
    categories: cloneStringList(note.categories),
    status: target.defaultStatus,
    password: "",
  }),
  getManualFallbackFields: () => ["categories", "tags"],
  applyDraftToNote: (note, draft) => ({
    ...note,
    slug: draft.slug,
    excerpt: draft.excerpt,
    tags: cloneStringList(draft.tags),
    categories: cloneStringList(draft.categories),
  }),
};

export const wordpressDefinition: ProviderDefinition<"wordpress"> = {
  id: "wordpress",
  name: "WordPress",
  category: "wordpress",
  family: "rest-api",
  capabilities: {
    publish: true,
    update: true,
    delete: true,
    media: "native-upload",
    normalPublish: true,
    quickPublish: true,
  },
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
  settingsForm,
  normalPublish: wordpressNormalPublish,
  buildInitialDraft: wordpressNormalPublish.buildInitialDraft,
  getManualFallbackFields: wordpressNormalPublish.getManualFallbackFields,
};
