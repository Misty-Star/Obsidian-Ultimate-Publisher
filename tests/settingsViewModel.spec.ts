import { describe, expect, it } from "vitest";
import { createI18n } from "../src/i18n";
import { createJuejinTarget, createWordpressTarget, createYuqueTarget } from "../src/settings";
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

    const cards = buildConfiguredTargetCards(settings, getProviderCatalog());

    expect(cards.map((item) => item.id)).toEqual(["yuque-1", "wp-1"]);
    expect(cards[0]?.providerIcon).toContain("<svg");
    expect(cards[1]?.providerIcon).toContain("<svg");
  });

  it("hides configured target names when they only repeat the provider default name", () => {
    const settings: UltimatePublisherSettings = {
      targets: [
        { ...createWordpressTarget(), id: "wp-1", name: "WordPress" },
        { ...createJuejinTarget(), id: "jj-1", name: "Juejin" },
      ],
      records: [],
    };

    const cards = buildConfiguredTargetCards(settings, getProviderCatalog(createI18n("zh-CN")));

    expect(cards[0]?.providerName).toBe("WordPress");
    expect(cards[0]?.name).toBeNull();
    expect(cards[1]?.providerName).toBe("掘金");
    expect(cards[1]?.name).toBeNull();
  });

  it("keeps configured target names when users set a custom alias", () => {
    const settings: UltimatePublisherSettings = {
      targets: [
        { ...createWordpressTarget(), id: "wp-1", name: "Main Blog" },
        { ...createJuejinTarget(), id: "jj-1", name: "掘金主号" },
      ],
      records: [],
    };

    const cards = buildConfiguredTargetCards(settings, getProviderCatalog(createI18n("zh-CN")));

    expect(cards[0]?.name).toBe("Main Blog");
    expect(cards[1]?.name).toBe("掘金主号");
  });

  it("shows all providers in marketplace order", () => {
    const settings: UltimatePublisherSettings = {
      targets: [],
      records: [],
    };

    expect(
      buildMarketplaceCards(settings, getProviderCatalog()).map(
        (item) => item.id,
      ),
    ).toEqual([
      "wordpress",
      "wordpress-com",
      "metaweblog",
      "cnblogs",
      "typecho",
      "jvue",
      "yuque",
      "notion",
      "halo",
      "telegraph",
      "confluence",
      "zhihu",
      "csdn",
      "juejin",
      "jianshu",
      "wechat",
      "halo-web",
      "bilibili",
      "xiaohongshu",
      "github-hugo",
      "github-hexo",
      "github-jekyll",
      "github-vuepress",
      "github-vuepress2",
      "github-vitepress",
      "github-quartz",
      "gitlab-hugo",
      "gitlab-hexo",
      "gitlab-jekyll",
      "gitlab-vuepress",
      "gitlab-vuepress2",
      "gitlab-vitepress",
    ]);
  });

  it("builds visible marketplace categories with fixed order", () => {
    expect(
      buildMarketplaceCategories(getProviderCatalog(), createI18n("zh-CN")).map(
        (item) => item.id,
      ),
    ).toEqual([
      "common",
      "github",
      "gitlab",
      "metaweblog",
      "wordpress",
      "web",
    ]);
  });

  it("localizes marketplace cards in zh-CN", () => {
    const settings: UltimatePublisherSettings = { targets: [], records: [] };
    const zh = createI18n("zh-CN");

    const cards = buildMarketplaceCards(settings, getProviderCatalog(zh));

    expect(cards.find((item) => item.id === "zhihu")?.name).toBe("知乎");
    expect(cards.find((item) => item.id === "juejin")?.name).toBe("掘金");
    expect(cards.find((item) => item.id === "yuque")?.name).toBe("语雀");
    expect(cards.find((item) => item.id === "wechat")?.name).toBe("微信公众号");
  });

  it("builds cards for the web category", () => {
    const settings: UltimatePublisherSettings = { targets: [], records: [] };

    expect(
      buildMarketplaceCardsForCategory(
        settings,
        getProviderCatalog(),
        "web",
      ).map((item) => item.id),
    ).toEqual([
      "zhihu",
      "csdn",
      "juejin",
      "jianshu",
      "wechat",
      "halo-web",
      "bilibili",
      "xiaohongshu",
    ]);
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

    expect(
      buildMarketplaceCardsForCategory(settings, catalog, "web").map(
        (item) => item.name,
      ),
    ).toEqual(["Yuque Web"]);
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
      })),
    ).toEqual(
      getProviderCatalog().map((entry) => ({
        id: entry.id,
        configured: entry.id === "wordpress",
        configuredCount: entry.id === "wordpress" ? 2 : 0,
      })),
    );
  });
});
