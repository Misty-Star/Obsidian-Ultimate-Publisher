import { Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { PublishTargetConfig } from "../../types";
import {
  ProviderSettingsFieldDefinition,
  ProviderSettingsFieldKey,
  ProviderSettingsForm,
} from "./types";

export const COMMON_FIELDS: ProviderSettingsFieldDefinition[] = [
  { key: "enabled", label: "Enabled", type: "toggle" },
  { key: "name", label: "Display name", type: "text" },
];

export const WEB_AUTH_COMMON_FIELDS: ProviderSettingsFieldDefinition[] = [
  {
    key: "cookie",
    label: "Cookie",
    description: "Paste Cookie manually if browser authorization fails.",
    type: "password",
  },
];

const FIELD_LABEL_ZH: Partial<Record<ProviderSettingsFieldKey, string>> = {
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
};

const FIELD_DESCRIPTION_ZH: Partial<Record<ProviderSettingsFieldKey, string>> = {
  cookie: "如果浏览器授权失败，可手动粘贴 Cookie。",
  endpoint: "示例: https://example.com",
  contentFormat: "选择向 WordPress 发布 Markdown 文本或渲染后的 HTML。",
  repo: "示例: namespace/repo",
  publicLevel: "0 = 私有, 1 = 公开",
  defaultCategories: "用逗号分隔分类名。",
  defaultTags: "用逗号分隔标签名。",
  defaultTagIds: "用逗号分隔标签 ID。",
};

const FIELD_OPTION_LABEL_ZH: Partial<Record<ProviderSettingsFieldKey, Record<string, string>>> = {
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
};

function resolveTranslation(
  i18n: Translator,
  key: string,
  fallback: { en: string; "zh-CN": string }
): string {
  if (Object.prototype.hasOwnProperty.call(messages[i18n.locale], key)) {
    return i18n.t(key);
  }
  return i18n.locale === "zh-CN" ? fallback["zh-CN"] : fallback.en;
}

function localizeField(field: ProviderSettingsFieldDefinition, i18n: Translator): ProviderSettingsFieldDefinition {
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

function readCommonFieldValue(
  target: PublishTargetConfig,
  key: ProviderSettingsFieldKey
): string | boolean | undefined {
  switch (key) {
    case "enabled":
      return target.enabled;
    case "name":
      return target.name;
    case "cookie":
      return "cookie" in target ? target.cookie : "";
    default:
      return undefined;
  }
}

function applyCommonFieldValue(
  target: PublishTargetConfig,
  key: ProviderSettingsFieldKey,
  value: string | boolean
): boolean {
  switch (key) {
    case "enabled":
      target.enabled = Boolean(value);
      return true;
    case "name":
      target.name = String(value).trim() || target.name;
      return true;
    case "cookie":
      if ("cookie" in target) {
        target.cookie = String(value).trim();
      }
      return true;
    default:
      return false;
  }
}

export function splitCommaSeparatedValue(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function defineSettingsForm<TTarget extends PublishTargetConfig>(options: {
  fields: ProviderSettingsFieldDefinition[];
  readProviderFieldValue: (target: TTarget, key: ProviderSettingsFieldKey) => string | boolean | undefined;
  applyProviderFieldValue: (target: TTarget, key: ProviderSettingsFieldKey, value: string | boolean) => TTarget;
}): ProviderSettingsForm<TTarget> {
  return {
    getFields(_target, i18n) {
      return options.fields.map((field) => localizeField(field, i18n));
    },
    readFieldValue(target, key) {
      const commonValue = readCommonFieldValue(target, key);
      if (commonValue !== undefined) {
        return commonValue;
      }
      return options.readProviderFieldValue(target, key) ?? "";
    },
    applyFieldValue(target, key, value) {
      if (applyCommonFieldValue(target, key, value)) {
        return target;
      }
      return options.applyProviderFieldValue(target, key, value);
    },
  };
}
