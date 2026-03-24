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

interface ProviderCatalogBase<TTarget extends PublishTargetConfig> {
  id: TTarget["provider"];
  name: string;
  description: string;
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

const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: "wordpress",
    name: "WordPress",
    description: "REST API publishing with application password auth.",
    icon: "WP",
    createTarget: createWordpressTarget,
  },
  {
    id: "yuque",
    name: "Yuque",
    description: "Token-based publishing to a Yuque knowledge base.",
    icon: "YQ",
    createTarget: createYuqueTarget,
  },
  {
    id: "local-export",
    name: "Local Export",
    description: "Write Markdown and copied assets to a local directory.",
    icon: "FS",
    createTarget: createLocalExportTarget,
  },
  {
    id: "zhihu",
    name: "Zhihu",
    description: "Cookie-based desktop web publishing to Zhihu columns.",
    icon: "ZH",
    createTarget: createZhihuTarget,
  },
  {
    id: "csdn",
    name: "CSDN",
    description: "Cookie-based desktop web publishing to CSDN articles.",
    icon: "CS",
    createTarget: createCsdnTarget,
  },
  {
    id: "juejin",
    name: "Juejin",
    description: "Cookie-based desktop web publishing to Juejin posts.",
    icon: "JJ",
    createTarget: createJuejinTarget,
  },
];

export function getProviderCatalog(): ProviderCatalogEntry[] {
  return PROVIDER_CATALOG.slice();
}

export function getProviderCatalogEntry(providerId: ProviderId): ProviderCatalogEntry | undefined {
  return PROVIDER_CATALOG.find((entry) => entry.id === providerId);
}
