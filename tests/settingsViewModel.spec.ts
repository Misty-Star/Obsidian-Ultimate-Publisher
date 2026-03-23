import { describe, expect, it } from "vitest";
import { createWordpressTarget, createYuqueTarget } from "../src/settings";
import { buildConfiguredTargetCards, buildMarketplaceCards } from "../src/ui/settings/settingsViewModel";
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
      "local-export",
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
      { id: "local-export", configured: false, configuredCount: 0 },
    ]);
  });
});
