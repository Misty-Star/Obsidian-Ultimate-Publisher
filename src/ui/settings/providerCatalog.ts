import {
  createCsdnTarget,
  createJuejinTarget,
  createLocalExportTarget,
  createWordpressTarget,
  createYuqueTarget,
  createZhihuTarget,
} from "../../settings";
import {
  CsdnTargetConfig,
  JuejinTargetConfig,
  LocalExportTargetConfig,
  ProviderId,
  PublishTargetConfig,
  WordpressTargetConfig,
  YuqueTargetConfig,
  ZhihuTargetConfig,
} from "../../types";
import { createI18n, Translator } from "../../i18n";

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

export type ProviderCatalogEntry =
  | ProviderCatalogBase<WordpressTargetConfig>
  | ProviderCatalogBase<YuqueTargetConfig>
  | ProviderCatalogBase<LocalExportTargetConfig>
  | ProviderCatalogBase<ZhihuTargetConfig>
  | ProviderCatalogBase<CsdnTargetConfig>
  | ProviderCatalogBase<JuejinTargetConfig>;

const PROVIDER_CATALOG: ProviderCatalogSeed<PublishTargetConfig>[] = [
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
      "zh-CN": "使用 Token 向语雀知识库发布内容。",
    },
    icon: "YQ",
    createTarget: createYuqueTarget,
  },
  {
    id: "local-export",
    name: "Local Export",
    descriptionKey: "settings.providers.local-export.description",
    descriptionFallback: {
      en: "Write Markdown and copied assets to a local directory.",
      "zh-CN": "将 Markdown 与复制的资源写入本地目录。",
    },
    icon: "FS",
    createTarget: createLocalExportTarget,
  },
  {
    id: "zhihu",
    name: "Zhihu",
    descriptionKey: "settings.providers.zhihu.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to Zhihu columns.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到知乎专栏。",
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
      "zh-CN": "使用 Cookie，通过桌面网页发布到掘金文章。",
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
  const translated = i18n.t(key);
  if (translated !== key) {
    return translated;
  }
  return i18n.locale === "zh-CN" ? fallback["zh-CN"] : fallback.en;
}

export function getProviderCatalog(i18n: Translator = DEFAULT_I18N): ProviderCatalogEntry[] {
  return PROVIDER_CATALOG.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: resolveTranslation(i18n, entry.descriptionKey, entry.descriptionFallback),
    icon: entry.icon,
    createTarget: entry.createTarget,
  })) as ProviderCatalogEntry[];
}

export function getProviderCatalogEntry(
  providerId: ProviderId,
  i18n: Translator = DEFAULT_I18N
): ProviderCatalogEntry | undefined {
  return getProviderCatalog(i18n).find((entry) => entry.id === providerId);
}
