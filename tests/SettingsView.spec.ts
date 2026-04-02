import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/i18n";
import { DEFAULT_SETTINGS, createWordpressTarget } from "../src/settings";
import { SettingsView } from "../src/ui/settings/SettingsView";
import { UltimatePublisherSettings } from "../src/types";

describe("SettingsView", () => {
  it("renders the configured targets empty state by default", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: { targets: [], records: [] } satisfies UltimatePublisherSettings,
        i18n: createI18n("en"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
      })
    );

    expect(markup).toContain("Configured Targets");
    expect(markup).toContain("Marketplace");
    expect(markup).toContain("No targets configured yet.");
    expect(markup).toContain("ultimate-publisher-settings-panel");
  });

  it("renders zh-CN labels and empty state in configured tab", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: { targets: [], records: [] } satisfies UltimatePublisherSettings,
        i18n: createI18n("zh-CN"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
      })
    );

    expect(markup).toContain("已配置目标");
    expect(markup).toContain("市场");
    expect(markup).toContain("尚未配置任何目标。");
    expect(markup).toContain("切换到“市场”标签以添加目标。");
  });

  it("renders marketplace providers and configured badges when the marketplace tab is selected", () => {
    const settings: UltimatePublisherSettings = {
      targets: [{ ...createWordpressTarget(), id: "wp-1", name: "Main Blog" }],
      records: [],
    };

    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings,
        initialTab: "marketplace",
        i18n: createI18n("zh-CN"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
      })
    );

    expect(markup).toContain("WordPress");
    expect(markup).toContain("Yuque");
    expect(markup).toContain("Zhihu");
    expect(markup).toContain("已配置");
  });

  it("keeps English labels when locale is en", () => {
    const settings: UltimatePublisherSettings = {
      targets: [{ ...createWordpressTarget(), id: "wp-1", name: "Main Blog" }],
      records: [],
    };

    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings,
        initialTab: "marketplace",
        i18n: createI18n("en"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
      })
    );

    expect(markup).toContain("Configured Targets");
    expect(markup).toContain("Marketplace");
    expect(markup).toContain("Configured");
  });

  it("renders the AI tab label in both locales", () => {
    const enMarkup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: DEFAULT_SETTINGS,
        i18n: createI18n("en"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
        onUpdateLlmSettings: vi.fn(),
      })
    );
    const zhMarkup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: DEFAULT_SETTINGS,
        i18n: createI18n("zh-CN"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
        onUpdateLlmSettings: vi.fn(),
      })
    );

    expect(enMarkup).toContain("AI");
    expect(zhMarkup).toContain("AI");
  });

  it("renders the llm settings panel when the ai tab is selected", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          llm: {
            ...DEFAULT_SETTINGS.llm,
            enabled: true,
            vendor: "anthropic",
            model: "claude-sonnet-4-5",
          },
        },
        initialTab: "llm",
        i18n: createI18n("en"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
        onUpdateLlmSettings: vi.fn(),
      })
    );

    expect(markup).toContain("AI Settings");
    expect(markup).toContain("Vendor");
    expect(markup).toContain("Model");
    expect(markup).toContain("claude-sonnet-4-5");
  });
});
