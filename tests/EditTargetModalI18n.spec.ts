import { describe, expect, it } from "vitest";
import { resetObsidianTestState, setObsidianTestLanguage } from "obsidian";
import { createZhihuTarget } from "../src/settings";
import { EditTargetModal } from "../src/ui/settings/EditTargetModal";

function collectText(node: { textContent: string; children: Array<{ textContent: string; children: unknown[] }> }): string {
  const chunks: string[] = [];

  const visit = (current: { textContent: string; children: Array<{ textContent: string; children: unknown[] }> }) => {
    if (current.textContent) {
      chunks.push(current.textContent);
    }
    for (const child of current.children) {
      visit(child as never);
    }
  };

  visit(node);
  return chunks.join(" ");
}

describe("EditTargetModal i18n", () => {
  it("renders zh-CN edit modal title, auth section, and action buttons", () => {
    resetObsidianTestState();
    setObsidianTestLanguage("zh-CN");

    const target = {
      ...createZhihuTarget(),
      name: "Zhihu",
      cookie: "cookie-value",
      accountName: "测试账号",
      accountId: "uid-001",
      lastAuthAt: "2026-03-25T01:00:00.000Z",
      lastValidatedAt: "2026-03-25T01:05:00.000Z",
    };

    const modal = new EditTargetModal({} as never, {
      mode: "edit",
      target,
      onSave: () => undefined,
    });

    modal.onOpen();
    const text = collectText(modal.contentEl as never);

    expect(text).toContain("编辑 知乎 目标");
    expect(text).toContain("授权");
    expect(text).toContain("状态：已授权");
    expect(text).toContain("账号：测试账号 (uid-001)");
    expect(text).toContain("上次授权：2026-03-25T01:00:00.000Z");
    expect(text).toContain("上次校验：2026-03-25T01:05:00.000Z");
    expect(text).toContain("取消");
    expect(text).toContain("保存");
    expect(text).toContain("网页授权");
    expect(text).toContain("校验配置");
    expect(text).toContain("清除授权");
  });

  it("renders zh-CN create modal title", () => {
    resetObsidianTestState();
    setObsidianTestLanguage("zh-CN");

    const modal = new EditTargetModal({} as never, {
      mode: "create",
      target: createZhihuTarget(),
      onSave: () => undefined,
    });

    modal.onOpen();
    const text = collectText(modal.contentEl as never);

    expect(text).toContain("添加 知乎 目标");
  });
});
