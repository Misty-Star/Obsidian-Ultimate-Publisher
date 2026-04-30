import { describe, expect, it } from "vitest";
import { getProviderDefinition, getProviderDefinitions } from "../src/providers/definitions";

describe("provider definitions", () => {
  it("declares stable provider ids, categories, and families in display order", () => {
    expect(
      getProviderDefinitions().map((definition) => ({
        id: definition.id,
        category: definition.category,
        family: definition.family,
      }))
    ).toEqual([
      { id: "wordpress", category: "wordpress", family: "rest-api" },
      { id: "yuque", category: "common", family: "rest-api" },
      { id: "zhihu", category: "web", family: "cookie-web" },
      { id: "csdn", category: "web", family: "cookie-web" },
      { id: "juejin", category: "web", family: "cookie-web" },
      { id: "github", category: "github", family: "github-static-site" },
      { id: "gitlab", category: "gitlab", family: "gitlab-static-site" },
      { id: "local-filesystem", category: "filesystem", family: "filesystem-local" },
    ]);
  });

  it("creates default targets through definitions", () => {
    const wordpress = getProviderDefinition("wordpress").createTarget();
    const juejin = getProviderDefinition("juejin").createTarget();
    const github = getProviderDefinition("github").createTarget();

    expect(wordpress).toMatchObject({
      provider: "wordpress",
      name: "WordPress",
      enabled: true,
      defaultStatus: "draft",
      contentFormat: "html",
    });
    expect(juejin).toMatchObject({
      provider: "juejin",
      name: "Juejin",
      enabled: true,
      defaultCategoryId: "",
      defaultTagIds: [],
      defaultBriefContent: "",
    });
    expect(github).toMatchObject({
      provider: "github",
      name: "GitHub Static Sites",
      enabled: true,
      siteGenerator: "hugo",
      branch: "main",
      contentRoot: "content/posts",
    });
  });

  it("normalizes provider-specific defaults through the definition API", () => {
    const definition = getProviderDefinition("juejin");
    const normalized = definition.normalizeTarget({
      ...definition.createTarget(),
      cookie: undefined as never,
      defaultCategoryId: undefined as never,
      defaultTagIds: " alpha, beta " as never,
      defaultTagNames: [" Tag A ", "Tag B "],
      defaultBriefContent: undefined as never,
    });

    expect(normalized).toMatchObject({
      provider: "juejin",
      cookie: "",
      defaultCategoryId: "",
      defaultTagIds: ["alpha", "beta"],
      defaultTagNames: ["Tag A", "Tag B"],
      defaultBriefContent: "",
    });
  });

  it("exposes provider capabilities and normal-publish metadata for existing providers", () => {
    const wordpress = getProviderDefinition("wordpress");
    const zhihu = getProviderDefinition("zhihu");

    for (const definition of getProviderDefinitions()) {
      expect(definition.capabilities).toMatchObject({
        publish: true,
        update: true,
      });
      expect(typeof definition.capabilities.delete).toBe("boolean");
      expect(typeof definition.capabilities.normalPublish).toBe("boolean");
      expect(typeof definition.settingsForm.getFields).toBe("function");
      if (definition.capabilities.normalPublish) {
        expect(typeof definition.normalPublish?.buildInitialDraft).toBe("function");
      }

    }

    expect(wordpress.normalPublish?.getManualFallbackFields?.(wordpress.createTarget())).toEqual(["categories", "tags"]);
    expect(wordpress.getManualFallbackFields?.(wordpress.createTarget())).toEqual(["categories", "tags"]);
    expect(zhihu.normalPublish?.skipOptionsLoad).toBe(true);
    expect(zhihu.skipNormalPublishOptionsLoad).toBe(true);
    expect(typeof wordpress.buildInitialDraft).toBe("function");
  });

  it("exposes runtime provider factories for all built-in providers", () => {
    for (const providerId of ["wordpress", "yuque", "zhihu", "csdn", "juejin", "github", "gitlab", "local-filesystem"] as const) {
      const definition = getProviderDefinition(providerId);
      expect(typeof definition.createProvider).toBe("function");
    }
  });
});
