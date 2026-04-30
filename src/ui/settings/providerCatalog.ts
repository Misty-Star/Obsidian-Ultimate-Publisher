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
    id: "wordpress-com",
    descriptionKey: "settings.providers.wordpress-com.description",
    descriptionFallback: {
      en: "Publish posts to WordPress.com-compatible XML-RPC endpoints.",
      "zh-CN": "通过兼容 WordPress.com 的 XML-RPC endpoint 发布文章。",
    },
    icon: "WC",
  },
  {
    id: "metaweblog",
    descriptionKey: "settings.providers.metaweblog.description",
    descriptionFallback: {
      en: "Generic MetaWeblog XML-RPC publishing for compatible blogs.",
      "zh-CN": "通过通用 MetaWeblog XML-RPC 协议发布到兼容博客。",
    },
    icon: "MW",
  },
  {
    id: "cnblogs",
    descriptionKey: "settings.providers.cnblogs.description",
    descriptionFallback: {
      en: "Publish articles to CNBlogs through its XML-RPC endpoint.",
      "zh-CN": "通过博客园 XML-RPC endpoint 发布文章。",
    },
    icon: "CN",
  },
  {
    id: "typecho",
    descriptionKey: "settings.providers.typecho.description",
    descriptionFallback: {
      en: "Publish posts to Typecho XML-RPC compatible sites.",
      "zh-CN": "发布到兼容 Typecho XML-RPC 的站点。",
    },
    icon: "TY",
  },
  {
    id: "jvue",
    descriptionKey: "settings.providers.jvue.description",
    descriptionFallback: {
      en: "Publish posts to Jvue-compatible XML-RPC blogs.",
      "zh-CN": "发布到兼容 Jvue XML-RPC 的博客。",
    },
    icon: "JV",
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
    id: "notion",
    descriptionKey: "settings.providers.notion.description",
    descriptionFallback: {
      en: "Publish pages to Notion through the official API.",
      "zh-CN": "通过官方 API 将页面发布到 Notion。",
    },
    icon: "NO",
  },
  {
    id: "halo",
    descriptionKey: "settings.providers.halo.description",
    descriptionFallback: {
      en: "Publish Markdown posts to Halo through its API.",
      "zh-CN": "通过 Halo API 发布 Markdown 文章。",
    },
    icon: "HA",
  },
  {
    id: "telegraph",
    descriptionKey: "settings.providers.telegraph.description",
    descriptionFallback: {
      en: "Publish lightweight pages to Telegraph.",
      "zh-CN": "将轻量页面发布到 Telegraph。",
    },
    icon: "TG",
  },
  {
    id: "confluence",
    descriptionKey: "settings.providers.confluence.description",
    descriptionFallback: {
      en: "Publish pages to Confluence spaces with API token auth.",
      "zh-CN": "使用 API Token 将页面发布到 Confluence 空间。",
    },
    icon: "CF",
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
    id: "jianshu",
    descriptionKey: "settings.providers.jianshu.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to Jianshu articles.",
      "zh-CN": "使用 Cookie，通过网页接口发布到简书文章。",
    },
    icon: "JS",
  },
  {
    id: "wechat",
    descriptionKey: "settings.providers.wechat.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to WeChat Official Account drafts.",
      "zh-CN": "使用 Cookie，通过网页接口发布到微信公众号草稿。",
    },
    icon: "WX",
  },
  {
    id: "halo-web",
    descriptionKey: "settings.providers.halo-web.description",
    descriptionFallback: {
      en: "Cookie-based Halo console publishing for web-auth deployments.",
      "zh-CN": "使用 Cookie，通过 Halo 控制台网页接口发布内容。",
    },
    icon: "HW",
  },
  {
    id: "bilibili",
    descriptionKey: "settings.providers.bilibili.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to Bilibili articles.",
      "zh-CN": "使用 Cookie，通过网页接口发布到 Bilibili 专栏。",
    },
    icon: "BL",
  },
  {
    id: "xiaohongshu",
    descriptionKey: "settings.providers.xiaohongshu.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to Xiaohongshu notes without arbitrary script injection.",
      "zh-CN":
        "使用 Cookie，通过受控网页接口发布到小红书笔记，不引入任意脚本执行。",
    },
    icon: "XH",
  },
  {
    id: "github-hugo",
    descriptionKey: "settings.providers.github-hugo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Hugo site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Hugo 站点。",
    },
    icon: "GH",
  },
  {
    id: "github-hexo",
    descriptionKey: "settings.providers.github-hexo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Hexo site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Hexo 站点。",
    },
    icon: "GH",
  },
  {
    id: "github-jekyll",
    descriptionKey: "settings.providers.github-jekyll.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Jekyll site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Jekyll 站点。",
    },
    icon: "GH",
  },
  {
    id: "github-vuepress",
    descriptionKey: "settings.providers.github-vuepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed VuePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 VuePress 站点。",
    },
    icon: "GH",
  },
  {
    id: "github-vuepress2",
    descriptionKey: "settings.providers.github-vuepress2.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed VuePress 2 site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 VuePress 2 站点。",
    },
    icon: "GH",
  },
  {
    id: "github-vitepress",
    descriptionKey: "settings.providers.github-vitepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed VitePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 VitePress 站点。",
    },
    icon: "GH",
  },
  {
    id: "github-quartz",
    descriptionKey: "settings.providers.github-quartz.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Quartz site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Quartz 站点。",
    },
    icon: "GH",
  },
  {
    id: "gitlab-hugo",
    descriptionKey: "settings.providers.gitlab-hugo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed Hugo site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 Hugo 站点。",
    },
    icon: "GL",
  },
  {
    id: "gitlab-hexo",
    descriptionKey: "settings.providers.gitlab-hexo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed Hexo site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 Hexo 站点。",
    },
    icon: "GL",
  },
  {
    id: "gitlab-jekyll",
    descriptionKey: "settings.providers.gitlab-jekyll.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed Jekyll site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 Jekyll 站点。",
    },
    icon: "GL",
  },
  {
    id: "gitlab-vuepress",
    descriptionKey: "settings.providers.gitlab-vuepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed VuePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 VuePress 站点。",
    },
    icon: "GL",
  },
  {
    id: "gitlab-vuepress2",
    descriptionKey: "settings.providers.gitlab-vuepress2.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed VuePress 2 site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 VuePress 2 站点。",
    },
    icon: "GL",
  },
  {
    id: "gitlab-vitepress",
    descriptionKey: "settings.providers.gitlab-vitepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed VitePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 VitePress 站点。",
    },
    icon: "GL",
  },
];


