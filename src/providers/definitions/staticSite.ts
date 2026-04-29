import { randomUUID } from "node:crypto";
import { GithubTargetConfig, GitlabTargetConfig, StaticSiteGenerator } from "../../types";
import { GithubProvider } from "../githubProvider";
import { GitlabProvider } from "../gitlabProvider";
import { COMMON_FIELDS, defineSettingsForm } from "./settingsForm";
import { ProviderDefinition, ProviderSettingsFieldDefinition } from "./types";

const STATIC_SITE_GENERATOR_OPTIONS: { value: StaticSiteGenerator; label: string }[] = [
  { value: "hugo", label: "Hugo" },
  { value: "hexo", label: "Hexo" },
  { value: "jekyll", label: "Jekyll" },
  { value: "vuepress", label: "VuePress" },
  { value: "vuepress2", label: "VuePress 2" },
  { value: "vitepress", label: "VitePress" },
  { value: "quartz", label: "Quartz" },
];

const SHARED_STATIC_SITE_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "siteGenerator", label: "Site generator", type: "dropdown", options: STATIC_SITE_GENERATOR_OPTIONS },
  { key: "branch", label: "Branch", type: "text" },
  { key: "contentRoot", label: "Content root", description: "Example: content/posts", type: "text" },
  { key: "token", label: "Token", type: "password" },
  {
    key: "commitMessageTemplate",
    label: "Commit message template",
    description: "Supports {{title}} and {{path}} placeholders.",
    type: "text",
  },
  { key: "previewBaseUrl", label: "Preview base URL", description: "Optional published site base URL.", type: "text" },
];

const GITHUB_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "owner", label: "Owner", type: "text" },
  { key: "repo", label: "Repo", type: "text" },
  ...SHARED_STATIC_SITE_FIELDS,
];

const GITLAB_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "baseUrl", label: "Base URL", description: "Example: https://gitlab.com", type: "text" },
  { key: "projectIdOrPath", label: "Project ID or path", description: "Example: group/project", type: "text" },
  ...SHARED_STATIC_SITE_FIELDS,
];

function normalizeGenerator(value: unknown): StaticSiteGenerator {
  return STATIC_SITE_GENERATOR_OPTIONS.some((option) => option.value === value) ? (value as StaticSiteGenerator) : "hugo";
}

const githubSettingsForm = defineSettingsForm<GithubTargetConfig>({
  fields: [...COMMON_FIELDS, ...GITHUB_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "siteGenerator":
        return target.siteGenerator;
      case "owner":
        return target.owner;
      case "repo":
        return target.repo;
      case "branch":
        return target.branch;
      case "contentRoot":
        return target.contentRoot;
      case "token":
        return target.token;
      case "commitMessageTemplate":
        return target.commitMessageTemplate;
      case "previewBaseUrl":
        return target.previewBaseUrl ?? "";
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "siteGenerator":
        target.siteGenerator = normalizeGenerator(value);
        return target;
      case "owner":
        target.owner = String(value).trim();
        return target;
      case "repo":
        target.repo = String(value).trim();
        return target;
      case "branch":
        target.branch = String(value).trim() || "main";
        return target;
      case "contentRoot":
        target.contentRoot = String(value).trim() || "content/posts";
        return target;
      case "token":
        target.token = String(value).trim();
        return target;
      case "commitMessageTemplate":
        target.commitMessageTemplate = String(value).trim() || "Publish {{title}}";
        return target;
      case "previewBaseUrl":
        target.previewBaseUrl = String(value).trim();
        return target;
      default:
        return target;
    }
  },
});

const gitlabSettingsForm = defineSettingsForm<GitlabTargetConfig>({
  fields: [...COMMON_FIELDS, ...GITLAB_FIELDS],
  readProviderFieldValue(target, key) {
    switch (key) {
      case "siteGenerator":
        return target.siteGenerator;
      case "baseUrl":
        return target.baseUrl;
      case "projectIdOrPath":
        return target.projectIdOrPath;
      case "branch":
        return target.branch;
      case "contentRoot":
        return target.contentRoot;
      case "token":
        return target.token;
      case "commitMessageTemplate":
        return target.commitMessageTemplate;
      case "previewBaseUrl":
        return target.previewBaseUrl ?? "";
      default:
        return undefined;
    }
  },
  applyProviderFieldValue(target, key, value) {
    switch (key) {
      case "siteGenerator":
        target.siteGenerator = normalizeGenerator(value);
        return target;
      case "baseUrl":
        target.baseUrl = String(value).trim() || "https://gitlab.com";
        return target;
      case "projectIdOrPath":
        target.projectIdOrPath = String(value).trim();
        return target;
      case "branch":
        target.branch = String(value).trim() || "main";
        return target;
      case "contentRoot":
        target.contentRoot = String(value).trim() || "content/posts";
        return target;
      case "token":
        target.token = String(value).trim();
        return target;
      case "commitMessageTemplate":
        target.commitMessageTemplate = String(value).trim() || "Publish {{title}}";
        return target;
      case "previewBaseUrl":
        target.previewBaseUrl = String(value).trim();
        return target;
      default:
        return target;
    }
  },
});

export const githubDefinition: ProviderDefinition<"github"> = {
  id: "github",
  name: "GitHub Static Sites",
  category: "github",
  family: "github-static-site",
  capabilities: {
    publish: true,
    update: true,
    delete: false,
    media: "unsupported",
    normalPublish: false,
    quickPublish: true,
  },
  createProvider: () => new GithubProvider(),
  createTarget: () => ({
    id: randomUUID(),
    name: "GitHub Static Sites",
    enabled: true,
    provider: "github",
    siteGenerator: "hugo",
    owner: "",
    repo: "",
    branch: "main",
    contentRoot: "content/posts",
    token: "",
    commitMessageTemplate: "Publish {{title}}",
    previewBaseUrl: "",
  }),
  normalizeTarget: (target: GithubTargetConfig) => ({
    ...target,
    siteGenerator: normalizeGenerator(target.siteGenerator),
    branch: target.branch || "main",
    contentRoot: target.contentRoot || "content/posts",
    commitMessageTemplate: target.commitMessageTemplate || "Publish {{title}}",
    previewBaseUrl: target.previewBaseUrl || "",
  }),
  settingsForm: githubSettingsForm,
};

export const gitlabDefinition: ProviderDefinition<"gitlab"> = {
  id: "gitlab",
  name: "GitLab Static Sites",
  category: "gitlab",
  family: "gitlab-static-site",
  capabilities: {
    publish: true,
    update: true,
    delete: false,
    media: "unsupported",
    normalPublish: false,
    quickPublish: true,
  },
  createProvider: () => new GitlabProvider(),
  createTarget: () => ({
    id: randomUUID(),
    name: "GitLab Static Sites",
    enabled: true,
    provider: "gitlab",
    siteGenerator: "hugo",
    baseUrl: "https://gitlab.com",
    projectIdOrPath: "",
    branch: "main",
    contentRoot: "content/posts",
    token: "",
    commitMessageTemplate: "Publish {{title}}",
    previewBaseUrl: "",
  }),
  normalizeTarget: (target: GitlabTargetConfig) => ({
    ...target,
    siteGenerator: normalizeGenerator(target.siteGenerator),
    baseUrl: target.baseUrl || "https://gitlab.com",
    branch: target.branch || "main",
    contentRoot: target.contentRoot || "content/posts",
    commitMessageTemplate: target.commitMessageTemplate || "Publish {{title}}",
    previewBaseUrl: target.previewBaseUrl || "",
  }),
  settingsForm: gitlabSettingsForm,
};
