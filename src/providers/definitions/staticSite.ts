import { randomUUID } from "node:crypto";
import {
  GithubStaticSiteProviderId,
  GithubTargetConfig,
  GitlabStaticSiteProviderId,
  GitlabTargetConfig,
  StaticSiteGenerator,
} from "../../types";
import { GithubProvider } from "../githubProvider";
import { GitlabProvider } from "../gitlabProvider";
import { COMMON_FIELDS, defineSettingsForm } from "./settingsForm";
import { ProviderDefinition, ProviderSettingsFieldDefinition } from "./types";

export const STATIC_SITE_GENERATOR_OPTIONS: { value: StaticSiteGenerator; label: string }[] = [
  { value: "hugo", label: "Hugo" },
  { value: "hexo", label: "Hexo" },
  { value: "jekyll", label: "Jekyll" },
  { value: "vuepress", label: "VuePress" },
  { value: "vuepress2", label: "VuePress 2" },
  { value: "vitepress", label: "VitePress" },
  { value: "quartz", label: "Quartz" },
];

const GENERATOR_LABELS: Record<StaticSiteGenerator, string> = Object.fromEntries(
  STATIC_SITE_GENERATOR_OPTIONS.map((option) => [option.value, option.label]),
) as Record<StaticSiteGenerator, string>;

const GITHUB_GENERATOR_PROVIDERS: Array<{ id: Exclude<GithubStaticSiteProviderId, "github">; generator: StaticSiteGenerator }> = [
  { id: "github-hugo", generator: "hugo" },
  { id: "github-hexo", generator: "hexo" },
  { id: "github-jekyll", generator: "jekyll" },
  { id: "github-vuepress", generator: "vuepress" },
  { id: "github-vuepress2", generator: "vuepress2" },
  { id: "github-vitepress", generator: "vitepress" },
  { id: "github-quartz", generator: "quartz" },
];

const GITLAB_GENERATOR_PROVIDERS: Array<{ id: Exclude<GitlabStaticSiteProviderId, "gitlab">; generator: StaticSiteGenerator }> = [
  { id: "gitlab-hugo", generator: "hugo" },
  { id: "gitlab-hexo", generator: "hexo" },
  { id: "gitlab-jekyll", generator: "jekyll" },
  { id: "gitlab-vuepress", generator: "vuepress" },
  { id: "gitlab-vuepress2", generator: "vuepress2" },
  { id: "gitlab-vitepress", generator: "vitepress" },
];

const SHARED_STATIC_SITE_FIELDS: ProviderSettingsFieldDefinition[] = [
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

const LEGACY_SHARED_STATIC_SITE_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "siteGenerator", label: "Site generator", type: "dropdown", options: STATIC_SITE_GENERATOR_OPTIONS },
  ...SHARED_STATIC_SITE_FIELDS,
];

const GITHUB_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "owner", label: "Owner", type: "text" },
  { key: "repo", label: "Repo", type: "text" },
  ...SHARED_STATIC_SITE_FIELDS,
];

const LEGACY_GITHUB_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "owner", label: "Owner", type: "text" },
  { key: "repo", label: "Repo", type: "text" },
  ...LEGACY_SHARED_STATIC_SITE_FIELDS,
];

const GITLAB_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "baseUrl", label: "Base URL", description: "Example: https://gitlab.com", type: "text" },
  { key: "projectIdOrPath", label: "Project ID or path", description: "Example: group/project", type: "text" },
  ...SHARED_STATIC_SITE_FIELDS,
];

const LEGACY_GITLAB_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "baseUrl", label: "Base URL", description: "Example: https://gitlab.com", type: "text" },
  { key: "projectIdOrPath", label: "Project ID or path", description: "Example: group/project", type: "text" },
  ...LEGACY_SHARED_STATIC_SITE_FIELDS,
];

function normalizeGenerator(value: unknown, fallback: StaticSiteGenerator): StaticSiteGenerator {
  return STATIC_SITE_GENERATOR_OPTIONS.some((option) => option.value === value) ? (value as StaticSiteGenerator) : fallback;
}

