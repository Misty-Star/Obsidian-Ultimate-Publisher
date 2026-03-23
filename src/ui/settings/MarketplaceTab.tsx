import React from "react";
import { MarketplaceCardModel } from "./settingsViewModel";
import { ProviderCard } from "./ProviderCard";

interface MarketplaceTabProps {
  providers: MarketplaceCardModel[];
  onAddProvider: (providerId: MarketplaceCardModel["id"]) => void;
}

export function MarketplaceTab({ providers, onAddProvider }: MarketplaceTabProps): React.JSX.Element {
  return (
    <div className="ultimate-publisher-provider-grid">
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} onAdd={onAddProvider} />
      ))}
    </div>
  );
}
