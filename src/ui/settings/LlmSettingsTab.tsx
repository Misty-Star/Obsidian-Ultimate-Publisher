import React from "react";
import { Translator } from "../../i18n";
import { LlmSettings } from "../../types";

interface LlmSettingsTabProps {
  i18n: Translator;
  settings: LlmSettings;
  onChange: (updater: (draft: LlmSettings) => void) => void;
}

const DEFAULT_ENDPOINT_PLACEHOLDERS: Record<LlmSettings["vendor"], string> = {
  openai: "https://api.openai.com/v1",
  "openai-compatible": "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
};

export function LlmSettingsTab({ i18n, settings, onChange }: LlmSettingsTabProps): React.JSX.Element {
  const endpointPlaceholder = DEFAULT_ENDPOINT_PLACEHOLDERS[settings.vendor];

  return (
    <section className="ultimate-publisher-llm-tab">
      <header className="ultimate-publisher-llm-header">
        <h3>{i18n.t("settings.llm.title")}</h3>
        <p>{i18n.t("settings.llm.description")}</p>
      </header>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.enabled")}</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => onChange((draft) => { draft.enabled = event.currentTarget.checked; })}
        />
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.vendor")}</span>
        <select value={settings.vendor} onChange={(event) => onChange((draft) => { draft.vendor = event.currentTarget.value as LlmSettings["vendor"]; })}>
          <option value="openai">OpenAI</option>
          <option value="openai-compatible">OpenAI Compatible</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Gemini</option>
        </select>
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.model")}</span>
        <input type="text" value={settings.model} onChange={(event) => onChange((draft) => { draft.model = event.currentTarget.value; })} />
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.apiKey")}</span>
        <input type="password" value={settings.apiKey} onChange={(event) => onChange((draft) => { draft.apiKey = event.currentTarget.value; })} />
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.endpointOverride")}</span>
        <input
          type="text"
          value={settings.endpointOverride ?? ""}
          placeholder={endpointPlaceholder}
          onChange={(event) => onChange((draft) => { draft.endpointOverride = event.currentTarget.value; })}
        />
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.temperature")}</span>
        <input type="number" value={String(settings.temperature)} onChange={(event) => onChange((draft) => { draft.temperature = Number(event.currentTarget.value || 0); })} />
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.timeoutMs")}</span>
        <input type="number" value={String(settings.timeoutMs)} onChange={(event) => onChange((draft) => { draft.timeoutMs = Number(event.currentTarget.value || 0); })} />
      </label>
      <label className="ultimate-publisher-llm-field">
        <span>{i18n.t("settings.llm.maxInputChars")}</span>
        <input type="number" value={String(settings.maxInputChars)} onChange={(event) => onChange((draft) => { draft.maxInputChars = Number(event.currentTarget.value || 0); })} />
      </label>
    </section>
  );
}
