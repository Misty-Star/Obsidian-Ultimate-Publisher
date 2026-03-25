import React from "react";
import { createRoot, Root } from "react-dom/client";
import { createDesktopWebAuthService } from "../../core/desktopWebAuth";
import { createI18nFromObsidianLanguage, Translator } from "../../i18n";
import UltimatePublisherPlugin from "../../plugin";
import { cloneTarget, normalizeTarget } from "../../settings";
import { ProviderId, UltimatePublisherSettings } from "../../types";
import { ProviderRegistry } from "../../providers/registry";
import { EditTargetModal } from "./EditTargetModal";
import { getProviderCatalogEntry } from "./providerCatalog";
import { SettingsView } from "./SettingsView";
import {
  authorizeWebAuthTarget,
  clearWebAuthTarget,
  isWebAuthTarget,
  validateWebAuthTarget,
  WebAuthTargetConfig,
} from "./webAuthTargetActions";

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
  const providers = new ProviderRegistry(options.plugin.app);
  const desktopWebAuthService = createDesktopWebAuthService();
  const i18n = createI18nFromObsidianLanguage();

  const loadWebAuthAccountSummary = async (target: WebAuthTargetConfig) => {
    const provider = providers.get(target) as {
      getAccountSummary?: (currentTarget: WebAuthTargetConfig) => Promise<{
        accountId?: string;
        accountName?: string;
        accountAvatarUrl?: string;
      }>;
    };

    if (!provider.getAccountSummary) {
      throw new Error(`Provider ${target.provider} does not expose account summary loading.`);
    }

    return provider.getAccountSummary(target);
  };

  const handleAddProvider = async (providerId: ProviderId): Promise<void> => {
    const entry = getProviderCatalogEntry(providerId);
    if (!entry) {
      return;
    }

    new EditTargetModal(options.plugin.app, {
      mode: "create",
      target: entry.createTarget(),
      onAuthorizeDraft: async (target) => {
        if (!isWebAuthTarget(target)) {
          return target;
        }

        return authorizeWebAuthTarget(target, desktopWebAuthService, loadWebAuthAccountSummary);
      },
      onValidateDraft: async (target) => {
        if (!isWebAuthTarget(target)) {
          return target;
        }

        return validateWebAuthTarget(target, loadWebAuthAccountSummary);
      },
      onClearAuthDraft: async (target) => {
        if (!isWebAuthTarget(target)) {
          return target;
        }

        return clearWebAuthTarget(target);
      },
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
      onAuthorizeDraft: async (target) => {
        if (!isWebAuthTarget(target)) {
          return target;
        }

        return authorizeWebAuthTarget(target, desktopWebAuthService, loadWebAuthAccountSummary);
      },
      onValidateDraft: async (target) => {
        if (!isWebAuthTarget(target)) {
          return target;
        }

        return validateWebAuthTarget(target, loadWebAuthAccountSummary);
      },
      onClearAuthDraft: async (target) => {
        if (!isWebAuthTarget(target)) {
          return target;
        }

        return clearWebAuthTarget(target);
      },
      onSave: async (target) => {
        await options.plugin.updateTarget(targetId, (draft) => {
          Object.assign(draft, target);
        });
        options.requestRefresh();
      },
    }).open();
  };

  render(root, {
    i18n,
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
    i18n: Translator;
    settings: UltimatePublisherSettings;
    onAddProvider: (providerId: ProviderId) => void | Promise<void>;
    onDeleteTarget: (targetId: string) => void | Promise<void>;
    onEditTarget: (targetId: string) => void;
  }
): void {
  root.render(
    <SettingsView
      i18n={props.i18n}
      settings={props.settings}
      onAddProvider={props.onAddProvider}
      onDeleteTarget={props.onDeleteTarget}
      onEditTarget={props.onEditTarget}
    />
  );
}
