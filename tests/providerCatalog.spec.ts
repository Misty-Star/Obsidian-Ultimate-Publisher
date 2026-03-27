import { describe, expect, it } from "vitest";
import { createI18n } from "../src/i18n";
import { getProviderCatalog } from "../src/ui/settings/providerCatalog";

describe("getProviderCatalog", () => {
  it("returns the supported provider definitions", () => {
    expect(getProviderCatalog().map((item) => item.id)).toEqual([
      "wordpress",
      "yuque",
      "zhihu",
      "csdn",
      "juejin",
    ]);
  });

  it("keeps provider brand names and localizes descriptions", () => {
    const zh = createI18n("zh-CN");
    const catalog = getProviderCatalog(zh);
    const wordpress = catalog.find((entry) => entry.id === "wordpress");
    const yuque = catalog.find((entry) => entry.id === "yuque");
    const zhihu = catalog.find((entry) => entry.id === "zhihu");
    const juejin = catalog.find((entry) => entry.id === "juejin");

    expect(wordpress?.name).toBe("WordPress");
    expect(wordpress?.description).toBe("使用应用密码认证，通过 REST API 发布内容。");
    expect(yuque?.description).toContain("Yuque");
    expect(zhihu?.description).toContain("Zhihu");
    expect(juejin?.description).toContain("Juejin");
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

    const yuque = getProviderCatalog(zhWithEnFallback).find((entry) => entry.id === "yuque");
    expect(yuque?.description).toBe("使用 Token 向 Yuque 知识库发布内容。");
  });
});
