import { App, MarkdownRenderer } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderMarkdownToHtml } from "../src/core/html";

const COPY_CODE_BUTTON_PATTERN =
  /<button\b[^>]*class=(["'])[^"'<>]*\bcopy-code-button\b[^"'<>]*\1[^>]*>[\s\S]*?<\/button>/g;

class FakeHtmlContainer {
  innerHTML = "";

  querySelectorAll(selector: string): Array<{ remove(): void }> {
    if (selector !== "button.copy-code-button") {
      return [];
    }

    const matches = Array.from(this.innerHTML.matchAll(COPY_CODE_BUTTON_PATTERN), (match) => match[0]);
    return matches.map((match) => ({
      remove: () => {
        this.innerHTML = this.innerHTML.replace(match, "");
      },
    }));
  }
}

function stubDocument(): void {
  vi.stubGlobal("document", {
    createElement: vi.fn(() => new FakeHtmlContainer()),
  });
}

describe("renderMarkdownToHtml", () => {
  beforeEach(() => {
    vi.mocked(MarkdownRenderer.render).mockReset();
    stubDocument();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes copy buttons injected for code blocks from exported HTML", async () => {
    vi.mocked(MarkdownRenderer.render).mockImplementation(
      async (_app: unknown, _markdown: string, container: FakeHtmlContainer) => {
        container.innerHTML =
          '<pre><code>npm run build</code><button class="copy-code-button">Copy</button></pre>';
      }
    );

    const html = await renderMarkdownToHtml({} as App, "```sh\nnpm run build\n```", "Notes/Post.md");

    expect(html).toContain("<pre><code>npm run build</code>");
    expect(html).not.toContain("copy-code-button");
  });

  it("keeps unrelated buttons in exported HTML", async () => {
    vi.mocked(MarkdownRenderer.render).mockImplementation(
      async (_app: unknown, _markdown: string, container: FakeHtmlContainer) => {
        container.innerHTML = '<div><button class="action-button">Keep</button></div>';
      }
    );

    const html = await renderMarkdownToHtml({} as App, "Body", "Notes/Post.md");

    expect(html).toContain('<button class="action-button">Keep</button>');
  });
});