const DEFAULT_I18N = createI18n("en");

function resolveTranslation(
  i18n: Translator,
  key: string,
  fallback: { en: string; "zh-CN": string },
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
    ]),
  );

  return getProviderDefinitions().map((definition) => {
    const presentation = presentationById.get(definition.id);
    if (!presentation) {
      throw new Error(
        `Missing provider catalog presentation config for ${definition.id}`,
      );
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

function localizeProviderCatalogEntry(
  entry: ProviderCatalogSeed,
  i18n: Translator,
): ProviderCatalogEntry {
  return {
    id: entry.id,
    category: entry.category,
    name: entry.name,
    description: resolveTranslation(
      i18n,
      entry.descriptionKey,
      entry.descriptionFallback,
    ),
    icon: entry.icon,
    createTarget: entry.createTarget,
  };
}

export function getProviderCatalog(
  i18n: Translator = DEFAULT_I18N,
): ProviderCatalogEntry[] {
  return buildProviderCatalogSeed().map((entry) =>
    localizeProviderCatalogEntry(entry, i18n),
  );
}

export function getProviderCatalogEntry(
  providerId: ProviderId,
  i18n: Translator = DEFAULT_I18N,
): ProviderCatalogEntry | undefined {
  return getProviderCatalog(i18n).find((entry) => entry.id === providerId);
}
