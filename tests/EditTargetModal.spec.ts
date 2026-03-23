import { describe, expect, it } from "vitest";
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
});
