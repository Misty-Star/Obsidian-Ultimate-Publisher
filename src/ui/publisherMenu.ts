import { PublishTargetConfig } from "../types";
import { Translator } from "../i18n";

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
    titleKey: "menu.dashboard",
    icon: "layout-dashboard",
    section: "ultimate-publisher-dashboard",
  },
  {
    key: "quick-publish" as const,
    titleKey: "menu.quickPublish",
    icon: "zap",
    section: "ultimate-publisher-quick-publish",
  },
  {
    key: "normal-publish" as const,
    titleKey: "menu.normalPublish",
    icon: "send",
    section: "ultimate-publisher-normal-publish",
  },
  {
    key: "batch-publish" as const,
    titleKey: "menu.batchPublish",
    icon: "layers-3",
    section: "ultimate-publisher-batch-publish",
  },
  {
    key: "publish-settings" as const,
    titleKey: "menu.publishSettings",
    icon: "settings",
    section: "ultimate-publisher-settings",
  },
];

export function buildPublisherMenuModel(context: PublisherMenuContext, i18n: Translator): PublisherMenuItem[] {
  const noteDependentDisabled = !context.hasActiveMarkdown;
  const quickPublishChildren = buildQuickPublishChildren(context.enabledTargets, i18n);

  return [
    {
      ...ROOT_MENU_ITEMS[0],
      title: i18n.t(ROOT_MENU_ITEMS[0].titleKey),
      disabled: false,
    },
    {
      ...ROOT_MENU_ITEMS[1],
      title: i18n.t(ROOT_MENU_ITEMS[1].titleKey),
      disabled: noteDependentDisabled,
      children: quickPublishChildren,
    },
    {
      ...ROOT_MENU_ITEMS[2],
      title: i18n.t(ROOT_MENU_ITEMS[2].titleKey),
      disabled: noteDependentDisabled,
    },
    {
      ...ROOT_MENU_ITEMS[3],
      title: i18n.t(ROOT_MENU_ITEMS[3].titleKey),
      disabled: noteDependentDisabled,
    },
    {
      ...ROOT_MENU_ITEMS[4],
      title: i18n.t(ROOT_MENU_ITEMS[4].titleKey),
    },
  ];
}

function getProviderIcon(provider: string): string {
  switch (provider) {
    case "wordpress":
      return "globe";
    case "yuque":
      return "book";
    default:
      return "upload";
  }
}

function buildQuickPublishChildren(
  enabledTargets: PublisherMenuContext["enabledTargets"],
  i18n: Translator,
): PublisherMenuItem[] {
  if (enabledTargets.length === 0) {
    return [
      {
        key: "quick-publish-empty",
        title: i18n.t("menu.quickPublish.empty.title"),
        icon: "circle-alert",
        section: "ultimate-publisher-quick-publish-empty",
        helpText: i18n.t("menu.quickPublish.empty.help"),
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
