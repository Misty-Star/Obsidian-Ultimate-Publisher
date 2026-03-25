import React from "react";
import { Translator } from "../../i18n";
import { messages } from "../../i18n/messages";
import { ConfiguredTargetCardModel } from "./settingsViewModel";
import { TargetCard } from "./TargetCard";

interface ConfiguredTargetsTabProps {
  i18n: Translator;
  targets: ConfiguredTargetCardModel[];
  onEditTarget: (targetId: string) => void;
  onDeleteTarget: (targetId: string) => void;
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

export function ConfiguredTargetsTab({
  i18n,
  targets,
  onEditTarget,
  onDeleteTarget,
}: ConfiguredTargetsTabProps): React.JSX.Element {
  if (targets.length === 0) {
    const emptyTitle = resolveTranslation(i18n, "settings.empty.title", {
      en: "No targets configured yet.",
      "zh-CN": "尚未配置任何目标。",
    });
    const emptyDescription = resolveTranslation(i18n, "settings.empty.description", {
      en: "Switch to Marketplace tab to add one.",
      "zh-CN": "切换到“市场”标签以添加目标。",
    });

    return (
      <div className="ultimate-publisher-settings-empty-state">
        <p>{emptyTitle}</p>
        <p>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="ultimate-publisher-target-grid">
      {targets.map((target) => (
        <TargetCard i18n={i18n} key={target.id} target={target} onEdit={onEditTarget} onDelete={onDeleteTarget} />
      ))}
    </div>
  );
}
