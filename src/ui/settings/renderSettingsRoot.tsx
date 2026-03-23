import React from "react";
import { createRoot, Root } from "react-dom/client";
import UltimatePublisherPlugin from "../../plugin";
import { cloneTarget, normalizeTarget } from "../../settings";
import { ProviderId, UltimatePublisherSettings } from "../../types";
import { EditTargetModal } from "./EditTargetModal";
import { getProviderCatalogEntry } from "./providerCatalog";
import { SettingsView } from "./SettingsView";

export interface MountedSettingsView {
  destroy(): void;
}

interface MountSettingsViewOptions {
  plugin: UltimatePublisherPlugin;
  settings: UltimatePublisherSettings;
  requestRefresh: () => void;
}

export function mountSettingsView(containerEl: HTMLElement, options: MountSettingsViewOptions): MountedSettingsView {
  const root = createRoot(containerEl);

  const handleAddProvider = async (providerId: ProviderId): Promise<void> => {
    const entry = getProviderCatalogEntry(providerId);
    if (!entry) {
      return;
    }

    new EditTargetModal(options.plugin.app, {
      mode: "create",
      target: entry.createTarget(),
      onSave: async (target) => {
        await options.plugin.addTarget(target);
        options.requestRefresh();
      },
    }).open();
  };

  const handleDeleteTarget = async (targetId: string): Promise<void> => {
    await options.plugin.removeTarget(targetId);
    options.requestRefresh();
  };

  const handleEditTarget = (targetId: string): void => {
    const currentTarget = options.settings.targets.find((target) => target.id === targetId);
    if (!currentTarget) {
      return;
    }

    new EditTargetModal(options.plugin.app, {
      mode: "edit",
      target: normalizeTarget(cloneTarget(currentTarget)),
      onSave: async (target) => {
        await options.plugin.updateTarget(targetId, (draft) => {
          Object.assign(draft, target);
        });
        options.requestRefresh();
      },
    }).open();
  };

  render(root, {
    settings: options.settings,
    onAddProvider: handleAddProvider,
    onDeleteTarget: handleDeleteTarget,
    onEditTarget: handleEditTarget,
  });

  return {
    destroy(): void {
      root.unmount();
    },
  };
}

function render(
  root: Root,
  props: {
    settings: UltimatePublisherSettings;
    onAddProvider: (providerId: ProviderId) => void | Promise<void>;
    onDeleteTarget: (targetId: string) => void | Promise<void>;
    onEditTarget: (targetId: string) => void;
  }
): void {
  root.render(
    <SettingsView
      settings={props.settings}
      onAddProvider={props.onAddProvider}
      onDeleteTarget={props.onDeleteTarget}
      onEditTarget={props.onEditTarget}
    />
  );
}
