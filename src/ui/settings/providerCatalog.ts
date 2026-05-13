import { getProviderDefinitions } from "../../providers/definitions";
import { ProviderCategory, ProviderId, PublishTargetConfig } from "../../types";
import { createI18n, Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { providerIcons } from "./providerIcons";

interface LocalizedCatalogText {
  key: string;
  fallback: {
    en: string;
    "zh-CN": string;
  };
}

interface ProviderCatalogBase {
  id: ProviderId;
  category: ProviderCategory;
  name: string;
  description: string;
  icon: string;
  createTarget: () => PublishTargetConfig;
}

interface ProviderCatalogPresentation {
  name: LocalizedCatalogText;
  description: LocalizedCatalogText;
  icon: string;
}

interface ProviderCatalogSeed extends ProviderCatalogPresentation {
  id: ProviderId;
  category: ProviderCategory;
  createTarget: () => PublishTargetConfig;
}

type ProviderCatalogSeedInput = {
  id: ProviderId;
  nameKey: string;
  nameFallback: {
    en: string;
    "zh-CN": string;
  };
  descriptionKey: string;
  descriptionFallback: {
    en: string;
    "zh-CN": string;
  };
};

export type ProviderCatalogEntry = ProviderCatalogBase;

const PROVIDER_CATALOG_PRESENTATION: ProviderCatalogSeedInput[] = [
  {
    id: "wordpress",
    nameKey: "settings.providers.wordpress.name",
    nameFallback: { en: "WordPress", "zh-CN": "WordPress" },
    descriptionKey: "settings.providers.wordpress.description",
    descriptionFallback: {
      en: "REST API publishing with application password auth.",
      "zh-CN": "使用应用密码认证，通过 REST API 发布内容。",
    },
  },
  {
    id: "wordpress-com",
    nameKey: "settings.providers.wordpress-com.name",
    nameFallback: { en: "WordPress.com", "zh-CN": "WordPress.com" },
    descriptionKey: "settings.providers.wordpress-com.description",
    descriptionFallback: {
      en: "Publish posts to WordPress.com-compatible XML-RPC endpoints.",
      "zh-CN": "通过兼容 WordPress.com 的 XML-RPC endpoint 发布文章。",
    },
  },
  {
    id: "metaweblog",
    nameKey: "settings.providers.metaweblog.name",
    nameFallback: { en: "MetaWeblog", "zh-CN": "MetaWeblog" },
    descriptionKey: "settings.providers.metaweblog.description",
    descriptionFallback: {
      en: "Generic MetaWeblog XML-RPC publishing for compatible blogs.",
      "zh-CN": "通过通用 MetaWeblog XML-RPC 协议发布到兼容博客。",
    },
  },
  {
    id: "cnblogs",
    nameKey: "settings.providers.cnblogs.name",
    nameFallback: { en: "CNBlogs", "zh-CN": "博客园" },
    descriptionKey: "settings.providers.cnblogs.description",
    descriptionFallback: {
      en: "Publish articles to CNBlogs through its XML-RPC endpoint.",
      "zh-CN": "通过博客园 XML-RPC endpoint 发布文章。",
    },
  },
  {
    id: "typecho",
    nameKey: "settings.providers.typecho.name",
    nameFallback: { en: "Typecho", "zh-CN": "Typecho" },
    descriptionKey: "settings.providers.typecho.description",
    descriptionFallback: {
      en: "Publish posts to Typecho XML-RPC compatible sites.",
      "zh-CN": "发布到兼容 Typecho XML-RPC 的站点。",
    },
  },
  {
    id: "jvue",
    nameKey: "settings.providers.jvue.name",
    nameFallback: { en: "Jvue", "zh-CN": "Jvue" },
    descriptionKey: "settings.providers.jvue.description",
    descriptionFallback: {
      en: "Publish posts to Jvue-compatible XML-RPC blogs.",
      "zh-CN": "发布到兼容 Jvue XML-RPC 的博客。",
    },
  },
  {
    id: "yuque",
    nameKey: "settings.providers.yuque.name",
    nameFallback: { en: "Yuque", "zh-CN": "语雀" },
    descriptionKey: "settings.providers.yuque.description",
    descriptionFallback: {
      en: "Token-based publishing to a Yuque knowledge base.",
      "zh-CN": "使用 Token 向 Yuque 知识库发布内容。",
    },
  },
  {
    id: "notion",
    nameKey: "settings.providers.notion.name",
    nameFallback: { en: "Notion", "zh-CN": "Notion" },
    descriptionKey: "settings.providers.notion.description",
    descriptionFallback: {
      en: "Publish pages to Notion through the official API.",
      "zh-CN": "通过官方 API 将页面发布到 Notion。",
    },
  },
  {
    id: "halo",
    nameKey: "settings.providers.halo.name",
    nameFallback: { en: "Halo API", "zh-CN": "Halo API" },
    descriptionKey: "settings.providers.halo.description",
    descriptionFallback: {
      en: "Publish Markdown posts to Halo through its API.",
      "zh-CN": "通过 Halo API 发布 Markdown 文章。",
    },
  },
  {
    id: "telegraph",
    nameKey: "settings.providers.telegraph.name",
    nameFallback: { en: "Telegraph", "zh-CN": "Telegraph" },
    descriptionKey: "settings.providers.telegraph.description",
    descriptionFallback: {
      en: "Publish lightweight pages to Telegraph.",
      "zh-CN": "将轻量页面发布到 Telegraph。",
    },
  },
  {
    id: "confluence",
    nameKey: "settings.providers.confluence.name",
    nameFallback: { en: "Confluence", "zh-CN": "Confluence" },
    descriptionKey: "settings.providers.confluence.description",
    descriptionFallback: {
      en: "Publish pages to Confluence spaces with API token auth.",
      "zh-CN": "使用 API Token 将页面发布到 Confluence 空间。",
    },
  },
  {
    id: "zhihu",
    nameKey: "settings.providers.zhihu.name",
    nameFallback: { en: "Zhihu", "zh-CN": "知乎" },
    descriptionKey: "settings.providers.zhihu.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to Zhihu columns.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 Zhihu 专栏。",
    },
  },
  {
    id: "csdn",
    nameKey: "settings.providers.csdn.name",
    nameFallback: { en: "CSDN", "zh-CN": "CSDN" },
    descriptionKey: "settings.providers.csdn.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to CSDN articles.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 CSDN 文章。",
    },
  },
  {
    id: "juejin",
    nameKey: "settings.providers.juejin.name",
    nameFallback: { en: "Juejin", "zh-CN": "掘金" },
    descriptionKey: "settings.providers.juejin.description",
    descriptionFallback: {
      en: "Cookie-based desktop web publishing to Juejin posts.",
      "zh-CN": "使用 Cookie，通过桌面网页发布到 Juejin 文章。",
    },
  },
  {
    id: "jianshu",
    nameKey: "settings.providers.jianshu.name",
    nameFallback: { en: "Jianshu", "zh-CN": "简书" },
    descriptionKey: "settings.providers.jianshu.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to Jianshu articles.",
      "zh-CN": "使用 Cookie，通过网页接口发布到简书文章。",
    },
  },
  {
    id: "wechat",
    nameKey: "settings.providers.wechat.name",
    nameFallback: { en: "WeChat Official Account", "zh-CN": "微信公众号" },
    descriptionKey: "settings.providers.wechat.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to WeChat Official Account drafts.",
      "zh-CN": "使用 Cookie，通过网页接口发布到微信公众号草稿。",
    },
  },
  {
    id: "halo-web",
    nameKey: "settings.providers.halo-web.name",
    nameFallback: { en: "Halo Web", "zh-CN": "Halo 网页版" },
    descriptionKey: "settings.providers.halo-web.description",
    descriptionFallback: {
      en: "Cookie-based Halo console publishing for web-auth deployments.",
      "zh-CN": "使用 Cookie，通过 Halo 控制台网页接口发布内容。",
    },
  },
  {
    id: "bilibili",
    nameKey: "settings.providers.bilibili.name",
    nameFallback: { en: "Bilibili", "zh-CN": "哔哩哔哩" },
    descriptionKey: "settings.providers.bilibili.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to Bilibili articles.",
      "zh-CN": "使用 Cookie，通过网页接口发布到 Bilibili 专栏。",
    },
  },
  {
    id: "xiaohongshu",
    nameKey: "settings.providers.xiaohongshu.name",
    nameFallback: { en: "Xiaohongshu", "zh-CN": "小红书" },
    descriptionKey: "settings.providers.xiaohongshu.description",
    descriptionFallback: {
      en: "Cookie-based web publishing to Xiaohongshu notes without arbitrary script injection.",
      "zh-CN": "使用 Cookie，通过受控网页接口发布到小红书笔记，不引入任意脚本执行。",
    },
  },
  {
    id: "github-hugo",
    nameKey: "settings.providers.github-hugo.name",
    nameFallback: { en: "GitHub Hugo", "zh-CN": "GitHub Hugo" },
    descriptionKey: "settings.providers.github-hugo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Hugo site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Hugo 站点。",
    },
  },
  {
    id: "github-hexo",
    nameKey: "settings.providers.github-hexo.name",
    nameFallback: { en: "GitHub Hexo", "zh-CN": "GitHub Hexo" },
    descriptionKey: "settings.providers.github-hexo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Hexo site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Hexo 站点。",
    },
  },
  {
    id: "github-jekyll",
    nameKey: "settings.providers.github-jekyll.name",
    nameFallback: { en: "GitHub Jekyll", "zh-CN": "GitHub Jekyll" },
    descriptionKey: "settings.providers.github-jekyll.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Jekyll site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Jekyll 站点。",
    },
  },
  {
    id: "github-vuepress",
    nameKey: "settings.providers.github-vuepress.name",
    nameFallback: { en: "GitHub VuePress", "zh-CN": "GitHub VuePress" },
    descriptionKey: "settings.providers.github-vuepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed VuePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 VuePress 站点。",
    },
  },
  {
    id: "github-vuepress2",
    nameKey: "settings.providers.github-vuepress2.name",
    nameFallback: { en: "GitHub VuePress 2", "zh-CN": "GitHub VuePress 2" },
    descriptionKey: "settings.providers.github-vuepress2.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed VuePress 2 site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 VuePress 2 站点。",
    },
  },
  {
    id: "github-vitepress",
    nameKey: "settings.providers.github-vitepress.name",
    nameFallback: { en: "GitHub VitePress", "zh-CN": "GitHub VitePress" },
    descriptionKey: "settings.providers.github-vitepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed VitePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 VitePress 站点。",
    },
  },
  {
    id: "github-quartz",
    nameKey: "settings.providers.github-quartz.name",
    nameFallback: { en: "GitHub Quartz", "zh-CN": "GitHub Quartz" },
    descriptionKey: "settings.providers.github-quartz.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitHub-backed Quartz site.",
      "zh-CN": "将 Markdown 文章发布到 GitHub 托管的 Quartz 站点。",
    },
  },
  {
    id: "gitlab-hugo",
    nameKey: "settings.providers.gitlab-hugo.name",
    nameFallback: { en: "GitLab Hugo", "zh-CN": "GitLab Hugo" },
    descriptionKey: "settings.providers.gitlab-hugo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed Hugo site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 Hugo 站点。",
    },
  },
  {
    id: "gitlab-hexo",
    nameKey: "settings.providers.gitlab-hexo.name",
    nameFallback: { en: "GitLab Hexo", "zh-CN": "GitLab Hexo" },
    descriptionKey: "settings.providers.gitlab-hexo.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed Hexo site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 Hexo 站点。",
    },
  },
  {
    id: "gitlab-jekyll",
    nameKey: "settings.providers.gitlab-jekyll.name",
    nameFallback: { en: "GitLab Jekyll", "zh-CN": "GitLab Jekyll" },
    descriptionKey: "settings.providers.gitlab-jekyll.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed Jekyll site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 Jekyll 站点。",
    },
  },
  {
    id: "gitlab-vuepress",
    nameKey: "settings.providers.gitlab-vuepress.name",
    nameFallback: { en: "GitLab VuePress", "zh-CN": "GitLab VuePress" },
    descriptionKey: "settings.providers.gitlab-vuepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed VuePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 VuePress 站点。",
    },
  },
  {
    id: "gitlab-vuepress2",
    nameKey: "settings.providers.gitlab-vuepress2.name",
    nameFallback: { en: "GitLab VuePress 2", "zh-CN": "GitLab VuePress 2" },
    descriptionKey: "settings.providers.gitlab-vuepress2.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed VuePress 2 site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 VuePress 2 站点。",
    },
  },
  {
    id: "gitlab-vitepress",
    nameKey: "settings.providers.gitlab-vitepress.name",
    nameFallback: { en: "GitLab VitePress", "zh-CN": "GitLab VitePress" },
    descriptionKey: "settings.providers.gitlab-vitepress.description",
    descriptionFallback: {
      en: "Publish Markdown articles to a GitLab-backed VitePress site.",
      "zh-CN": "将 Markdown 文章发布到 GitLab 托管的 VitePress 站点。",
    },
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

function localizeCatalogText(
  text: LocalizedCatalogText,
  i18n: Translator,
): string {
  return resolveTranslation(i18n, text.key, text.fallback);
}

function buildProviderCatalogSeed(): ProviderCatalogSeed[] {
  const presentationById = new Map<ProviderId, ProviderCatalogPresentation>(
    PROVIDER_CATALOG_PRESENTATION.map((entry) => [
      entry.id,
      {
        name: {
          key: entry.nameKey,
          fallback: entry.nameFallback,
        },
        description: {
          key: entry.descriptionKey,
          fallback: entry.descriptionFallback,
        },
        icon: providerIcons[entry.id],
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
      name: presentation.name,
      description: presentation.description,
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
    name: localizeCatalogText(entry.name, i18n),
    description: localizeCatalogText(entry.description, i18n),
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

export function createProviderTargetDraft(
  entry: ProviderCatalogEntry,
): PublishTargetConfig {
  return {
    ...entry.createTarget(),
    name: entry.name,
  };
}
