import React from "react";
import { ConfiguredTargetCardModel } from "./settingsViewModel";
import { TargetCard } from "./TargetCard";

interface ConfiguredTargetsTabProps {
  targets: ConfiguredTargetCardModel[];
  onEditTarget: (targetId: string) => void;
  onDeleteTarget: (targetId: string) => void;
}

export function ConfiguredTargetsTab({
  targets,
  onEditTarget,
  onDeleteTarget,
}: ConfiguredTargetsTabProps): React.JSX.Element {
  if (targets.length === 0) {
    return (
      <div className="ultimate-publisher-settings-empty-state">
        <p>No targets configured yet.</p>
        <p>Switch to Marketplace tab to add one.</p>
      </div>
    );
  }

  return (
    <div className="ultimate-publisher-target-grid">
      {targets.map((target) => (
        <TargetCard key={target.id} target={target} onEdit={onEditTarget} onDelete={onDeleteTarget} />
      ))}
    </div>
  );
}
