import React from "react";
import { Translator } from "../../i18n";
import { messages } from "../../i18n/messages";

export type SettingsTabId = "configured" | "marketplace" | "llm";

interface TabBarProps {
  i18n: Translator;
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
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

export function TabBar({ i18n, activeTab, onSelectTab }: TabBarProps): React.JSX.Element {
  const tabs: Array<{ id: SettingsTabId; label: string }> = [
    {
      id: "configured",
      label: resolveTranslation(i18n, "settings.tab.configured", {
        en: "Configured Targets",
        "zh-CN": "已配置目标",
      }),
    },
    {
      id: "marketplace",
      label: resolveTranslation(i18n, "settings.tab.marketplace", {
        en: "Marketplace",
        "zh-CN": "市场",
      }),
    },
    {
      id: "llm",
      label: resolveTranslation(i18n, "settings.tab.llm", {
        en: "AI",
        "zh-CN": "AI",
      }),
    },
  ];
  const tabAriaLabel = resolveTranslation(i18n, "settings.tab.aria", {
    en: "Ultimate Publisher settings tabs",
    "zh-CN": "Ultimate Publisher 设置标签页",
  });

  return (
    <div className="ultimate-publisher-settings-tabs" role="tablist" aria-label={tabAriaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className={`ultimate-publisher-settings-tab ${activeTab === tab.id ? "is-active" : ""}`.trim()}
          aria-selected={activeTab === tab.id}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
