import { createLocalExportTarget, createWordpressTarget, createYuqueTarget } from "../../settings";
import { LocalExportTargetConfig, ProviderId, PublishTargetConfig, WordpressTargetConfig, YuqueTargetConfig } from "../../types";

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
  | ProviderCatalogBase<LocalExportTargetConfig>;

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
];

export function getProviderCatalog(): ProviderCatalogEntry[] {
  return PROVIDER_CATALOG.slice();
}

export function getProviderCatalogEntry(providerId: ProviderId): ProviderCatalogEntry | undefined {
  return PROVIDER_CATALOG.find((entry) => entry.id === providerId);
}
