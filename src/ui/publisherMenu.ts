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
  icon: string;
  section: string;
  disabled?: boolean;
  targetId?: string;
  helpText?: string;
  children?: PublisherMenuItem[];
}

const ROOT_MENU_ITEMS = [
  {
    key: "dashboard" as const,
    title: "Dashboard",
    icon: "layout-dashboard",
    section: "ultimate-publisher-dashboard",
  },
  {
    key: "quick-publish" as const,
    title: "Quick Publish",
    icon: "zap",
    section: "ultimate-publisher-quick-publish",
  },
  {
    key: "normal-publish" as const,
    title: "Normal Publish",
    icon: "send",
    section: "ultimate-publisher-normal-publish",
  },
  {
    key: "batch-publish" as const,
    title: "Batch Publish",
    icon: "layers-3",
    section: "ultimate-publisher-batch-publish",
  },
  {
    key: "publish-settings" as const,
    title: "Publish Settings",
    icon: "settings",
    section: "ultimate-publisher-settings",
  },
];

export function buildPublisherMenuModel(context: PublisherMenuContext): PublisherMenuItem[] {
  const noteDependentDisabled = !context.hasActiveMarkdown;
  const quickPublishChildren = buildQuickPublishChildren(context.enabledTargets);

  return [
    {
      ...ROOT_MENU_ITEMS[0],
      disabled: false,
    },
    {
      ...ROOT_MENU_ITEMS[1],
      disabled: noteDependentDisabled,
      children: quickPublishChildren,
    },
    {
      ...ROOT_MENU_ITEMS[2],
      disabled: noteDependentDisabled,
    },
    {
      ...ROOT_MENU_ITEMS[3],
      disabled: noteDependentDisabled,
    },
    {
      ...ROOT_MENU_ITEMS[4],
    },
  ];
}

function getProviderIcon(provider: string): string {
  switch (provider) {
    case "wordpress":
      return "globe";
    case "yuque":
      return "book";
    case "local-export":
      return "folder";
    default:
      return "upload";
  }
}

function buildQuickPublishChildren(
  enabledTargets: PublisherMenuContext["enabledTargets"],
): PublisherMenuItem[] {
  if (enabledTargets.length === 0) {
    return [
      {
        key: "quick-publish-empty",
        title: "Enable at least one publish target",
        icon: "circle-alert",
        section: "ultimate-publisher-quick-publish-empty",
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
      icon: getProviderIcon(target.provider),
      section: "ultimate-publisher-quick-publish-targets",
      helpText: target.provider,
      targetId: target.id,
    }));
}
