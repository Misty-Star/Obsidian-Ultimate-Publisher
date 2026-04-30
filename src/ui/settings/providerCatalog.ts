import { getProviderDefinitions } from "../../providers/definitions";
import { ProviderCategory, ProviderId, PublishTargetConfig } from "../../types";
import { createI18n, Translator } from "../../i18n";
import { messages } from "../../i18n/messages";

interface ProviderCatalogBase {
  id: ProviderId;
  category: ProviderCategory;
  name: string;
  description: string;
  icon: string;
  createTarget: () => PublishTargetConfig;
}

interface ProviderCatalogPresentation {
  descriptionKey: string;
  descriptionFallback: {
    en: string;
    "zh-CN": string;
  };
  icon: string;
}

interface ProviderCatalogSeed extends ProviderCatalogPresentation {
  id: ProviderId;
  category: ProviderCategory;
  name: string;
  createTarget: () => PublishTargetConfig;
}

type ProviderCatalogSeedInput = {
  id: ProviderId;
  descriptionKey: string;
  descriptionFallback: {
    en: string;
    "zh-CN": string;
  };
  icon: string;
};

export type ProviderCatalogEntry = ProviderCatalogBase;

const PROVIDER_CATALOG_PRESENTATION: ProviderCatalogSeedInput[] = [
  {
    id: "wordpress",
    descriptionKey: "settings.providers.wordpress.description",
    descriptionFallback: {
      en: "REST API publishing with application password auth.",
      "zh-CN": "使用应用密码认证，通过 REST API 发布内容。",
    },
    icon: "WP",
  },
  {
    id: "yuque",
    descriptionKey: "settings.providers.yuque.description",
    descriptionFallback: {
      en: "Token-based publishing to a Yuque knowledge base.",
      "zh-CN": "使用 Token 向 Yuque 知识库发布内容。",
    },
    icon: "YQ",
  },
  {
    id: "zhihu",
    descriptionKey: "settings.providers.zhihu.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to Zhihu columns.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 Zhihu 专栏。",
    },
    icon: "ZH",
  },
  {
    id: "csdn",
    descriptionKey: "settings.providers.csdn.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to CSDN articles.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 CSDN 文章。",
    },
    icon: "CS",
  },
  {
    id: "juejin",
    descriptionKey: "settings.providers.juejin.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to Juejin posts.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 Juejin 文章。",
    },
    icon: "JJ",
  },
  {
    id: "github",
    descriptionKey: "settings.providers.github.description",
    descriptionFallback: {
      en: "Publish Markdown articles to GitHub-backed static sites such as Hugo.",
      "zh-CN": "将 Markdown 文章发布到 Hugo 等 GitHub 静态站点仓库。",
    },
    icon: "GH",
  },
  {
    id: "gitlab",
    descriptionKey: "settings.providers.gitlab.description",
    descriptionFallback: {
      en: "Publish Markdown articles to GitLab-backed static sites such as Hugo.",
      "zh-CN": "将 Markdown 文章发布到 Hugo 等 GitLab 静态站点仓库。",
    },
    icon: "GL",
  },
  {
    id: "local-filesystem",
    descriptionKey: "settings.providers.local-filesystem.description",
    descriptionFallback: {
      en: "Export static-site Markdown files to a vault-relative local folder.",
      "zh-CN": "将静态站点 Markdown 文件导出到当前库内的本地目录。",
    },
    icon: "FS",
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

function buildProviderCatalogSeed(): ProviderCatalogSeed[] {
  const presentationById = new Map<ProviderId, ProviderCatalogPresentation>(
    PROVIDER_CATALOG_PRESENTATION.map((entry) => [
      entry.id,
      {
        descriptionKey: entry.descriptionKey,
        descriptionFallback: entry.descriptionFallback,
        icon: entry.icon,
      },
    ])
  );

  return getProviderDefinitions().map((definition) => {
    const presentation = presentationById.get(definition.id);
    if (!presentation) {
      throw new Error(`Missing provider catalog presentation config for ${definition.id}`);
    }

    return {
      id: definition.id,
      category: definition.category,
      name: definition.name,
      descriptionKey: presentation.descriptionKey,
      descriptionFallback: presentation.descriptionFallback,
      icon: presentation.icon,
      createTarget: definition.createTarget,
    };
  });
}

function localizeProviderCatalogEntry(entry: ProviderCatalogSeed, i18n: Translator): ProviderCatalogEntry {
  return {
    id: entry.id,
    category: entry.category,
    name: entry.name,
    description: resolveTranslation(i18n, entry.descriptionKey, entry.descriptionFallback),
    icon: entry.icon,
    createTarget: entry.createTarget,
  };
}

export function getProviderCatalog(i18n: Translator = DEFAULT_I18N): ProviderCatalogEntry[] {
  return buildProviderCatalogSeed().map((entry) => localizeProviderCatalogEntry(entry, i18n));
}

export function getProviderCatalogEntry(
  providerId: ProviderId,
  i18n: Translator = DEFAULT_I18N
): ProviderCatalogEntry | undefined {
  return getProviderCatalog(i18n).find((entry) => entry.id === providerId);
}
