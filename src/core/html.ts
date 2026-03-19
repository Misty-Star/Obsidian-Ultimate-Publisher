import { App, Component, MarkdownRenderer } from "obsidian";

export async function renderMarkdownToHtml(app: App, markdown: string, sourcePath: string): Promise<string> {
  const container = document.createElement("div");
  const component = new Component();
  component.load();
  try {
    await MarkdownRenderer.render(app, markdown, container, sourcePath, component);
    container.querySelectorAll("button.copy-code-button").forEach((copyButton) => {
      copyButton.remove();
    });
    return container.innerHTML.trim();
  } finally {
    component.unload();
  }
}
