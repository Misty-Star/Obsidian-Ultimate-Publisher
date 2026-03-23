import { UltimatePublisherSettings } from "../../types";
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

export function buildMarketplaceCards(
  settings: UltimatePublisherSettings,
  catalog: ProviderCatalogEntry[]
): MarketplaceCardModel[] {
  return catalog.map((entry) => {
    const configuredCount = settings.targets.filter((target) => target.provider === entry.id).length;

    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      icon: entry.icon,
      configured: configuredCount > 0,
      configuredCount,
    };
  });
}
