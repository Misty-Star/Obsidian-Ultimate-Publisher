import React from "react";
import { Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { ConfiguredTargetCardModel } from "./settingsViewModel";

interface TargetCardProps {
  i18n: Translator;
  target: ConfiguredTargetCardModel;
  onEdit: (targetId: string) => void;
  onDelete: (targetId: string) => void;
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

export function TargetCard({ i18n, target, onEdit, onDelete }: TargetCardProps): React.JSX.Element {
  const hasSecondaryName = Boolean(target.name);
  const enabledAria = resolveTranslation(i18n, "settings.target.status.enabled", {
    en: "Enabled",
    "zh-CN": "已启用",
  });
  const disabledAria = resolveTranslation(i18n, "settings.target.status.disabled", {
    en: "Disabled",
    "zh-CN": "已禁用",
  });
  const editLabel = resolveTranslation(i18n, "settings.target.action.edit", {
    en: "Edit",
    "zh-CN": "编辑",
  });
  const deleteLabel = resolveTranslation(i18n, "settings.target.action.delete", {
    en: "Delete",
    "zh-CN": "删除",
  });

  return (
    <article className="ultimate-publisher-target-card">
      <div className={`ultimate-publisher-target-card-header ${hasSecondaryName ? "" : "is-compact"}`.trim()}>
        <div
          className="ultimate-publisher-provider-icon ultimate-publisher-target-provider-icon"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: target.providerIcon }}
        />
        <div className={`ultimate-publisher-target-card-copy ${hasSecondaryName ? "" : "is-compact"}`.trim()}>
          <div className="ultimate-publisher-target-card-title">
            <span
              className={`ultimate-publisher-target-status ${target.enabled ? "is-enabled" : "is-disabled"}`.trim()}
              aria-label={target.enabled ? enabledAria : disabledAria}
            />
            <h3>{target.providerName}</h3>
          </div>
          {target.name ? <p>{target.name}</p> : null}
        </div>
      </div>
      <div className="ultimate-publisher-target-card-actions">
        <button type="button" onClick={() => onEdit(target.id)}>
          {editLabel}
        </button>
        <button type="button" onClick={() => onDelete(target.id)}>
          {deleteLabel}
        </button>
      </div>
    </article>
  );
}
