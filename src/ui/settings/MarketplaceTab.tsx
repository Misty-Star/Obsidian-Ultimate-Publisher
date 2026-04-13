import React, { useEffect, useMemo, useState } from "react";
import { Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { ProviderCategory, UltimatePublisherSettings } from "../../types";
import { ProviderCatalogEntry } from "./providerCatalog";
import { MarketplaceCategoryTabs } from "./MarketplaceCategoryTabs";
import { buildMarketplaceCardsForCategory, buildMarketplaceCategories } from "./settingsViewModel";
import { ProviderCard } from "./ProviderCard";

interface MarketplaceTabProps {
  i18n: Translator;
  settings: UltimatePublisherSettings;
  providerCatalog: ProviderCatalogEntry[];
  onAddProvider: (providerId: ProviderCatalogEntry["id"]) => void;
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

export function MarketplaceTab({
  i18n,
  settings,
  providerCatalog,
  onAddProvider,
}: MarketplaceTabProps): React.JSX.Element {
  const categories = useMemo(() => buildMarketplaceCategories(providerCatalog, i18n), [providerCatalog, i18n]);
  const [activeCategory, setActiveCategory] = useState<ProviderCategory | null>(() => categories[0]?.id ?? null);

  useEffect(() => {
    if (activeCategory && categories.some((category) => category.id === activeCategory)) {
      return;
    }
    setActiveCategory(categories[0]?.id ?? null);
  }, [activeCategory, categories]);

  const providers = useMemo(() => {
    if (!activeCategory) {
      return [];
    }
    return buildMarketplaceCardsForCategory(settings, providerCatalog, activeCategory);
  }, [activeCategory, providerCatalog, settings]);
  const categoryTabsAriaLabel = resolveTranslation(i18n, "settings.market.category.tablistAria", {
    en: "Marketplace category tabs",
    "zh-CN": "市场分类标签",
  });

  return (
    <div className="ultimate-publisher-settings-shell">
      <MarketplaceCategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        ariaLabel={categoryTabsAriaLabel}
      />
      <div className="ultimate-publisher-provider-grid">
        {providers.map((provider) => (
          <ProviderCard i18n={i18n} key={provider.id} provider={provider} onAdd={onAddProvider} />
        ))}
      </div>
    </div>
  );
}
