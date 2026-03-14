import { App, SuggestModal } from "obsidian";
import { PublishTargetConfig } from "../types";

export class PublishTargetModal extends SuggestModal<PublishTargetConfig> {
  constructor(
    app: App,
    private readonly targets: PublishTargetConfig[],
    private readonly onChooseTarget: (target: PublishTargetConfig) => void
  ) {
    super(app);
    this.setPlaceholder("Select a publish target");
  }

  getSuggestions(query: string): PublishTargetConfig[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return this.targets;
    }
    return this.targets.filter((target) =>
      [target.name, target.provider].some((value) => value.toLowerCase().includes(normalized))
    );
  }

  renderSuggestion(target: PublishTargetConfig, el: HTMLElement): void {
    el.createEl("div", { text: target.name });
    el.createEl("small", { text: target.provider });
  }

  onChooseSuggestion(target: PublishTargetConfig): void {
    this.onChooseTarget(target);
  }
}
