import { describe, expect, it } from "vitest";
import { createI18n } from "../src/i18n";
import { createWordpressTarget, createYuqueTarget } from "../src/settings";
import {
  buildConfiguredTargetCards,
  buildMarketplaceCards,
  buildMarketplaceCardsForCategory,
  buildMarketplaceCategories,
} from "../src/ui/settings/settingsViewModel";
import { getProviderCatalog } from "../src/ui/settings/providerCatalog";
import { UltimatePublisherSettings } from "../src/types";

describe("settingsViewModel", () => {
  it("keeps configured targets in settings order", () => {
    const settings: UltimatePublisherSettings = {
      targets: [
        { ...createYuqueTarget(), id: "yuque-1", name: "Yuque Docs" },
        { ...createWordpressTarget(), id: "wp-1", name: "Main Blog" },
      ],
      records: [],
    };

    expect(buildConfiguredTargetCards(settings, getProviderCatalog()).map((item) => item.id)).toEqual([
      "yuque-1",
      "wp-1",
    ]);
  });

  it("shows all providers in marketplace order", () => {
    const settings: UltimatePublisherSettings = {
      targets: [],
      records: [],
    };

    expect(buildMarketplaceCards(settings, getProviderCatalog()).map((item) => item.id)).toEqual([
      "wordpress",
      "yuque",
      "zhihu",
      "csdn",
      "juejin",
      "github",
      "gitlab",
    ]);
  });

  it("builds visible marketplace categories with fixed order", () => {
    expect(
      buildMarketplaceCategories(getProviderCatalog(), createI18n("zh-CN")).map((item) => item.id)
    ).toEqual(["common", "github", "gitlab", "wordpress", "web"]);
  });

  it("builds cards for the web category", () => {
    const settings: UltimatePublisherSettings = { targets: [], records: [] };

    expect(
      buildMarketplaceCardsForCategory(settings, getProviderCatalog(), "web").map((item) => item.id)
    ).toEqual(["zhihu", "csdn", "juejin"]);
  });

  it("filters category cards directly from catalog entries without id lookup coupling", () => {
    const settings: UltimatePublisherSettings = { targets: [], records: [] };
    const catalog = [
      {
        id: "yuque",
        category: "common",
        name: "Yuque Common",
        description: "common",
        icon: "YQ",
        createTarget: createYuqueTarget,
      },
      {
        id: "yuque",
        category: "web",
        name: "Yuque Web",
        description: "web",
        icon: "YW",
        createTarget: createYuqueTarget,
      },
    ] as unknown as ReturnType<typeof getProviderCatalog>;

    expect(buildMarketplaceCardsForCategory(settings, catalog, "web").map((item) => item.name)).toEqual([
      "Yuque Web",
    ]);
  });

  it("marks marketplace providers as configured when any target uses that provider", () => {
    const settings: UltimatePublisherSettings = {
      targets: [
        { ...createWordpressTarget(), id: "wp-1", name: "Main Blog" },
        { ...createWordpressTarget(), id: "wp-2", name: "Side Blog" },
      ],
      records: [],
    };

    expect(
      buildMarketplaceCards(settings, getProviderCatalog()).map((item) => ({
        id: item.id,
        configured: item.configured,
        configuredCount: item.configuredCount,
      }))
    ).toEqual([
      { id: "wordpress", configured: true, configuredCount: 2 },
      { id: "yuque", configured: false, configuredCount: 0 },
      { id: "zhihu", configured: false, configuredCount: 0 },
      { id: "csdn", configured: false, configuredCount: 0 },
      { id: "juejin", configured: false, configuredCount: 0 },
      { id: "github", configured: false, configuredCount: 0 },
      { id: "gitlab", configured: false, configuredCount: 0 },
    ]);
  });
});
