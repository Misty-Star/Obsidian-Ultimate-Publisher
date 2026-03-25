import { beforeEach, describe, expect, it } from "vitest";
import { resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { createI18n, createI18nFromObsidianLanguage, normalizeLocale } from "../src/i18n";

describe("i18n", () => {
  beforeEach(() => {
    resetObsidianTestState();
  });

  it("normalizes locale to supported values", () => {
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("fr")).toBe("en");
  });

  it("falls back to en when locale input is empty", () => {
    expect(normalizeLocale(undefined as unknown as string)).toBe("en");
    expect(normalizeLocale(null as unknown as string)).toBe("en");
    expect(normalizeLocale("")).toBe("en");
    expect(createI18n(undefined as unknown as string).locale).toBe("en");
  });

  it("falls back to key for missing message", () => {
    const i18n = createI18n("en");

    expect(i18n.t("notice.publish.not-exists")).toBe("notice.publish.not-exists");
  });

  it("resolves custom zh locale to zh-CN messages", () => {
    const i18n = createI18n("zh-Hans");

    expect(i18n.locale).toBe("zh-CN");
    expect(i18n.t("menu.publish")).toBe("发布");
  });

  it("falls back to english when current locale misses key", () => {
    const i18n = createI18n("zh-CN");
    expect(i18n.t("i18n.only-en.demo")).toBe("English only message");
  });

  it("interpolates notice.publish.started", () => {
    const i18n = createI18n("en");

    expect(i18n.t("notice.publish.started", { note: "My Note", target: "WordPress" })).toBe(
      "Publishing \"My Note\" to WordPress..."
    );
  });

  it("creates translator from obsidian app language", () => {
    setObsidianTestLanguage("zh-TW");

    const i18n = createI18nFromObsidianLanguage();
    expect(i18n.locale).toBe("zh-CN");
    expect(i18n.t("menu.publish")).toBe("发布");
  });

  it("resets obsidian test language to en", () => {
    setObsidianTestLanguage("zh-TW");
    resetObsidianTestState();

    const i18n = createI18nFromObsidianLanguage();
    expect(i18n.locale).toBe("en");
    expect(i18n.t("menu.publish")).toBe("Publish");
  });
});
