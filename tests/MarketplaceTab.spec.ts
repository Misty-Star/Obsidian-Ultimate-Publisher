import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/i18n";
import { getProviderCatalog } from "../src/ui/settings/providerCatalog";
import { MarketplaceTab } from "../src/ui/settings/MarketplaceTab";
import { ProviderCategory, UltimatePublisherSettings } from "../src/types";

let hookState: ProviderCategory | null | undefined;

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useMemo: <T>(factory: () => T): T => factory(),
    useEffect: (effect: () => void): void => {
      effect();
    },
    useState: <T>(
      initial: T | (() => T),
    ): [T, (next: T | ((previous: T) => T)) => void] => {
      if (hookState === undefined) {
        hookState = (
          typeof initial === "function" ? (initial as () => T)() : initial
        ) as ProviderCategory | null;
      }
      const setState = (next: T | ((previous: T) => T)): void => {
        const previous = hookState as T;
        hookState = (
          typeof next === "function"
            ? (next as (value: T) => T)(previous)
            : next
        ) as ProviderCategory | null;
      };
      return [hookState as T, setState];
    },
  };
});

type RenderNode =
  | string
  | number
  | null
  | {
      type: unknown;
      props: { [key: string]: unknown; children: RenderNode[] };
    };

function expandElement(node: unknown): RenderNode {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }
  if (typeof node === "string" || typeof node === "number") {
    return node;
  }
  if (Array.isArray(node)) {
    return {
      type: "fragment",
      props: {
        children: node
          .map((item) => expandElement(item))
          .filter((item) => item !== null) as RenderNode[],
      },
    };
  }
  if (!React.isValidElement(node)) {
    return null;
  }

  const element = node as React.ReactElement<{ children?: unknown }>;
  if (typeof element.type === "function") {
    return expandElement(element.type(element.props));
  }

  const children = React.Children.toArray(element.props.children)
    .map((child) => expandElement(child))
    .filter((child) => child !== null) as RenderNode[];
  return {
    type: element.type,
    props: {
      ...(element.props as unknown as Record<string, unknown>),
      children,
    },
  };
}

function collectText(node: RenderNode): string {
  if (node === null) {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  return node.props.children.map((child) => collectText(child)).join("");
}

function findButtonByText(
  node: RenderNode,
  text: string,
): { onClick: () => void } {
  if (node === null || typeof node === "string" || typeof node === "number") {
    throw new Error(`Button "${text}" not found.`);
  }

  const queue: RenderNode[] = [node];
  while (queue.length > 0) {
    const current = queue.shift();
    if (
      !current ||
      typeof current === "string" ||
      typeof current === "number"
    ) {
      continue;
    }

    if (current.type === "button" && collectText(current).trim() === text) {
      const onClick = current.props.onClick;
      if (typeof onClick !== "function") {
        throw new Error(`Button "${text}" does not have a click handler.`);
      }
      return { onClick: onClick as () => void };
    }

    queue.push(...current.props.children);
  }

  throw new Error(`Button "${text}" not found.`);
}

describe("MarketplaceTab", () => {
  beforeEach(() => {
    hookState = undefined;
  });

  it("renders localized zh-CN provider names and svg icons", () => {
    const i18n = createI18n("zh-CN");
    const settings: UltimatePublisherSettings = { targets: [], records: [] };
    const providerCatalog = getProviderCatalog(i18n);

    const tree = expandElement(
      React.createElement(MarketplaceTab, {
        i18n,
        settings,
        providerCatalog,
        onAddProvider: vi.fn(),
      }),
    );
    const text = collectText(tree);

    expect(text).toContain("语雀");
    expect(text).not.toContain("Zhihu");

    findButtonByText(tree, "网页").onClick();

    const switchedTree = expandElement(
      React.createElement(MarketplaceTab, {
        i18n,
        settings,
        providerCatalog,
        onAddProvider: vi.fn(),
      }),
    );
    const switchedText = collectText(switchedTree);

    expect(switchedText).toContain("知乎");
    expect(switchedText).toContain("掘金");
    expect(switchedText).toContain("简书");

    const serialized = JSON.stringify(switchedTree);
    expect(serialized).toContain("dangerouslySetInnerHTML");
    expect(serialized).toContain("<svg");
  });

  it("switches visible providers when clicking category tabs", () => {
    const i18n = createI18n("en");
    const settings: UltimatePublisherSettings = { targets: [], records: [] };
    const providerCatalog = getProviderCatalog(i18n);

    const initialTree = expandElement(
      React.createElement(MarketplaceTab, {
        i18n,
        settings,
        providerCatalog,
        onAddProvider: vi.fn(),
      }),
    );
    const initialText = collectText(initialTree);

    expect(initialText).toContain("Yuque");
    expect(initialText).not.toContain("Zhihu");

    findButtonByText(initialTree, "Web").onClick();

    const switchedTree = expandElement(
      React.createElement(MarketplaceTab, {
        i18n,
        settings,
        providerCatalog,
        onAddProvider: vi.fn(),
      }),
    );
    const switchedText = collectText(switchedTree);

    expect(switchedText).toContain("Zhihu");
    expect(switchedText).toContain("CSDN");
    expect(switchedText).toContain("Juejin");
    expect(switchedText).toContain("Jianshu");
    expect(switchedText).toContain("WeChat Official Account");
    expect(switchedText).toContain("Halo Web");
    expect(switchedText).toContain("Bilibili");
    expect(switchedText).toContain("Xiaohongshu");
    expect(switchedText).not.toContain("Yuque");
  });
});
