import React, { useMemo, useState } from "react";
import { createI18n, Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { DEFAULT_LLM_SETTINGS } from "../../settings";
import { LlmSettings, ProviderId, UltimatePublisherSettings } from "../../types";
import { getProviderCatalog } from "./providerCatalog";
import { buildConfiguredTargetCards, buildMarketplaceCards } from "./settingsViewModel";
import { ConfiguredTargetsTab } from "./ConfiguredTargetsTab";
import { LlmSettingsTab } from "./LlmSettingsTab";
import { MarketplaceTab } from "./MarketplaceTab";
import { SettingsTabId, TabBar } from "./TabBar";

interface SettingsViewProps {
  i18n?: Translator;
  settings: UltimatePublisherSettings;
  initialTab?: SettingsTabId;
  onAddProvider: (providerId: ProviderId) => void;
  onEditTarget: (targetId: string) => void;
  onDeleteTarget: (targetId: string) => void;
  onUpdateLlmSettings: (updater: (draft: LlmSettings) => void) => void | Promise<void>;
}

const DEFAULT_I18N = createI18n("en");

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

export function SettingsView({
  i18n = DEFAULT_I18N,
  settings,
  initialTab = "configured",
  onAddProvider,
  onEditTarget,
  onDeleteTarget,
  onUpdateLlmSettings,
}: SettingsViewProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const providerCatalog = useMemo(() => getProviderCatalog(i18n), [i18n]);
  const configuredTargets = useMemo(
    () => buildConfiguredTargetCards(settings, providerCatalog),
    [providerCatalog, settings]
  );
  const marketplaceProviders = useMemo(
    () => buildMarketplaceCards(settings, providerCatalog),
    [providerCatalog, settings]
  );
  const headerDescription = resolveTranslation(
    i18n,
    "settings.view.description",
    {
      en: "Configure one or more targets, then publish the active note through the command palette or ribbon menu.",
      "zh-CN": "先配置一个或多个目标，再通过命令面板或功能区菜单发布当前笔记。",
    }
  );

  return (
    <section className="ultimate-publisher-settings-page">
      <header className="ultimate-publisher-settings-header">
        <h2>Ultimate Publisher</h2>
        <p>{headerDescription}</p>
      </header>
      <TabBar i18n={i18n} activeTab={activeTab} onSelectTab={setActiveTab} />
      <div className="ultimate-publisher-settings-panel">
        {activeTab === "configured" ? (
          <ConfiguredTargetsTab
            i18n={i18n}
            targets={configuredTargets}
            onEditTarget={onEditTarget}
            onDeleteTarget={onDeleteTarget}
          />
        ) : activeTab === "marketplace" ? (
          <MarketplaceTab i18n={i18n} providers={marketplaceProviders} onAddProvider={onAddProvider} />
        ) : (
          <LlmSettingsTab
            i18n={i18n}
            settings={settings.llm ?? DEFAULT_LLM_SETTINGS}
            onChange={onUpdateLlmSettings}
          />
        )}
      </div>
    </section>
  );
}
