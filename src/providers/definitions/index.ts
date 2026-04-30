import { ProviderId } from "../../types";
import { yuqueDefinition } from "./common";
import {
  confluenceDefinition,
  haloDefinition,
  notionDefinition,
  telegraphDefinition,
} from "./api";
import { ProviderDefinitionMap, AnyProviderDefinition } from "./types";
import {
  bilibiliDefinition,
  csdnDefinition,
  haloWebDefinition,
  jianshuDefinition,
  juejinDefinition,
  wechatDefinition,
  xiaohongshuDefinition,
  zhihuDefinition,
} from "./web";
import { wordpressDefinition } from "./wordpress";
import { cnblogsDefinition, jvueDefinition, metaweblogDefinition, typechoDefinition, wordpressComDefinition } from "./metaweblog";
import { githubStaticSiteDefinitions, gitlabStaticSiteDefinitions } from "./staticSite";

const providerDefinitionsById = {
  wordpress: wordpressDefinition,
  "wordpress-com": wordpressComDefinition,
  metaweblog: metaweblogDefinition,
  cnblogs: cnblogsDefinition,
  typecho: typechoDefinition,
  jvue: jvueDefinition,
  yuque: yuqueDefinition,
  notion: notionDefinition,
  halo: haloDefinition,
  telegraph: telegraphDefinition,
  confluence: confluenceDefinition,
  zhihu: zhihuDefinition,
  csdn: csdnDefinition,
  juejin: juejinDefinition,
  jianshu: jianshuDefinition,
  wechat: wechatDefinition,
  "halo-web": haloWebDefinition,
  bilibili: bilibiliDefinition,
  xiaohongshu: xiaohongshuDefinition,
  ...githubStaticSiteDefinitions,
  ...gitlabStaticSiteDefinitions,
} satisfies ProviderDefinitionMap;

const providerDisplayOrder: ProviderId[] = [
  "wordpress",
  "wordpress-com",
  "metaweblog",
  "cnblogs",
  "typecho",
  "jvue",
  "yuque",
  "notion",
  "halo",
  "telegraph",
  "confluence",
  "zhihu",
  "csdn",
  "juejin",
  "jianshu",
  "wechat",
  "halo-web",
  "bilibili",
  "xiaohongshu",
  "github-hugo",
  "github-hexo",
  "github-jekyll",
  "github-vuepress",
  "github-vuepress2",
  "github-vitepress",
  "github-quartz",
  "gitlab-hugo",
  "gitlab-hexo",
  "gitlab-jekyll",
  "gitlab-vuepress",
  "gitlab-vuepress2",
  "gitlab-vitepress",
];

export function getProviderDefinitions(): AnyProviderDefinition[] {
  return providerDisplayOrder.map(
    (providerId) => providerDefinitionsById[providerId],
  );
}

export function getProviderDefinition<TId extends ProviderId>(
  providerId: TId,
): ProviderDefinitionMap[TId] {
  return providerDefinitionsById[providerId];
}

export type {
  AnyProviderDefinition,
  AnyProviderPublishDraft,
  ProviderCapabilities,
  ProviderCapabilityFlag,
  ProviderDefinition,
  ProviderDefinitionMap,
  ProviderDraftById,
  ProviderNormalPublishDefinition,
  ProviderSettingsFieldDefinition,
  ProviderSettingsFieldKey,
  ProviderSettingsFieldOption,
  ProviderSettingsFieldType,
  ProviderSettingsForm,
  ProviderTargetById,
} from "./types";
export { hasNormalPublishDefinition } from "./types";
