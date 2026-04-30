import { randomUUID } from "node:crypto";
import { App } from "obsidian";
import {
  MetaWeblogProviderId,
  MetaWeblogTargetConfig,
  PublishContentFormat,
  WordpressStatus,
} from "../../types";
import { MetaWeblogProvider } from "../metaWeblogProvider";
import { cloneStringList } from "./shared";
import { COMMON_FIELDS, defineSettingsForm } from "./settingsForm";
import {
  ProviderDefinition,
  ProviderNormalPublishDefinition,
  ProviderSettingsFieldDefinition,
} from "./types";

const META_WEBLOG_FIELDS: ProviderSettingsFieldDefinition[] = [
  {
    key: "endpoint",
    label: "XML-RPC endpoint",
    description: "Example: https://example.com/xmlrpc.php",
    type: "text",
  },
  { key: "username", label: "Username", type: "text" },
  { key: "appPassword", label: "Password or token", type: "password" },
  {
    key: "blogId",
    label: "Blog ID",
    description: "Use default when the platform exposes only one blog.",
    type: "text",
  },
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
    description:
      "Choose whether the XML-RPC post body receives Markdown text or rendered HTML.",
    type: "dropdown",
    options: [
      { value: "markdown", label: "Markdown" },
      { value: "html", label: "HTML" },
    ],
  },
];

const settingsForm = defineSettingsForm<MetaWeblogTargetConfig>({
  fields: [...COMMON_FIELDS, ...META_WEBLOG_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "endpoint":
        return target.endpoint;
      case "username":
        return target.username;
      case "appPassword":
        return target.appPassword;
      case "blogId":
        return target.blogId;
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
      case "blogId":
        target.blogId = String(value).trim();
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

const metaWeblogNormalPublish: ProviderNormalPublishDefinition<MetaWeblogProviderId> =
  {
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

const PROVIDER_NAMES: Record<MetaWeblogProviderId, string> = {
  "wordpress-com": "WordPress.com",
  metaweblog: "MetaWeblog",
  cnblogs: "CNBlogs",
  typecho: "Typecho",
  jvue: "Jvue",
};

function createTarget<TProvider extends MetaWeblogProviderId>(provider: TProvider): MetaWeblogTargetConfig<TProvider> {
  return {
    id: randomUUID(),
    name: PROVIDER_NAMES[provider],
    enabled: true,
    provider,
    endpoint: "",
    username: "",
    appPassword: "",
    blogId: "default",
    defaultStatus: "draft",
    contentFormat: "html",
  };
}

function normalizeTarget<TProvider extends MetaWeblogProviderId>(
  target: MetaWeblogTargetConfig & { provider: TProvider },
): MetaWeblogTargetConfig & { provider: TProvider } {
  return {
    ...target,
    endpoint: target.endpoint ?? "",
    username: target.username ?? "",
    appPassword: target.appPassword ?? "",
    blogId: target.blogId || "default",
    defaultStatus: (target.defaultStatus ?? "draft") as WordpressStatus,
    contentFormat: (target.contentFormat ?? "html") as PublishContentFormat,
  };
}

function defineMetaWeblogProvider<TProvider extends MetaWeblogProviderId>(
  provider: TProvider,
): ProviderDefinition<TProvider> {
  return {
    id: provider,
    name: PROVIDER_NAMES[provider],
    category: "metaweblog",
    family: "xml-rpc",
    capabilities: {
      publish: true,
      update: true,
      delete: true,
      media: "unsupported",
      normalPublish: true,
      quickPublish: true,
    },
    createProvider: ((app: App) =>
      new MetaWeblogProvider(
        app,
        provider,
      )) as unknown as ProviderDefinition<TProvider>["createProvider"],
    createTarget: (() =>
      createTarget(provider)) as unknown as ProviderDefinition<TProvider>["createTarget"],
    normalizeTarget:
      normalizeTarget as unknown as ProviderDefinition<TProvider>["normalizeTarget"],
    settingsForm: settingsForm as ProviderDefinition<TProvider>["settingsForm"],
    normalPublish:
      metaWeblogNormalPublish as unknown as ProviderDefinition<TProvider>["normalPublish"],
    buildInitialDraft:
      metaWeblogNormalPublish.buildInitialDraft as unknown as ProviderDefinition<TProvider>["buildInitialDraft"],
    getManualFallbackFields:
      metaWeblogNormalPublish.getManualFallbackFields as unknown as ProviderDefinition<TProvider>["getManualFallbackFields"],
  };
}

export const wordpressComDefinition = defineMetaWeblogProvider("wordpress-com");
export const metaweblogDefinition = defineMetaWeblogProvider("metaweblog");
export const cnblogsDefinition = defineMetaWeblogProvider("cnblogs");
export const typechoDefinition = defineMetaWeblogProvider("typecho");
export const jvueDefinition = defineMetaWeblogProvider("jvue");
