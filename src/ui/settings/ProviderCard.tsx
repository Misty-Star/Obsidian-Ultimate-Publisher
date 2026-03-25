import React from "react";
import { Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { MarketplaceCardModel } from "./settingsViewModel";

interface ProviderCardProps {
  i18n: Translator;
  provider: MarketplaceCardModel;
  onAdd: (providerId: MarketplaceCardModel["id"]) => void;
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

export function ProviderCard({ i18n, provider, onAdd }: ProviderCardProps): React.JSX.Element {
  const addLabel = resolveTranslation(i18n, "settings.provider.add", {
    en: "Add",
    "zh-CN": "添加",
  });
  const configuredLabel = resolveTranslation(i18n, "settings.provider.configured", {
    en: "Configured",
    "zh-CN": "已配置",
  });

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
          + {addLabel}
        </button>
        {provider.configured ? (
          <span className="ultimate-publisher-provider-badge">
            {configuredLabel}
            {provider.configuredCount > 1 ? ` (${provider.configuredCount})` : ""}
          </span>
        ) : null}
      </div>
    </article>
  );
}
