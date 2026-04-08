import React from "react";
import { Translator } from "../../i18n";
import { FrontmatterAutomationSettings } from "../../types";

interface FrontmatterAutomationPanelProps {
  i18n: Translator;
  settings: FrontmatterAutomationSettings;
  onChange: (updater: (draft: FrontmatterAutomationSettings) => void) => void;
}

export function FrontmatterAutomationPanel({
  i18n,
  settings,
  onChange,
}: FrontmatterAutomationPanelProps): React.JSX.Element {
  return (
    <section className="ultimate-publisher-llm-tab ultimate-publisher-frontmatter-panel">
      <header className="ultimate-publisher-llm-header">
        <h3>{i18n.t("settings.frontmatter.title")}</h3>
        <p>{i18n.t("settings.frontmatter.description")}</p>
      </header>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.frontmatter.enabled")}</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => onChange((draft) => { draft.enabled = event.currentTarget.checked; })}
        />
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.frontmatter.includeOptionComments")}</span>
        <input
          type="checkbox"
          checked={settings.includeOptionComments}
          onChange={(event) => onChange((draft) => { draft.includeOptionComments = event.currentTarget.checked; })}
        />
      </label>
    </section>
  );
}
