import { cloneTarget, normalizeTarget } from "../../settings";
import { PublishContentFormat, PublishTargetConfig, WordpressStatus } from "../../types";
import { createI18n, Translator } from "../../i18n";

export type ModalFieldKey =
  | "enabled"
  | "name"
  | "cookie"
  | "endpoint"
  | "username"
  | "appPassword"
  | "defaultStatus"
  | "contentFormat"
  | "baseUrl"
  | "repo"
  | "token"
  | "publicLevel"
  | "defaultColumnId"
  | "defaultColumnTitle"
  | "defaultCategories"
  | "defaultTags"
  | "defaultCategoryId"
  | "defaultTagIds"
  | "defaultBriefContent"
  | "outputDir"
  | "yamlType"
  | "assetDirName";

type ModalFieldType = "toggle" | "text" | "password" | "dropdown";

interface ModalFieldOption {
  value: string;
  label: string;
}

export interface ModalFieldDefinition {
  key: ModalFieldKey;
  label: string;
  description?: string;
  type: ModalFieldType;
  options?: ModalFieldOption[];
}

const COMMON_FIELDS: ModalFieldDefinition[] = [
  { key: "enabled", label: "Enabled", type: "toggle" },
  { key: "name", label: "Display name", type: "text" },
];

const WEB_AUTH_COMMON_FIELDS: ModalFieldDefinition[] = [
  {
    key: "cookie",
    label: "Cookie",
    description: "Paste Cookie manually if browser authorization fails.",
    type: "password",
  },
];

