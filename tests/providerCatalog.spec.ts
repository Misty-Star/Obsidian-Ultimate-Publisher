import { describe, expect, it } from "vitest";
import { getProviderCatalog } from "../src/ui/settings/providerCatalog";

describe("getProviderCatalog", () => {
  it("returns the supported provider definitions", () => {
    expect(getProviderCatalog().map((item) => item.id)).toEqual([
      "wordpress",
      "yuque",
      "local-export",
    ]);
  });
});
