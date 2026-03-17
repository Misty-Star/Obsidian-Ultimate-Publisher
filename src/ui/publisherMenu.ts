import { PublishTargetConfig } from "../types";

export interface PublisherMenuContext {
  hasActiveMarkdown: boolean;
  enabledTargets: Array<Pick<PublishTargetConfig, "id" | "name" | "provider">>;
}

export interface PublisherMenuItem {
  key:
    | "dashboard"
    | "quick-publish"
    | "normal-publish"
    | "batch-publish"
    | "publish-settings"
    | "quick-publish-target"
    | "quick-publish-empty";
  title: string;
  disabled?: boolean;
  targetId?: string;
  helpText?: string;
  children?: PublisherMenuItem[];
}

export function buildPublisherMenuModel(context: PublisherMenuContext): PublisherMenuItem[] {
  const noteDependentDisabled = !context.hasActiveMarkdown;
  const quickPublishChildren = buildQuickPublishChildren(context.enabledTargets);

  return [
    {
      key: "dashboard",
      title: "Dashboard",
      disabled: false,
    },
    {
      key: "quick-publish",
      title: "Quick Publish",
      disabled: noteDependentDisabled,
      children: quickPublishChildren,
    },
    {
      key: "normal-publish",
      title: "Normal Publish",
      disabled: noteDependentDisabled,
    },
    {
      key: "batch-publish",
      title: "Batch Publish",
      disabled: noteDependentDisabled,
    },
    {
      key: "publish-settings",
      title: "Publish Settings",
    },
  ];
}

function buildQuickPublishChildren(
  enabledTargets: PublisherMenuContext["enabledTargets"],
): PublisherMenuItem[] {
  if (enabledTargets.length === 0) {
    return [
      {
        key: "quick-publish-empty",
        title: "Enable at least one publish target",
        helpText: "No quick publish targets are enabled",
        disabled: true,
      },
    ];
  }

  return [...enabledTargets]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((target) => ({
      key: "quick-publish-target",
      title: target.name,
      helpText: target.provider,
      targetId: target.id,
    }));
}
