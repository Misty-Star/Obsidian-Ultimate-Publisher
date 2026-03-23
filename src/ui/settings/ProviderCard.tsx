import React from "react";
import { MarketplaceCardModel } from "./settingsViewModel";

interface ProviderCardProps {
  provider: MarketplaceCardModel;
  onAdd: (providerId: MarketplaceCardModel["id"]) => void;
}

export function ProviderCard({ provider, onAdd }: ProviderCardProps): React.JSX.Element {
  return (
    <article className="ultimate-publisher-provider-card">
      <div className="ultimate-publisher-provider-icon" aria-hidden="true">
        {provider.icon}
      </div>
      <div className="ultimate-publisher-provider-copy">
        <h3>{provider.name}</h3>
        <p>{provider.description}</p>
      </div>
      <div className="ultimate-publisher-provider-card-footer">
        <button type="button" onClick={() => onAdd(provider.id)}>
          + Add
        </button>
        {provider.configured ? (
          <span className="ultimate-publisher-provider-badge">
            Configured
            {provider.configuredCount > 1 ? ` (${provider.configuredCount})` : ""}
          </span>
        ) : null}
      </div>
    </article>
  );
}
