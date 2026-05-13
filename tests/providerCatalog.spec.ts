import { describe, expect, it } from "vitest";
import { createI18n } from "../src/i18n";
import { createProviderTargetDraft, getProviderCatalog } from "../src/ui/settings/providerCatalog";

describe("getProviderCatalog", () => {
  it("returns the supported provider definitions", () => {
    expect(getProviderCatalog().map((item) => item.id)).toEqual([
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

  it("returns provider definitions with shared categories", () => {
    expect(
      getProviderCatalog().map((item) => ({
        id: item.id,
        category: item.category,
      })),
    ).toEqual([
      { id: "wordpress", category: "wordpress" },
      { id: "wordpress-com", category: "metaweblog" },
      { id: "metaweblog", category: "metaweblog" },
      { id: "cnblogs", category: "metaweblog" },
      { id: "typecho", category: "metaweblog" },
      { id: "jvue", category: "metaweblog" },
      { id: "yuque", category: "common" },
      { id: "notion", category: "common" },
      { id: "halo", category: "common" },
      { id: "telegraph", category: "common" },
      { id: "confluence", category: "common" },
      { id: "zhihu", category: "web" },
      { id: "csdn", category: "web" },
      { id: "juejin", category: "web" },
      { id: "jianshu", category: "web" },
      { id: "wechat", category: "web" },
      { id: "halo-web", category: "web" },
      { id: "bilibili", category: "web" },
      { id: "xiaohongshu", category: "web" },
      { id: "github-hugo", category: "github" },
      { id: "github-hexo", category: "github" },
      { id: "github-jekyll", category: "github" },
      { id: "github-vuepress", category: "github" },
      { id: "github-vuepress2", category: "github" },
      { id: "github-vitepress", category: "github" },
      { id: "github-quartz", category: "github" },
      { id: "gitlab-hugo", category: "gitlab" },
      { id: "gitlab-hexo", category: "gitlab" },
      { id: "gitlab-jekyll", category: "gitlab" },
      { id: "gitlab-vuepress", category: "gitlab" },
      { id: "gitlab-vuepress2", category: "gitlab" },
      { id: "gitlab-vitepress", category: "gitlab" },
    ]);
  });

  it("localizes provider names in zh-CN while keeping descriptions localized", () => {
    const zh = createI18n("zh-CN");
    const catalog = getProviderCatalog(zh);
    const wordpress = catalog.find((entry) => entry.id === "wordpress");
    const yuque = catalog.find((entry) => entry.id === "yuque");
    const zhihu = catalog.find((entry) => entry.id === "zhihu");
    const juejin = catalog.find((entry) => entry.id === "juejin");
    const jianshu = catalog.find((entry) => entry.id === "jianshu");
    const xiaohongshu = catalog.find((entry) => entry.id === "xiaohongshu");

    expect(wordpress?.name).toBe("WordPress");
    expect(wordpress?.description).toBe(
      "使用应用密码认证，通过 REST API 发布内容。",
    );
    expect(yuque?.name).toBe("语雀");
    expect(yuque?.description).toContain("Yuque");
    expect(zhihu?.name).toBe("知乎");
    expect(zhihu?.description).toContain("Zhihu");
    expect(juejin?.name).toBe("掘金");
    expect(juejin?.description).toContain("Juejin");
    expect(jianshu?.name).toBe("简书");
    expect(jianshu?.description).toContain("简书");
    expect(xiaohongshu?.name).toBe("小红书");
    expect(xiaohongshu?.description).toContain("小红书");
  });

  it("migrates provider icons from the reference project", () => {
    const catalog = getProviderCatalog(createI18n("zh-CN"));
    const zhihu = catalog.find((entry) => entry.id === "zhihu");
    const metaweblog = catalog.find((entry) => entry.id === "metaweblog");

    expect(zhihu?.icon).toContain("<svg");
    expect(zhihu?.icon).toContain('p-id="2450"');
    expect(metaweblog?.icon).toContain("data:image/png;base64,");
  });

  it("seeds localized default target names for new provider drafts", () => {
    const zh = createI18n("zh-CN");
    const zhihu = getProviderCatalog(zh).find((entry) => entry.id === "zhihu");

    expect(zhihu?.name).toBe("知乎");
    expect(createProviderTargetDraft(zhihu as never).name).toBe("知乎");
  });

  it("uses locale fallback when translator returns en fallback for missing locale key", () => {
    const zhWithEnFallback = {
      locale: "zh-CN" as const,
      t(key: string): string {
        if (key === "settings.providers.yuque.description") {
          return "Token-based publishing to a Yuque knowledge base.";
        }
        return key;
      },
    };

    const yuque = getProviderCatalog(zhWithEnFallback).find(
      (entry) => entry.id === "yuque",
    );
    expect(yuque?.description).toBe("使用 Token 向 Yuque 知识库发布内容。");
  });
});
