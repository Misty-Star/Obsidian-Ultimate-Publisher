import { describe, expect, it } from "vitest";
import { createI18n } from "../src/i18n";
import { createLocalExportTarget, createWordpressTarget, createYuqueTarget } from "../src/settings";
import { applyFieldValue, getModalFieldDefinitions } from "../src/ui/settings/modalForm";

describe("modalForm", () => {
  it("returns common and provider-specific fields for wordpress targets", () => {
    const fields = getModalFieldDefinitions(createWordpressTarget()).map((field) => field.key);

    expect(fields).toEqual([
      "enabled",
      "name",
      "endpoint",
      "username",
      "appPassword",
      "defaultStatus",
      "contentFormat",
    ]);
  });

  it("localizes wordpress field labels while preserving option values and field order", () => {
    const zh = createI18n("zh-CN");
    const fields = getModalFieldDefinitions(createWordpressTarget(), zh);

    expect(fields.map((field) => field.key)).toEqual([
      "enabled",
      "name",
      "endpoint",
      "username",
      "appPassword",
      "defaultStatus",
      "contentFormat",
    ]);
    expect(fields.find((field) => field.key === "name")?.label).toBe("显示名称");
    expect(fields.find((field) => field.key === "contentFormat")?.options).toEqual([
      { value: "markdown", label: "Markdown" },
      { value: "html", label: "HTML" },
    ]);
  });

  it("uses locale fallback for modal labels when translator returns en fallback", () => {
    const zhWithEnFallback = {
      locale: "zh-CN" as const,
      t(key: string): string {
        if (key === "settings.modal.field.name.label") {
          return "Display name";
        }
        return key;
      },
    };

    const fields = getModalFieldDefinitions(createWordpressTarget(), zhWithEnFallback);
    expect(fields.find((field) => field.key === "name")?.label).toBe("显示名称");
  });

  it("trims text input and ignores fields from other providers", () => {
    const wordpressTarget = createWordpressTarget();
    const nextTarget = applyFieldValue(wordpressTarget, "endpoint", " https://example.com ");
    const ignoredTarget = applyFieldValue(wordpressTarget, "repo", "namespace/repo");

    expect(nextTarget.provider).toBe("wordpress");
    expect(nextTarget.endpoint).toBe("https://example.com");
    expect(ignoredTarget).toEqual(wordpressTarget);
  });

  it("preserves provider-specific enum values", () => {
    const yuqueTarget = applyFieldValue(createYuqueTarget(), "publicLevel", "1");
    const localExportTarget = applyFieldValue(createLocalExportTarget(), "yamlType", "hexo");

    expect(yuqueTarget.provider).toBe("yuque");
    expect(yuqueTarget.publicLevel).toBe(1);
    expect(localExportTarget.provider).toBe("local-export");
    expect(localExportTarget.yamlType).toBe("hexo");
  });

  it("returns zhihu-specific fields for zhihu targets", () => {
    const fields = getModalFieldDefinitions({
      id: "zhihu-target",
      name: "Zhihu",
      enabled: true,
      provider: "zhihu",
      cookie: "",
      defaultColumnId: "",
      defaultColumnTitle: "",
    } as any).map((field) => field.key);

    expect(fields).toEqual([
      "enabled",
      "name",
      "cookie",
      "defaultColumnId",
      "defaultColumnTitle",
    ]);
  });

  it("parses csdn and juejin comma-separated default fields", () => {
    const csdnTarget = applyFieldValue(
      {
        id: "csdn-target",
        name: "CSDN",
        enabled: true,
        provider: "csdn",
        cookie: "",
        defaultCategories: [],
        defaultTags: [],
      } as any,
      "defaultCategories",
      "后端, 开发工具"
    );
    const juejinTarget = applyFieldValue(
      {
        id: "juejin-target",
        name: "Juejin",
        enabled: true,
        provider: "juejin",
        cookie: "",
        defaultCategoryId: "",
        defaultCategoryName: "",
        defaultTagIds: [],
        defaultTagNames: [],
        defaultBriefContent: "",
      } as any,
      "defaultTagIds",
      "1, 2,3"
    );

    expect(csdnTarget.defaultCategories).toEqual(["后端", "开发工具"]);
    expect(juejinTarget.defaultTagIds).toEqual(["1", "2", "3"]);
  });
});
