import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/i18n";
import { createWordpressTarget } from "../src/settings";
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
    expect(markup).toContain("Local Export");
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
});
