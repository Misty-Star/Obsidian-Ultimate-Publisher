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

  it("renders localized llm settings copy in zh-CN", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          llm: {
            ...DEFAULT_SETTINGS.llm,
            enabled: true,
            vendor: "openai",
            model: "gpt-5-mini",
          },
        },
        initialTab: "llm",
        i18n: createI18n("zh-CN"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
        onUpdateLlmSettings: vi.fn(),
      })
    );

    expect(markup).toContain("AI 设置");
    expect(markup).toContain("配置用于标题和摘要生成的共享 LLM Provider。");
    expect(markup).toContain("启用 AI 辅助");
    expect(markup).toContain("超时（毫秒）");
    expect(markup).toContain("最大输入字符数");
  });

  it("renders frontmatter automation panel copy in English", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          frontmatterAutomation: {
            enabled: true,
            includeOptionComments: false,
          },
        },
        initialTab: "llm",
        i18n: createI18n("en"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
        onUpdateLlmSettings: vi.fn(),
        onUpdateFrontmatterAutomationSettings: vi.fn(),
      })
    );

    expect(markup).toContain("Frontmatter Automation");
    expect(markup).toContain("Automatically insert publish frontmatter when creating Markdown notes.");
    expect(markup).toContain("Enable frontmatter automation");
    expect(markup).toContain("Include option comments");
  });

  it("renders frontmatter automation panel copy in zh-CN", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          frontmatterAutomation: {
            enabled: true,
            includeOptionComments: true,
          },
        },
        initialTab: "llm",
        i18n: createI18n("zh-CN"),
        onAddProvider: vi.fn(),
        onDeleteTarget: vi.fn(),
        onEditTarget: vi.fn(),
        onUpdateLlmSettings: vi.fn(),
        onUpdateFrontmatterAutomationSettings: vi.fn(),
      })
    );

    expect(markup).toContain("Frontmatter 自动化");
    expect(markup).toContain("创建 Markdown 笔记时自动插入发布 frontmatter 模板。");
    expect(markup).toContain("启用 frontmatter 自动化");
    expect(markup).toContain("包含可选项注释");
  });

  it("shows the vendor default endpoint as placeholder when endpoint override is empty", () => {
    const anthropicMarkup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          llm: {
            ...DEFAULT_SETTINGS.llm,
            vendor: "anthropic",
            endpointOverride: "",
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
    const geminiMarkup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          llm: {
            ...DEFAULT_SETTINGS.llm,
            vendor: "gemini",
            endpointOverride: "",
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

    expect(anthropicMarkup).toContain('placeholder="https://api.anthropic.com/v1"');
    expect(geminiMarkup).toContain('placeholder="https://generativelanguage.googleapis.com/v1beta"');
  });

  it("renders the dedicated openai-compatible vendor option and its chat completions placeholder", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          llm: {
            ...DEFAULT_SETTINGS.llm,
            vendor: "openai-compatible" as never,
            endpointOverride: "",
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

    expect(markup).toContain('<option value="openai-compatible" selected="">OpenAI Compatible</option>');
    expect(markup).toContain('placeholder="https://api.openai.com/v1/chat/completions"');
  });

  it("keeps the custom endpoint override value when one is configured", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settings: {
          ...DEFAULT_SETTINGS,
          llm: {
            ...DEFAULT_SETTINGS.llm,
            vendor: "openai",
            endpointOverride: "https://proxy.example.com/v1",
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

    expect(markup).toContain('value="https://proxy.example.com/v1"');
    expect(markup).toContain('placeholder="https://api.openai.com/v1"');
  });
});
