import { randomUUID } from "node:crypto";
import { App } from "obsidian";
import { LocalFilesystemTargetConfig, StaticSiteGenerator } from "../../types";
import { LocalFilesystemProvider } from "../localFilesystemProvider";
import { COMMON_FIELDS, defineSettingsForm } from "./settingsForm";
import { ProviderDefinition, ProviderSettingsFieldDefinition } from "./types";

const GENERATOR_OPTIONS: { value: StaticSiteGenerator; label: string }[] = [
  { value: "hugo", label: "Hugo" },
  { value: "hexo", label: "Hexo" },
  { value: "jekyll", label: "Jekyll" },
  { value: "vuepress", label: "VuePress" },
  { value: "vuepress2", label: "VuePress 2" },
  { value: "vitepress", label: "VitePress" },
  { value: "quartz", label: "Quartz" },
];

const LOCAL_FILESYSTEM_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "localOutputPath", label: "Output folder", description: "Vault-relative folder for exported Markdown files.", type: "text" },
  { key: "siteGenerator", label: "Site generator", type: "dropdown", options: GENERATOR_OPTIONS },
  { key: "overwriteExisting", label: "Overwrite existing files", type: "toggle" },
];

function normalizeGenerator(value: StaticSiteGenerator | undefined): StaticSiteGenerator {
  return GENERATOR_OPTIONS.some((option) => option.value === value) ? (value as StaticSiteGenerator) : "hugo";
}

const settingsForm = defineSettingsForm<LocalFilesystemTargetConfig>({
  fields: [...COMMON_FIELDS, ...LOCAL_FILESYSTEM_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "localOutputPath":
        return target.localOutputPath;
      case "siteGenerator":
        return target.siteGenerator;
      case "overwriteExisting":
        return target.overwriteExisting;
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "localOutputPath":
        target.localOutputPath = String(value).trim() || "published";
        return target;
      case "siteGenerator":
        target.siteGenerator = normalizeGenerator(String(value) as StaticSiteGenerator);
        return target;
      case "overwriteExisting":
        target.overwriteExisting = Boolean(value);
        return target;
      default:
        return target;
    }
  },
});

export const localFilesystemDefinition: ProviderDefinition<"local-filesystem"> = {
  id: "local-filesystem",
  name: "Local Filesystem",
  category: "filesystem",
  family: "filesystem-local",
  capabilities: {
    publish: true,
    update: true,
    delete: true,
    media: "unsupported",
    normalPublish: false,
    quickPublish: true,
  },
  createProvider: (app: App) => new LocalFilesystemProvider(app),
  createTarget: () => ({
    id: randomUUID(),
    name: "Local Filesystem",
    enabled: true,
    provider: "local-filesystem",
    localOutputPath: "published",
    siteGenerator: "hugo",
    overwriteExisting: false,
  }),
  normalizeTarget: (target: LocalFilesystemTargetConfig) => ({
    ...target,
    localOutputPath: target.localOutputPath || "published",
    siteGenerator: normalizeGenerator(target.siteGenerator),
    overwriteExisting: Boolean(target.overwriteExisting),
  }),
  settingsForm,
};
