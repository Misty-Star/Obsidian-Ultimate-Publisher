import { describe, expect, it } from "vitest";
import { getProviderDefinitions } from "../src/providers/definitions";

type MigrationStatus =
  | "implemented"
  | "covered-by-shared-provider"
  | "planned"
  | "out-of-scope";

const REFERENCE_PLATFORM_MIGRATION_MATRIX: Array<{
  referencePlatform: string;
  status: MigrationStatus;
  providerId?: string;
  rationale: string;
}> = [
  {
    referencePlatform: "Yuque",
    status: "implemented",
    providerId: "yuque",
    rationale: "Existing REST provider.",
  },
  {
    referencePlatform: "Notion",
    status: "implemented",
    providerId: "notion",
    rationale: "REST API provider with publish/update tests.",
  },
  {
    referencePlatform: "Halo API",
    status: "implemented",
    providerId: "halo",
    rationale: "Halo API provider with publish/update tests.",
  },
  {
    referencePlatform: "Telegraph",
    status: "implemented",
    providerId: "telegraph",
    rationale:
      "Telegraph API provider with publish/update tests and explicit unsupported delete.",
  },
  {
    referencePlatform: "Confluence",
    status: "implemented",
    providerId: "confluence",
    rationale: "Confluence API provider with publish/update tests.",
  },
  {
    referencePlatform: "WordPress",
    status: "implemented",
    providerId: "wordpress",
    rationale: "Existing WordPress REST provider.",
  },
  {
    referencePlatform: "WordPress.com",
    status: "implemented",
    providerId: "wordpress-com",
    rationale: "XML-RPC provider with publish/update tests.",
  },
  {
    referencePlatform: "MetaWeblog",
    status: "implemented",
    providerId: "metaweblog",
    rationale: "Generic XML-RPC provider with publish/update tests.",
  },
  {
    referencePlatform: "CNBlogs",
    status: "implemented",
    providerId: "cnblogs",
    rationale: "XML-RPC provider specialization.",
  },
  {
    referencePlatform: "Typecho",
    status: "implemented",
    providerId: "typecho",
    rationale: "XML-RPC provider specialization.",
  },
  {
    referencePlatform: "Jvue",
    status: "implemented",
    providerId: "jvue",
    rationale: "XML-RPC provider specialization.",
  },
  {
    referencePlatform:
      "GitHub Hugo/Hexo/Jekyll/VuePress/VuePress2/VitePress/Quartz",
    status: "implemented",
    providerId: "github-hugo",
    rationale:
      "GitHub static-site generators are exposed as concrete Marketplace provider objects backed by the shared GitHub runtime.",
  },
  {
    referencePlatform: "GitLab Hexo/Hugo/Jekyll/VuePress/VuePress2/VitePress",
    status: "implemented",
    providerId: "gitlab-hugo",
    rationale:
      "GitLab reference generators are exposed as concrete Marketplace provider objects backed by the shared GitLab runtime; reference parity intentionally omits GitLab Quartz.",
  },
  {
    referencePlatform: "Zhihu",
    status: "implemented",
    providerId: "zhihu",
    rationale: "Existing cookie-web provider.",
  },
  {
    referencePlatform: "CSDN",
    status: "implemented",
    providerId: "csdn",
    rationale: "Existing cookie-web provider.",
  },
  {
    referencePlatform: "Juejin",
    status: "implemented",
    providerId: "juejin",
    rationale: "Existing cookie-web provider.",
  },
  {
    referencePlatform: "WeChat Official Account",
    status: "implemented",
    providerId: "wechat",
    rationale: "Cookie-web provider has tested validate/publish/update flow.",
  },
  {
    referencePlatform: "Jianshu",
    status: "implemented",
    providerId: "jianshu",
    rationale: "Cookie-web provider has tested validate/publish/update flow.",
  },
  {
    referencePlatform: "Halo web",
    status: "planned",
    rationale: "Split from Halo API only if required.",
  },
  {
    referencePlatform: "Bilibili",
    status: "implemented",
    providerId: "bilibili",
    rationale: "Cookie-web provider has tested validate/publish/update flow.",
  },
  {
    referencePlatform: "Xiaohongshu",
    status: "implemented",
    providerId: "xiaohongshu",
    rationale:
      "Cookie-web provider has tested validate/publish/update flow without porting the reference arbitrary script pattern.",
  },
  {
    referencePlatform: "LocalSystem",
    status: "out-of-scope",
    rationale:
      "Local File was removed from the Marketplace/product surface after the hosted generator-specific static-site split.",
  },
  {
    referencePlatform: "FTP/SFTP/cloud drives",
    status: "out-of-scope",
    rationale:
      "Reference placeholders are not listed as real supported adapters.",
  },
];

describe("reference platform migration inventory", () => {
  it("classifies every real reference platform before exposing providers", () => {
    const providerIds = new Set(
      getProviderDefinitions().map((definition) => definition.id),
    );

    expect(REFERENCE_PLATFORM_MIGRATION_MATRIX).toHaveLength(23);
    for (const row of REFERENCE_PLATFORM_MIGRATION_MATRIX) {
      expect(row.rationale).not.toEqual("");
      if (row.providerId) {
        expect(providerIds.has(row.providerId as never)).toBe(true);
      }
      if (row.status === "planned") {
        expect(row.providerId).toBeUndefined();
      }
      if (row.status === "implemented") {
        expect(row.providerId).toBeTruthy();
      }
    }
  });
});
