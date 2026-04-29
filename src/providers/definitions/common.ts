import { randomUUID } from "node:crypto";
import { YuqueTargetConfig } from "../../types";
import { YuqueProvider } from "../yuqueProvider";
import { COMMON_FIELDS, defineSettingsForm } from "./settingsForm";
import { ProviderDefinition, ProviderNormalPublishDefinition, ProviderSettingsFieldDefinition } from "./types";

const YUQUE_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "baseUrl", label: "Base URL", type: "text" },
  { key: "repo", label: "Repo", description: "Example: namespace/repo", type: "text" },
  { key: "token", label: "Token", type: "password" },
  {
    key: "publicLevel",
    label: "Public level",
    description: "0 = private, 1 = public",
    type: "dropdown",
    options: [
      { value: "0", label: "Private" },
      { value: "1", label: "Public" },
    ],
  },
];

const settingsForm = defineSettingsForm<YuqueTargetConfig>({
  fields: [...COMMON_FIELDS, ...YUQUE_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "baseUrl":
        return target.baseUrl;
      case "repo":
        return target.repo;
      case "token":
        return target.token;
      case "publicLevel":
        return String(target.publicLevel);
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "baseUrl":
        target.baseUrl = String(value).trim();
        return target;
      case "repo":
        target.repo = String(value).trim();
        return target;
      case "token":
        target.token = String(value).trim();
        return target;
      case "publicLevel":
        target.publicLevel = Number(value) === 1 ? 1 : 0;
        return target;
      default:
        return target;
    }
  },
});

const yuqueNormalPublish: ProviderNormalPublishDefinition<"yuque"> = {
  supportedAiFields: ["title"],
  buildInitialDraft: (note, target) => ({
    provider: "yuque",
    slug: note.slug,
    publicLevel: target.publicLevel,
  }),
  applyDraftToNote: (note, draft) => ({
    ...note,
    slug: draft.slug,
  }),
};

export const yuqueDefinition: ProviderDefinition<"yuque"> = {
  id: "yuque",
  name: "Yuque",
  category: "common",
  family: "rest-api",
  capabilities: {
    publish: true,
    update: true,
    delete: true,
    media: "unsupported",
    normalPublish: true,
    quickPublish: true,
  },
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
  settingsForm,
  normalPublish: yuqueNormalPublish,
  buildInitialDraft: yuqueNormalPublish.buildInitialDraft,
};
