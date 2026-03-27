import {
  createCsdnTarget,
  createJuejinTarget,
  createWordpressTarget,
  createYuqueTarget,
  createZhihuTarget,
} from "../../settings";
import {
  CsdnTargetConfig,
  JuejinTargetConfig,
  ProviderId,
  PublishTargetConfig,
  WordpressTargetConfig,
  YuqueTargetConfig,
  ZhihuTargetConfig,
} from "../../types";
import { createI18n, Translator } from "../../i18n";
import { messages } from "../../i18n/messages";

interface ProviderCatalogBase<TTarget extends PublishTargetConfig> {
  id: TTarget["provider"];
  name: string;
  description: string;
  icon: string;
  createTarget: () => TTarget;
}

interface ProviderCatalogSeed<TTarget extends PublishTargetConfig> {
  id: TTarget["provider"];
  name: string;
  descriptionKey: string;
  descriptionFallback: {
    en: string;
    "zh-CN": string;
  };
  icon: string;
  createTarget: () => TTarget;
}

type ProviderCatalogSeedEntry =
  | ProviderCatalogSeed<WordpressTargetConfig>
  | ProviderCatalogSeed<YuqueTargetConfig>
  | ProviderCatalogSeed<ZhihuTargetConfig>
  | ProviderCatalogSeed<CsdnTargetConfig>
  | ProviderCatalogSeed<JuejinTargetConfig>;

export type ProviderCatalogEntry =
  | ProviderCatalogBase<WordpressTargetConfig>
  | ProviderCatalogBase<YuqueTargetConfig>
  | ProviderCatalogBase<ZhihuTargetConfig>
  | ProviderCatalogBase<CsdnTargetConfig>
  | ProviderCatalogBase<JuejinTargetConfig>;

const PROVIDER_CATALOG: ProviderCatalogSeedEntry[] = [
  {
    id: "wordpress",
    name: "WordPress",
    descriptionKey: "settings.providers.wordpress.description",
    descriptionFallback: {
      en: "REST API publishing with application password auth.",
      "zh-CN": "使用应用密码认证，通过 REST API 发布内容。",
    },
    icon: "WP",
    createTarget: createWordpressTarget,
  },
  {
    id: "yuque",
    name: "Yuque",
    descriptionKey: "settings.providers.yuque.description",
    descriptionFallback: {
      en: "Token-based publishing to a Yuque knowledge base.",
      "zh-CN": "使用 Token 向 Yuque 知识库发布内容。",
    },
    icon: "YQ",
    createTarget: createYuqueTarget,
  },
  {
    id: "zhihu",
    name: "Zhihu",
    descriptionKey: "settings.providers.zhihu.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to Zhihu columns.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 Zhihu 专栏。",
    },
    icon: "ZH",
    createTarget: createZhihuTarget,
  },
  {
    id: "csdn",
    name: "CSDN",
    descriptionKey: "settings.providers.csdn.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to CSDN articles.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 CSDN 文章。",
    },
    icon: "CS",
    createTarget: createCsdnTarget,
  },
  {
    id: "juejin",
    name: "Juejin",
    descriptionKey: "settings.providers.juejin.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to Juejin posts.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 Juejin 文章。",
    },
    icon: "JJ",
    createTarget: createJuejinTarget,
  },
];

const DEFAULT_I18N = createI18n("en");

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

function localizeProviderCatalogEntry(
  entry: ProviderCatalogSeedEntry,
  i18n: Translator
): ProviderCatalogEntry {
  const base = {
    name: entry.name,
    description: resolveTranslation(i18n, entry.descriptionKey, entry.descriptionFallback),
    icon: entry.icon,
  };

  switch (entry.id) {
    case "wordpress":
      return { id: "wordpress", ...base, createTarget: entry.createTarget };
    case "yuque":
      return { id: "yuque", ...base, createTarget: entry.createTarget };
    case "zhihu":
      return { id: "zhihu", ...base, createTarget: entry.createTarget };
    case "csdn":
      return { id: "csdn", ...base, createTarget: entry.createTarget };
    case "juejin":
      return { id: "juejin", ...base, createTarget: entry.createTarget };
  }
}

export function getProviderCatalog(i18n: Translator = DEFAULT_I18N): ProviderCatalogEntry[] {
  return PROVIDER_CATALOG.map((entry) => localizeProviderCatalogEntry(entry, i18n));
}

export function getProviderCatalogEntry(
  providerId: ProviderId,
  i18n: Translator = DEFAULT_I18N
): ProviderCatalogEntry | undefined {
  return getProviderCatalog(i18n).find((entry) => entry.id === providerId);
}
