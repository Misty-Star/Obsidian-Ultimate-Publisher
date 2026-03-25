import { describe, expect, it } from "vitest";
import { createI18n } from "../src/i18n";
import { getProviderCatalog } from "../src/ui/settings/providerCatalog";

describe("getProviderCatalog", () => {
  it("returns the supported provider definitions", () => {
    expect(getProviderCatalog().map((item) => item.id)).toEqual([
      "wordpress",
      "yuque",
      "local-export",
      "zhihu",
      "csdn",
      "juejin",
    ]);
  });

  it("keeps provider brand names and localizes descriptions", () => {
    const zh = createI18n("zh-CN");
    const wordpress = getProviderCatalog(zh).find((entry) => entry.id === "wordpress");

    expect(wordpress?.name).toBe("WordPress");
    expect(wordpress?.description).toBe("使用应用密码认证，通过 REST API 发布内容。");
  });
});
