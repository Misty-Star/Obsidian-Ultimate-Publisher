import { describe, expect, it } from "vitest";
import {
  getProviderDefinition,
  getProviderDefinitions,
} from "../src/providers/definitions";


const STATIC_SITE_PROVIDER_GENERATORS = {
  "github-hugo": "hugo",
  "github-hexo": "hexo",
  "github-jekyll": "jekyll",
  "github-vuepress": "vuepress",
  "github-vuepress2": "vuepress2",
  "github-vitepress": "vitepress",
  "github-quartz": "quartz",
  "gitlab-hugo": "hugo",
  "gitlab-hexo": "hexo",
  "gitlab-jekyll": "jekyll",
  "gitlab-vuepress": "vuepress",
  "gitlab-vuepress2": "vuepress2",
  "gitlab-vitepress": "vitepress",
} as const;

describe("provider definitions", () => {
  it("declares stable provider ids, categories, and families in display order", () => {
    expect(
      getProviderDefinitions().map((definition) => ({
        id: definition.id,
        category: definition.category,
        family: definition.family,
      })),
    ).toEqual([
      { id: "wordpress", category: "wordpress", family: "rest-api" },
      { id: "wordpress-com", category: "metaweblog", family: "xml-rpc" },
      { id: "metaweblog", category: "metaweblog", family: "xml-rpc" },
      { id: "cnblogs", category: "metaweblog", family: "xml-rpc" },
      { id: "typecho", category: "metaweblog", family: "xml-rpc" },
      { id: "jvue", category: "metaweblog", family: "xml-rpc" },
      { id: "yuque", category: "common", family: "rest-api" },
      { id: "notion", category: "common", family: "rest-api" },
      { id: "halo", category: "common", family: "rest-api" },
      { id: "telegraph", category: "common", family: "rest-api" },
      { id: "confluence", category: "common", family: "rest-api" },
      { id: "zhihu", category: "web", family: "cookie-web" },
      { id: "csdn", category: "web", family: "cookie-web" },
      { id: "juejin", category: "web", family: "cookie-web" },
      { id: "jianshu", category: "web", family: "cookie-web" },
      { id: "wechat", category: "web", family: "cookie-web" },
      { id: "halo-web", category: "web", family: "cookie-web" },
      { id: "bilibili", category: "web", family: "cookie-web" },
      { id: "xiaohongshu", category: "web", family: "cookie-web" },
      { id: "github-hugo", category: "github", family: "github-static-site" },
      { id: "github-hexo", category: "github", family: "github-static-site" },
      { id: "github-jekyll", category: "github", family: "github-static-site" },
      { id: "github-vuepress", category: "github", family: "github-static-site" },
      { id: "github-vuepress2", category: "github", family: "github-static-site" },
      { id: "github-vitepress", category: "github", family: "github-static-site" },
      { id: "github-quartz", category: "github", family: "github-static-site" },
      { id: "gitlab-hugo", category: "gitlab", family: "gitlab-static-site" },
      { id: "gitlab-hexo", category: "gitlab", family: "gitlab-static-site" },
      { id: "gitlab-jekyll", category: "gitlab", family: "gitlab-static-site" },
      { id: "gitlab-vuepress", category: "gitlab", family: "gitlab-static-site" },
      { id: "gitlab-vuepress2", category: "gitlab", family: "gitlab-static-site" },
      { id: "gitlab-vitepress", category: "gitlab", family: "gitlab-static-site" },
    ]);
  });

  it("creates default targets through definitions", () => {
    const wordpress = getProviderDefinition("wordpress").createTarget();
    const notion = getProviderDefinition("notion").createTarget();
    const halo = getProviderDefinition("halo").createTarget();
    const juejin = getProviderDefinition("juejin").createTarget();
    const jianshu = getProviderDefinition("jianshu").createTarget();
    const haloWeb = getProviderDefinition("halo-web").createTarget();
    const github = getProviderDefinition("github-hugo").createTarget();
    const metaweblog = getProviderDefinition("metaweblog").createTarget();

    expect(wordpress).toMatchObject({
      provider: "wordpress",
      name: "WordPress",
      enabled: true,
      defaultStatus: "draft",
      contentFormat: "html",
    });
    expect(metaweblog).toMatchObject({
      provider: "metaweblog",
      name: "MetaWeblog",
      enabled: true,
      blogId: "default",
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
    expect(notion).toMatchObject({
      provider: "notion",
      name: "Notion",
      notionVersion: "2022-06-28",
    });
    expect(halo).toMatchObject({
      provider: "halo",
      name: "Halo API",
      defaultTags: [],
      defaultPublish: false,
    });
    expect(jianshu).toMatchObject({
      provider: "jianshu",
      name: "Jianshu",
      enabled: true,
      cookie: "",
    });
    expect(haloWeb).toMatchObject({
      provider: "halo-web",
      name: "Halo Web",
      enabled: true,
      cookie: "",
      baseUrl: "",
    });
    expect(github).toMatchObject({
      provider: "github-hugo",
      name: "GitHub Hugo",
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

    expect(
      getProviderDefinition("halo-web").normalizeTarget({
        ...getProviderDefinition("halo-web").createTarget(),
        cookie: undefined as never,
        baseUrl: undefined as never,
      }),
    ).toMatchObject({
      provider: "halo-web",
      cookie: "",
      baseUrl: "",
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
        expect(typeof definition.normalPublish?.buildInitialDraft).toBe(
          "function",
        );
      }
    }

    expect(
      wordpress.normalPublish?.getManualFallbackFields?.(
        wordpress.createTarget(),
      ),
    ).toEqual(["categories", "tags"]);
    expect(
      wordpress.getManualFallbackFields?.(wordpress.createTarget()),
    ).toEqual(["categories", "tags"]);
    expect(zhihu.normalPublish?.skipOptionsLoad).toBe(true);
    expect(zhihu.skipNormalPublishOptionsLoad).toBe(true);
    expect(typeof wordpress.buildInitialDraft).toBe("function");
  });

  it("keeps static-site providers fully wired while excluding unsupported normal-publish, media, and delete capabilities", () => {
    for (const providerId of Object.keys(STATIC_SITE_PROVIDER_GENERATORS) as Array<keyof typeof STATIC_SITE_PROVIDER_GENERATORS>) {
      const definition = getProviderDefinition(providerId);
      const target = definition.createTarget();
      const fields = definition.settingsForm.getFields(target, {
        locale: "en",
        t: (key: string) => key,
      });

      expect(definition.capabilities).toMatchObject({
        publish: true,
        update: true,
        delete: false,
        media: "unsupported",
        normalPublish: false,
        quickPublish: true,
      });
      expect(definition.normalPublish).toBeUndefined();
      expect(typeof definition.createProvider).toBe("function");
      expect(fields.map((field) => field.key)).not.toContain("siteGenerator");
      expect(fields.map((field) => field.key)).toContain("contentRoot");
      expect(fields.map((field) => field.key)).toContain(
        "commitMessageTemplate",
      );
    }
  });


  it("keeps legacy static-site ids runtime-compatible but out of Marketplace order", () => {
    const legacyGithub = getProviderDefinition("github").createTarget();
    const legacyGitlab = getProviderDefinition("gitlab").createTarget();

    expect(legacyGithub).toMatchObject({ provider: "github", siteGenerator: "hugo" });
    expect(legacyGitlab).toMatchObject({ provider: "gitlab", siteGenerator: "hugo" });
    expect(getProviderDefinitions().map((definition) => definition.id)).not.toContain("github");
    expect(getProviderDefinitions().map((definition) => definition.id)).not.toContain("gitlab");
  });

  it("pins every generator-specific static-site definition to its provider id and runtime factory", () => {
    for (const [providerId, generator] of Object.entries(STATIC_SITE_PROVIDER_GENERATORS) as Array<[keyof typeof STATIC_SITE_PROVIDER_GENERATORS, (typeof STATIC_SITE_PROVIDER_GENERATORS)[keyof typeof STATIC_SITE_PROVIDER_GENERATORS]]>) {
      const definition = getProviderDefinition(providerId);
      const target = definition.createTarget();
      const normalized = definition.normalizeTarget({
        ...target,
        siteGenerator: generator === "hugo" ? "hexo" : "hugo",
      } as never);
      const provider = definition.createProvider({} as never);

      expect(target).toMatchObject({
        provider: providerId,
        siteGenerator: generator,
      });
      expect(normalized).toMatchObject({
        provider: providerId,
        siteGenerator: generator,
      });
      expect(provider.provider).toBe(providerId);
    }
  });

  it("exposes runtime provider factories for all built-in providers", () => {
    for (const providerId of ["wordpress", "wordpress-com", "metaweblog", "cnblogs", "typecho", "jvue", "yuque", "zhihu", "csdn", "juejin", "github-hugo", "gitlab-hugo"] as const) {
      const definition = getProviderDefinition(providerId);
      expect(typeof definition.createProvider).toBe("function");
    }
  });
});