const WORDPRESS_FIELDS: ModalFieldDefinition[] = [
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

const YUQUE_FIELDS: ModalFieldDefinition[] = [
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

const LOCAL_EXPORT_FIELDS: ModalFieldDefinition[] = [
  { key: "outputDir", label: "Output directory", description: "Absolute directory path on the local machine.", type: "text" },
  {
    key: "yamlType",
    label: "YAML type",
    type: "dropdown",
    options: [
      { value: "default", label: "Default" },
      { value: "hexo", label: "Hexo" },
    ],
  },
  { key: "assetDirName", label: "Asset directory name", type: "text" },
];

const ZHIHU_FIELDS: ModalFieldDefinition[] = [
  { key: "defaultColumnId", label: "Default column ID", type: "text" },
  { key: "defaultColumnTitle", label: "Default column title", type: "text" },
];

const CSDN_FIELDS: ModalFieldDefinition[] = [
  { key: "defaultCategories", label: "Default categories", description: "Comma-separated category names.", type: "text" },
  { key: "defaultTags", label: "Default tags", description: "Comma-separated tag names.", type: "text" },
];

const JUEJIN_FIELDS: ModalFieldDefinition[] = [
  { key: "defaultCategoryId", label: "Default category ID", type: "text" },
  { key: "defaultTagIds", label: "Default tag IDs", description: "Comma-separated tag IDs.", type: "text" },
  { key: "defaultBriefContent", label: "Default brief content", type: "text" },
];

const DEFAULT_I18N = createI18n("en");

const FIELD_LABEL_ZH: Partial<Record<ModalFieldKey, string>> = {
  enabled: "启用",
  name: "显示名称",
  cookie: "Cookie",
  endpoint: "Endpoint",
  username: "用户名",
  appPassword: "应用密码",
  defaultStatus: "默认状态",
  contentFormat: "发布格式",
  baseUrl: "基础 URL",
  repo: "仓库",
  token: "Token",
  publicLevel: "公开级别",
  defaultColumnId: "默认专栏 ID",
  defaultColumnTitle: "默认专栏标题",
  defaultCategories: "默认分类",
  defaultTags: "默认标签",
  defaultCategoryId: "默认分类 ID",
  defaultTagIds: "默认标签 ID",
  defaultBriefContent: "默认摘要",
  outputDir: "输出目录",
  yamlType: "YAML 类型",
  assetDirName: "资源目录名",
};

const FIELD_DESCRIPTION_ZH: Partial<Record<ModalFieldKey, string>> = {
  cookie: "如果浏览器授权失败，可手动粘贴 Cookie。",
  endpoint: "示例: https://example.com",
  contentFormat: "选择向 WordPress 发布 Markdown 文本或渲染后的 HTML。",
  repo: "示例: namespace/repo",
  publicLevel: "0 = 私有, 1 = 公开",
  outputDir: "本地机器上的绝对目录路径。",
  defaultCategories: "用逗号分隔分类名。",
  defaultTags: "用逗号分隔标签名。",
  defaultTagIds: "用逗号分隔标签 ID。",
};

const FIELD_OPTION_LABEL_ZH: Partial<Record<ModalFieldKey, Record<string, string>>> = {
  defaultStatus: {
    draft: "草稿",
    publish: "发布",
    private: "私密",
    pending: "待审核",
  },
  contentFormat: {
    markdown: "Markdown",
    html: "HTML",
  },
  publicLevel: {
    "0": "私有",
    "1": "公开",
  },
  yamlType: {
    default: "默认",
    hexo: "Hexo",
  },
};

function resolveTranslation(
  i18n: Translator,
  key: string,
  fallback: { en: string; "zh-CN": string }
): string {
  const translated = i18n.t(key);
  if (translated !== key) {
    return translated;
  }
  return i18n.locale === "zh-CN" ? fallback["zh-CN"] : fallback.en;
}

function localizeField(field: ModalFieldDefinition, i18n: Translator): ModalFieldDefinition {
  const label = resolveTranslation(i18n, `settings.modal.field.${field.key}.label`, {
    en: field.label,
    "zh-CN": FIELD_LABEL_ZH[field.key] ?? field.label,
  });

  const description = field.description
    ? resolveTranslation(i18n, `settings.modal.field.${field.key}.description`, {
        en: field.description,
        "zh-CN": FIELD_DESCRIPTION_ZH[field.key] ?? field.description,
      })
    : undefined;

  const options = field.options?.map((option) => ({
    value: option.value,
    label: resolveTranslation(i18n, `settings.modal.field.${field.key}.options.${option.value}`, {
      en: option.label,
      "zh-CN": FIELD_OPTION_LABEL_ZH[field.key]?.[option.value] ?? option.label,
    }),
  }));

  return {
    key: field.key,
    label,
    description,
    type: field.type,
    options,
  };
}

function splitCommaSeparatedValue(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getModalFieldDefinitions(
  target: PublishTargetConfig,
  i18n: Translator = DEFAULT_I18N
): ModalFieldDefinition[] {
  const fieldsByProvider =
    target.provider === "wordpress"
      ? [...COMMON_FIELDS, ...WORDPRESS_FIELDS]
      : target.provider === "yuque"
        ? [...COMMON_FIELDS, ...YUQUE_FIELDS]
        : target.provider === "zhihu"
          ? [...COMMON_FIELDS, ...WEB_AUTH_COMMON_FIELDS, ...ZHIHU_FIELDS]
          : target.provider === "csdn"
            ? [...COMMON_FIELDS, ...WEB_AUTH_COMMON_FIELDS, ...CSDN_FIELDS]
            : target.provider === "juejin"
              ? [...COMMON_FIELDS, ...WEB_AUTH_COMMON_FIELDS, ...JUEJIN_FIELDS]
              : [...COMMON_FIELDS, ...LOCAL_EXPORT_FIELDS];

  return fieldsByProvider.map((field) => localizeField(field, i18n));
}

export function readFieldValue(target: PublishTargetConfig, key: ModalFieldKey): string | boolean {
  switch (key) {
    case "enabled":
      return target.enabled;
    case "name":
      return target.name;
    case "cookie":
      return "cookie" in target ? target.cookie : "";
    case "endpoint":
      return target.provider === "wordpress" ? target.endpoint : "";
    case "username":
      return target.provider === "wordpress" ? target.username : "";
    case "appPassword":
      return target.provider === "wordpress" ? target.appPassword : "";
    case "defaultStatus":
      return target.provider === "wordpress" ? target.defaultStatus : "";
    case "contentFormat":
      return target.provider === "wordpress" ? target.contentFormat : "";
    case "baseUrl":
      return target.provider === "yuque" ? target.baseUrl : "";
    case "repo":
      return target.provider === "yuque" ? target.repo : "";
    case "token":
      return target.provider === "yuque" ? target.token : "";
    case "publicLevel":
      return target.provider === "yuque" ? String(target.publicLevel) : "";
    case "defaultColumnId":
      return target.provider === "zhihu" ? target.defaultColumnId : "";
    case "defaultColumnTitle":
      return target.provider === "zhihu" ? target.defaultColumnTitle ?? "" : "";
    case "defaultCategories":
      return target.provider === "csdn" ? target.defaultCategories.join(", ") : "";
    case "defaultTags":
      return target.provider === "csdn" ? target.defaultTags.join(", ") : "";
    case "defaultCategoryId":
      return target.provider === "juejin" ? target.defaultCategoryId : "";
    case "defaultTagIds":
      return target.provider === "juejin" ? target.defaultTagIds.join(", ") : "";
    case "defaultBriefContent":
      return target.provider === "juejin" ? target.defaultBriefContent : "";
    case "outputDir":
      return target.provider === "local-export" ? target.outputDir : "";
    case "yamlType":
      return target.provider === "local-export" ? target.yamlType : "";
    case "assetDirName":
      return target.provider === "local-export" ? target.assetDirName : "";
  }
}

export function applyFieldValue(
  target: PublishTargetConfig,
  key: ModalFieldKey,
  value: string | boolean
): PublishTargetConfig {
  const nextTarget = normalizeTarget(cloneTarget(target));

  switch (key) {
    case "enabled":
      nextTarget.enabled = Boolean(value);
      return nextTarget;
    case "name":
      nextTarget.name = String(value).trim() || nextTarget.name;
      return nextTarget;
    case "cookie":
      if ("cookie" in nextTarget) {
        nextTarget.cookie = String(value).trim();
      }
      return nextTarget;
    case "endpoint":
      if (nextTarget.provider === "wordpress") {
        nextTarget.endpoint = String(value).trim();
      }
      return nextTarget;
    case "username":
      if (nextTarget.provider === "wordpress") {
        nextTarget.username = String(value).trim();
      }
      return nextTarget;
    case "appPassword":
      if (nextTarget.provider === "wordpress") {
        nextTarget.appPassword = String(value).trim();
      }
      return nextTarget;
    case "defaultStatus":
      if (nextTarget.provider === "wordpress") {
        nextTarget.defaultStatus = String(value) as WordpressStatus;
      }
      return nextTarget;
    case "contentFormat":
      if (nextTarget.provider === "wordpress") {
        nextTarget.contentFormat = String(value) as PublishContentFormat;
      }
      return nextTarget;
    case "baseUrl":
      if (nextTarget.provider === "yuque") {
        nextTarget.baseUrl = String(value).trim();
      }
      return nextTarget;
    case "repo":
      if (nextTarget.provider === "yuque") {
        nextTarget.repo = String(value).trim();
      }
      return nextTarget;
    case "token":
      if (nextTarget.provider === "yuque") {
        nextTarget.token = String(value).trim();
      }
      return nextTarget;
    case "publicLevel":
      if (nextTarget.provider === "yuque") {
        nextTarget.publicLevel = Number(value) === 1 ? 1 : 0;
      }
      return nextTarget;
    case "defaultColumnId":
      if (nextTarget.provider === "zhihu") {
        nextTarget.defaultColumnId = String(value).trim();
      }
      return nextTarget;
    case "defaultColumnTitle":
      if (nextTarget.provider === "zhihu") {
        nextTarget.defaultColumnTitle = String(value).trim();
      }
      return nextTarget;
    case "defaultCategories":
      if (nextTarget.provider === "csdn") {
        nextTarget.defaultCategories = splitCommaSeparatedValue(String(value));
      }
      return nextTarget;
    case "defaultTags":
      if (nextTarget.provider === "csdn") {
        nextTarget.defaultTags = splitCommaSeparatedValue(String(value));
      }
      return nextTarget;
    case "defaultCategoryId":
      if (nextTarget.provider === "juejin") {
        nextTarget.defaultCategoryId = String(value).trim();
      }
      return nextTarget;
    case "defaultTagIds":
      if (nextTarget.provider === "juejin") {
        nextTarget.defaultTagIds = splitCommaSeparatedValue(String(value));
      }
      return nextTarget;
    case "defaultBriefContent":
      if (nextTarget.provider === "juejin") {
        nextTarget.defaultBriefContent = String(value).trim();
      }
      return nextTarget;
    case "outputDir":
      if (nextTarget.provider === "local-export") {
        nextTarget.outputDir = String(value).trim();
      }
      return nextTarget;
    case "yamlType":
      if (nextTarget.provider === "local-export") {
        nextTarget.yamlType = String(value) === "hexo" ? "hexo" : "default";
      }
      return nextTarget;
    case "assetDirName":
      if (nextTarget.provider === "local-export") {
        nextTarget.assetDirName = String(value).trim();
      }
      return nextTarget;
  }
}
