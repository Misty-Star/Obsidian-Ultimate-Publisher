import { describe, expect, it } from "vitest";
import * as settings from "../src/settings";

describe("web auth target config", () => {
  it("exposes creator helpers for the three web auth targets", () => {
    expect(typeof (settings as any).createZhihuTarget).toBe("function");
    expect(typeof (settings as any).createCsdnTarget).toBe("function");
    expect(typeof (settings as any).createJuejinTarget).toBe("function");
  });

  it("creates empty but normalized web auth targets", () => {
    expect((settings as any).createZhihuTarget()).toMatchObject({
      provider: "zhihu",
      cookie: "",
      defaultColumnId: "",
      defaultColumnTitle: "",
    });
    expect((settings as any).createCsdnTarget()).toMatchObject({
      provider: "csdn",
      cookie: "",
      defaultCategories: [],
      defaultTags: [],
    });
    expect((settings as any).createJuejinTarget()).toMatchObject({
      provider: "juejin",
      cookie: "",
      defaultCategoryId: "",
      defaultTagIds: [],
      defaultBriefContent: "",
    });
  });

  it("normalizes missing array fields for web auth targets", () => {
    expect(settings.normalizeTarget({
      id: "csdn-target",
      name: "CSDN",
      enabled: true,
      provider: "csdn",
      cookie: "",
    } as any)).toMatchObject({
      defaultCategories: [],
      defaultTags: [],
    });

    expect(settings.normalizeTarget({
      id: "juejin-target",
      name: "Juejin",
      enabled: true,
      provider: "juejin",
      cookie: "",
    } as any)).toMatchObject({
      defaultCategoryId: "",
      defaultTagIds: [],
      defaultTagNames: [],
      defaultBriefContent: "",
    });
  });
});
