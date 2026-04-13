import React, { useEffect, useMemo, useRef, useState } from "react";
import { createI18n, Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS, DEFAULT_LLM_SETTINGS } from "../../settings";
import { FrontmatterAutomationSettings, LlmSettings, ProviderId, UltimatePublisherSettings } from "../../types";
import { getProviderCatalog } from "./providerCatalog";
import { buildConfiguredTargetCards } from "./settingsViewModel";
import { ConfiguredTargetsTab } from "./ConfiguredTargetsTab";
import { FrontmatterAutomationPanel } from "./FrontmatterAutomationPanel";
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
  onUpdateFrontmatterAutomationSettings: (updater: (draft: FrontmatterAutomationSettings) => void) => void | Promise<void>;
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
  onUpdateFrontmatterAutomationSettings,
}: SettingsViewProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [llmSettings, setLlmSettings] = useState<LlmSettings>(() => ({
    ...(settings.llm ?? DEFAULT_LLM_SETTINGS),
  }));
  const [frontmatterAutomationSettings, setFrontmatterAutomationSettings] = useState<FrontmatterAutomationSettings>(() => ({
    ...(settings.frontmatterAutomation ?? DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS),
  }));
  const llmSettingsRef = useRef<LlmSettings>(llmSettings);
  const llmPersistVersionRef = useRef(0);
  const frontmatterAutomationSettingsRef = useRef<FrontmatterAutomationSettings>(frontmatterAutomationSettings);
  const frontmatterPersistVersionRef = useRef(0);
  const providerCatalog = useMemo(() => getProviderCatalog(i18n), [i18n]);
  const configuredTargets = useMemo(
    () => buildConfiguredTargetCards(settings, providerCatalog),
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

  useEffect(() => {
    const nextLlmSettings = { ...(settings.llm ?? DEFAULT_LLM_SETTINGS) };
    llmSettingsRef.current = nextLlmSettings;
    setLlmSettings(nextLlmSettings);
  }, [settings.llm]);

  useEffect(() => {
    const nextFrontmatterAutomationSettings = {
      ...(settings.frontmatterAutomation ?? DEFAULT_FRONTMATTER_AUTOMATION_SETTINGS),
    };
    frontmatterAutomationSettingsRef.current = nextFrontmatterAutomationSettings;
    setFrontmatterAutomationSettings(nextFrontmatterAutomationSettings);
  }, [settings.frontmatterAutomation]);

  const handleUpdateLlmSettings = (updater: (draft: LlmSettings) => void): void => {
    const previous = llmSettingsRef.current;
    const next = { ...previous };
    updater(next);
    llmSettingsRef.current = next;
    setLlmSettings(next);

    const persistVersion = ++llmPersistVersionRef.current;
    void Promise.resolve(
      onUpdateLlmSettings((draft) => {
        Object.assign(draft, next);
      })
    ).catch(() => {
      if (llmPersistVersionRef.current !== persistVersion) {
        return;
      }
      llmSettingsRef.current = previous;
      setLlmSettings(previous);
    });
  };

  const handleUpdateFrontmatterAutomationSettings = (
    updater: (draft: FrontmatterAutomationSettings) => void
  ): void => {
    const previous = frontmatterAutomationSettingsRef.current;
    const next = { ...previous };
    updater(next);
    frontmatterAutomationSettingsRef.current = next;
    setFrontmatterAutomationSettings(next);

    const persistVersion = ++frontmatterPersistVersionRef.current;
    void Promise.resolve(
      onUpdateFrontmatterAutomationSettings((draft) => {
        Object.assign(draft, next);
      })
    ).catch(() => {
      if (frontmatterPersistVersionRef.current !== persistVersion) {
        return;
      }
      frontmatterAutomationSettingsRef.current = previous;
      setFrontmatterAutomationSettings(previous);
    });
  };

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
          <MarketplaceTab
            i18n={i18n}
            settings={settings}
            providerCatalog={providerCatalog}
            onAddProvider={onAddProvider}
          />
        ) : activeTab === "llm" ? (
          <LlmSettingsTab
            i18n={i18n}
            settings={llmSettings}
            onChange={handleUpdateLlmSettings}
          />
        ) : (
          <FrontmatterAutomationPanel
            i18n={i18n}
            settings={frontmatterAutomationSettings}
            onChange={handleUpdateFrontmatterAutomationSettings}
          />
        )}
      </div>
    </section>
  );
}
