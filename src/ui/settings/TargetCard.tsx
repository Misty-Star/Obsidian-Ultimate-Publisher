import React from "react";
import { ConfiguredTargetCardModel } from "./settingsViewModel";

interface TargetCardProps {
  target: ConfiguredTargetCardModel;
  onEdit: (targetId: string) => void;
  onDelete: (targetId: string) => void;
}

export function TargetCard({ target, onEdit, onDelete }: TargetCardProps): React.JSX.Element {
  return (
    <article className="ultimate-publisher-target-card">
      <div className="ultimate-publisher-target-card-header">
        <span
          className={`ultimate-publisher-target-status ${target.enabled ? "is-enabled" : "is-disabled"}`.trim()}
          aria-label={target.enabled ? "Enabled" : "Disabled"}
        />
        <div className="ultimate-publisher-target-card-copy">
          <h3>{target.providerName}</h3>
          <p>{target.name}</p>
        </div>
      </div>
      <div className="ultimate-publisher-target-card-actions">
        <button type="button" onClick={() => onEdit(target.id)}>
          Edit
        </button>
        <button type="button" onClick={() => onDelete(target.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}
