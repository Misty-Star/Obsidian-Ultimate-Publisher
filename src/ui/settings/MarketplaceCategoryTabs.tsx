import React from "react";
import { ProviderCategory } from "../../types";
import { MarketplaceCategoryModel } from "./settingsViewModel";

interface MarketplaceCategoryTabsProps {
  categories: MarketplaceCategoryModel[];
  activeCategory: ProviderCategory | null;
  onSelectCategory: (categoryId: ProviderCategory) => void;
  ariaLabel: string;
}

export function MarketplaceCategoryTabs({
  categories,
  activeCategory,
  onSelectCategory,
  ariaLabel,
}: MarketplaceCategoryTabsProps): React.JSX.Element {
  return (
    <div className="ultimate-publisher-marketplace-tabs" role="tablist" aria-label={ariaLabel}>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          className={`ultimate-publisher-marketplace-tab ${activeCategory === category.id ? "is-active" : ""}`.trim()}
          aria-selected={activeCategory === category.id}
          onClick={() => onSelectCategory(category.id)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
