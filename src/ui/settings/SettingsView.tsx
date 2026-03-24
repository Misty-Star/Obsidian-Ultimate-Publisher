import React, { useMemo, useState } from "react";
import { ProviderId, UltimatePublisherSettings } from "../../types";
import { getProviderCatalog } from "./providerCatalog";
import { buildConfiguredTargetCards, buildMarketplaceCards } from "./settingsViewModel";
import { ConfiguredTargetsTab } from "./ConfiguredTargetsTab";
import { MarketplaceTab } from "./MarketplaceTab";
import { SettingsTabId, TabBar } from "./TabBar";

interface SettingsViewProps {
  settings: UltimatePublisherSettings;
  initialTab?: SettingsTabId;
  onAddProvider: (providerId: ProviderId) => void;
  onEditTarget: (targetId: string) => void;
  onDeleteTarget: (targetId: string) => void;
}

export function SettingsView({
  settings,
  initialTab = "configured",
  onAddProvider,
  onEditTarget,
  onDeleteTarget,
}: SettingsViewProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const providerCatalog = useMemo(() => getProviderCatalog(), []);
  const configuredTargets = useMemo(
    () => buildConfiguredTargetCards(settings, providerCatalog),
    [providerCatalog, settings]
  );
  const marketplaceProviders = useMemo(
    () => buildMarketplaceCards(settings, providerCatalog),
    [providerCatalog, settings]
  );

  return (
    <section className="ultimate-publisher-settings-page">
      <header className="ultimate-publisher-settings-header">
        <h2>Ultimate Publisher</h2>
        <p>Configure one or more targets, then publish the active note through the command palette or ribbon menu.</p>
      </header>
      <TabBar activeTab={activeTab} onSelectTab={setActiveTab} />
      <div className="ultimate-publisher-settings-panel">
        {activeTab === "configured" ? (
          <ConfiguredTargetsTab
            targets={configuredTargets}
            onEditTarget={onEditTarget}
            onDeleteTarget={onDeleteTarget}
          />
        ) : (
          <MarketplaceTab providers={marketplaceProviders} onAddProvider={onAddProvider} />
        )}
      </div>
    </section>
  );
}