function createGithubSettingsForm<TProvider extends GithubStaticSiteProviderId>(fixedGenerator?: StaticSiteGenerator) {
  return defineSettingsForm<GithubTargetConfig<TProvider>>({
    fields: [...COMMON_FIELDS, ...(fixedGenerator ? GITHUB_FIELDS : LEGACY_GITHUB_FIELDS)],
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
          target.siteGenerator = fixedGenerator ?? normalizeGenerator(value, "hugo");
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
}

function createGitlabSettingsForm<TProvider extends GitlabStaticSiteProviderId>(fixedGenerator?: StaticSiteGenerator) {
  return defineSettingsForm<GitlabTargetConfig<TProvider>>({
    fields: [...COMMON_FIELDS, ...(fixedGenerator ? GITLAB_FIELDS : LEGACY_GITLAB_FIELDS)],
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
          target.siteGenerator = fixedGenerator ?? normalizeGenerator(value, "hugo");
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
}

function createGithubTarget<TProvider extends GithubStaticSiteProviderId>(provider: TProvider, generator: StaticSiteGenerator): GithubTargetConfig<TProvider> {
  return {
    id: randomUUID(),
    name: provider === "github" ? "GitHub Static Sites" : `GitHub ${GENERATOR_LABELS[generator]}`,
    enabled: true,
    provider,
    siteGenerator: generator,
    owner: "",
    repo: "",
    branch: "main",
    contentRoot: "content/posts",
    token: "",
    commitMessageTemplate: "Publish {{title}}",
    previewBaseUrl: "",
  };
}

function createGitlabTarget<TProvider extends GitlabStaticSiteProviderId>(provider: TProvider, generator: StaticSiteGenerator): GitlabTargetConfig<TProvider> {
  return {
    id: randomUUID(),
    name: provider === "gitlab" ? "GitLab Static Sites" : `GitLab ${GENERATOR_LABELS[generator]}`,
    enabled: true,
    provider,
    siteGenerator: generator,
    baseUrl: "https://gitlab.com",
    projectIdOrPath: "",
    branch: "main",
    contentRoot: "content/posts",
    token: "",
    commitMessageTemplate: "Publish {{title}}",
    previewBaseUrl: "",
  };
}

function normalizeGithubTarget<TProvider extends GithubStaticSiteProviderId>(target: GithubTargetConfig<TProvider>, generator: StaticSiteGenerator): GithubTargetConfig<TProvider> {
  return {
    ...target,
    siteGenerator: normalizeGenerator(target.siteGenerator, generator),
    branch: target.branch || "main",
    contentRoot: target.contentRoot || "content/posts",
    commitMessageTemplate: target.commitMessageTemplate || "Publish {{title}}",
    previewBaseUrl: target.previewBaseUrl || "",
  };
}

function normalizeFixedGithubTarget<TProvider extends Exclude<GithubStaticSiteProviderId, "github">>(target: GithubTargetConfig<TProvider>, generator: StaticSiteGenerator): GithubTargetConfig<TProvider> {
  return {
    ...normalizeGithubTarget(target, generator),
    siteGenerator: generator,
  };
}

function normalizeGitlabTarget<TProvider extends GitlabStaticSiteProviderId>(target: GitlabTargetConfig<TProvider>, generator: StaticSiteGenerator): GitlabTargetConfig<TProvider> {
  return {
    ...target,
    siteGenerator: normalizeGenerator(target.siteGenerator, generator),
    baseUrl: target.baseUrl || "https://gitlab.com",
    branch: target.branch || "main",
    contentRoot: target.contentRoot || "content/posts",
    commitMessageTemplate: target.commitMessageTemplate || "Publish {{title}}",
    previewBaseUrl: target.previewBaseUrl || "",
  };
}

function normalizeFixedGitlabTarget<TProvider extends Exclude<GitlabStaticSiteProviderId, "gitlab">>(target: GitlabTargetConfig<TProvider>, generator: StaticSiteGenerator): GitlabTargetConfig<TProvider> {
  return {
    ...normalizeGitlabTarget(target, generator),
    siteGenerator: generator,
  };
}

function createGithubDefinition<TProvider extends Exclude<GithubStaticSiteProviderId, "github">>(provider: TProvider, generator: StaticSiteGenerator): ProviderDefinition<TProvider> {
  return {
    id: provider,
    name: `GitHub ${GENERATOR_LABELS[generator]}`,
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
    createProvider: () => new GithubProvider(provider) as never,
    createTarget: () => createGithubTarget(provider, generator) as never,
    normalizeTarget: (target) => normalizeFixedGithubTarget(target as GithubTargetConfig<TProvider>, generator) as never,
    settingsForm: createGithubSettingsForm<TProvider>(generator) as never,
  };
}

function createGitlabDefinition<TProvider extends Exclude<GitlabStaticSiteProviderId, "gitlab">>(provider: TProvider, generator: StaticSiteGenerator): ProviderDefinition<TProvider> {
  return {
    id: provider,
    name: `GitLab ${GENERATOR_LABELS[generator]}`,
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
    createProvider: () => new GitlabProvider(provider) as never,
    createTarget: () => createGitlabTarget(provider, generator) as never,
    normalizeTarget: (target) => normalizeFixedGitlabTarget(target as GitlabTargetConfig<TProvider>, generator) as never,
    settingsForm: createGitlabSettingsForm<TProvider>(generator) as never,
  };
}

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
  createProvider: () => new GithubProvider("github") as never,
  createTarget: () => createGithubTarget("github", "hugo"),
  normalizeTarget: (target) => normalizeGithubTarget(target, "hugo"),
  settingsForm: createGithubSettingsForm<"github">(),
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
  createProvider: () => new GitlabProvider("gitlab") as never,
  createTarget: () => createGitlabTarget("gitlab", "hugo"),
  normalizeTarget: (target) => normalizeGitlabTarget(target, "hugo"),
  settingsForm: createGitlabSettingsForm<"gitlab">(),
};

export const githubStaticSiteDefinitions = Object.fromEntries(
  GITHUB_GENERATOR_PROVIDERS.map(({ id, generator }) => [id, createGithubDefinition(id, generator)]),
) as { [TProvider in Exclude<GithubStaticSiteProviderId, "github">]: ProviderDefinition<TProvider> };

export const gitlabStaticSiteDefinitions = Object.fromEntries(
  GITLAB_GENERATOR_PROVIDERS.map(({ id, generator }) => [id, createGitlabDefinition(id, generator)]),
) as { [TProvider in Exclude<GitlabStaticSiteProviderId, "gitlab">]: ProviderDefinition<TProvider> };
