import React from "react";
import { Translator } from "../../i18n";
import { MarketplaceCardModel } from "./settingsViewModel";
import { ProviderCard } from "./ProviderCard";

interface MarketplaceTabProps {
  i18n: Translator;
  providers: MarketplaceCardModel[];
  onAddProvider: (providerId: MarketplaceCardModel["id"]) => void;
}

export function MarketplaceTab({ i18n, providers, onAddProvider }: MarketplaceTabProps): React.JSX.Element {
  return (
    <div className="ultimate-publisher-provider-grid">
      {providers.map((provider) => (
        <ProviderCard i18n={i18n} key={provider.id} provider={provider} onAdd={onAddProvider} />
      ))}
    </div>
  );
}
