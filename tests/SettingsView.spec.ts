import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createWordpressTarget } from "../src/settings";
import { SettingsView } from "../src/ui/settings/SettingsView";
import { UltimatePublisherSettings } from "../src/types";

describe("SettingsView", () => {
  it("renders the configured targets empty state by default", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: { targets: [], records: [] } satisfies UltimatePublisherSettings,
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

  it("renders marketplace providers and configured badges when the marketplace tab is selected", () => {
    const settings: UltimatePublisherSettings = {
      targets: [{ ...createWordpressTarget(), id: "wp-1", name: "Main Blog" }],
      records: [],
    };

    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings,
        initialTab: "marketplace",
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
      })
    );

    expect(markup).toContain("WordPress");
    expect(markup).toContain("Yuque");
    expect(markup).toContain("Local Export");
    expect(markup).toContain("Configured");
  });
});
