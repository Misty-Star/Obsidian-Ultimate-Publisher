import React from "react";

export type SettingsTabId = "configured" | "marketplace";

interface TabBarProps {
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
}

const TABS: Array<{ id: SettingsTabId; label: string }> = [
  { id: "configured", label: "Configured Targets" },
  { id: "marketplace", label: "Marketplace" },
];

export function TabBar({ activeTab, onSelectTab }: TabBarProps): React.JSX.Element {
  return (
    <div className="ultimate-publisher-settings-tabs" role="tablist" aria-label="Ultimate Publisher settings tabs">
      {TABS.map((tab) => (
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
