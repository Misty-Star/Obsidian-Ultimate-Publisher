import { describe, expect, it } from "vitest";
import { getProviderDefinitions } from "../src/providers/definitions";

type MigrationStatus = "implemented" | "covered-by-shared-provider" | "planned" | "out-of-scope";

const REFERENCE_PLATFORM_MIGRATION_MATRIX: Array<{
  referencePlatform: string;
  status: MigrationStatus;
  providerId?: string;
  rationale: string;
}> = [
  { referencePlatform: "Yuque", status: "implemented", providerId: "yuque", rationale: "Existing REST provider." },
  { referencePlatform: "Notion", status: "planned", rationale: "API provider is not exposed until validate/publish/update tests exist." },
  { referencePlatform: "Halo API", status: "planned", rationale: "API provider is not exposed until validate/publish/update tests exist." },
  { referencePlatform: "Telegraph", status: "planned", rationale: "API provider is not exposed until validate/publish/update tests exist." },
  { referencePlatform: "Confluence", status: "planned", rationale: "API provider is not exposed until validate/publish/update tests exist." },
  { referencePlatform: "WordPress", status: "implemented", providerId: "wordpress", rationale: "Existing WordPress REST provider." },
  { referencePlatform: "WordPress.com", status: "planned", rationale: "Separate API/XML-RPC decision remains open; do not expose without real tests." },
  { referencePlatform: "MetaWeblog", status: "planned", rationale: "XML-RPC helper must be introduced before exposure." },
  { referencePlatform: "CNBlogs", status: "planned", rationale: "Depends on XML-RPC helper and provider tests." },
  { referencePlatform: "Typecho", status: "planned", rationale: "Depends on XML-RPC helper and provider tests." },
  { referencePlatform: "Jvue", status: "planned", rationale: "Depends on XML-RPC/helper API confirmation and tests." },
  { referencePlatform: "GitHub Hugo/Hexo/Jekyll/VuePress/VuePress2/VitePress/Quartz", status: "covered-by-shared-provider", providerId: "github", rationale: "Shared static-site provider with generator subtype." },
  { referencePlatform: "GitLab Hexo/Hugo/Jekyll/VuePress/VuePress2/VitePress", status: "covered-by-shared-provider", providerId: "gitlab", rationale: "Shared static-site provider with generator subtype." },
  { referencePlatform: "Zhihu", status: "implemented", providerId: "zhihu", rationale: "Existing cookie-web provider." },
  { referencePlatform: "CSDN", status: "implemented", providerId: "csdn", rationale: "Existing cookie-web provider." },
  { referencePlatform: "Juejin", status: "implemented", providerId: "juejin", rationale: "Existing cookie-web provider." },
  { referencePlatform: "WeChat Official Account", status: "planned", rationale: "Web flow must be tested before Marketplace exposure." },
  { referencePlatform: "Jianshu", status: "planned", rationale: "Web flow must be tested before Marketplace exposure." },
  { referencePlatform: "Halo web", status: "planned", rationale: "Split from Halo API only if required and tested." },
  { referencePlatform: "Bilibili", status: "planned", rationale: "Web flow must be tested before Marketplace exposure." },
  { referencePlatform: "Xiaohongshu", status: "planned", rationale: "Reference script pattern needs security review before port." },
  { referencePlatform: "LocalSystem", status: "planned", rationale: "Filesystem export path boundary and overwrite behavior must be implemented and tested before exposure." },
  { referencePlatform: "FTP/SFTP/cloud drives", status: "out-of-scope", rationale: "Reference placeholders are not listed as real supported adapters." },
];

describe("reference platform migration inventory", () => {
  it("classifies every real reference platform without exposing unimplemented providers", () => {
    const providerIds = new Set(getProviderDefinitions().map((definition) => definition.id));

    expect(REFERENCE_PLATFORM_MIGRATION_MATRIX).toHaveLength(23);
    for (const row of REFERENCE_PLATFORM_MIGRATION_MATRIX) {
      expect(row.rationale).not.toEqual("");
      if (row.providerId) {
        expect(providerIds.has(row.providerId as never)).toBe(true);
      }
      if (row.status === "planned") {
        expect(row.providerId).toBeUndefined();
      }
    }
  });
});
