import { Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { ProviderCategory, UltimatePublisherSettings } from "../../types";
import { ProviderCatalogEntry } from "./providerCatalog";

export interface ConfiguredTargetCardModel {
  id: string;
  name: string;
  providerId: ProviderCatalogEntry["id"];
  providerName: string;
  enabled: boolean;
}

export interface MarketplaceCardModel {
  id: ProviderCatalogEntry["id"];
  name: string;
  description: string;
  icon: string;
  configured: boolean;
  configuredCount: number;
}

export interface MarketplaceCategoryModel {
  id: ProviderCategory;
  label: string;
}

const MARKETPLACE_CATEGORY_DISPLAY_ORDER: ProviderCategory[] = [
  "common",
  "github",
  "gitlab",
  "metaweblog",
  "filesystem",
  "wordpress",
  "web",
];

export function buildConfiguredTargetCards(
  settings: UltimatePublisherSettings,
  catalog: ProviderCatalogEntry[]
): ConfiguredTargetCardModel[] {
  return settings.targets.map((target) => {
    const entry = catalog.find((item) => item.id === target.provider);
    return {
      id: target.id,
      name: target.name,
      providerId: target.provider,
      providerName: entry?.name ?? target.provider,
      enabled: target.enabled,
    };
  });
}

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

function resolveMarketplaceCategoryLabel(i18n: Translator, categoryId: ProviderCategory): string {
  const key = `settings.market.category.${categoryId}`;
  switch (categoryId) {
    case "common":
      return resolveTranslation(i18n, key, { en: "Common", "zh-CN": "常用" });
    case "github":
      return resolveTranslation(i18n, key, { en: "GitHub", "zh-CN": "GitHub" });
    case "gitlab":
      return resolveTranslation(i18n, key, { en: "GitLab", "zh-CN": "GitLab" });
    case "metaweblog":
      return resolveTranslation(i18n, key, { en: "MetaWeblog", "zh-CN": "MetaWeblog" });
    case "filesystem":
      return resolveTranslation(i18n, key, { en: "Filesystem", "zh-CN": "文件系统" });
    case "wordpress":
      return resolveTranslation(i18n, key, { en: "WordPress", "zh-CN": "WordPress" });
    case "web":
      return resolveTranslation(i18n, key, { en: "Web", "zh-CN": "网页" });
  }
}

export function buildMarketplaceCategories(
  catalog: ProviderCatalogEntry[],
  i18n: Translator
): MarketplaceCategoryModel[] {
  const categoriesWithProviders = new Set(catalog.map((entry) => entry.category));
  return MARKETPLACE_CATEGORY_DISPLAY_ORDER.filter((categoryId) => categoriesWithProviders.has(categoryId)).map(
    (categoryId) => ({
      id: categoryId,
      label: resolveMarketplaceCategoryLabel(i18n, categoryId),
    })
  );
}

export function buildMarketplaceCards(
  settings: UltimatePublisherSettings,
  catalog: ProviderCatalogEntry[]
): MarketplaceCardModel[] {
  return catalog.map((entry) => buildMarketplaceCard(settings, entry));
}

export function buildMarketplaceCardsForCategory(
  settings: UltimatePublisherSettings,
  catalog: ProviderCatalogEntry[],
  categoryId: ProviderCategory
): MarketplaceCardModel[] {
  return catalog
    .filter((entry) => entry.category === categoryId)
    .map((entry) => buildMarketplaceCard(settings, entry));
}

function buildMarketplaceCard(
  settings: UltimatePublisherSettings,
  entry: ProviderCatalogEntry
): MarketplaceCardModel {
  const configuredCount = settings.targets.filter((target) => target.provider === entry.id).length;

  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    icon: entry.icon,
    configured: configuredCount > 0,
    configuredCount,
  };
}
