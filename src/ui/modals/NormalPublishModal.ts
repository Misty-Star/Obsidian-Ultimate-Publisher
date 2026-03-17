import { Modal, Notice, TFile } from "obsidian";
import { PublishWorkflow } from "../../core/publishWorkflow";
import UltimatePublisherPlugin from "../../plugin";
import { PublishTargetConfig } from "../../types";
import { deriveNoteTargetSummaries } from "../publishSummary";

interface AppSettingsController {
  open(): void;
  openTabById(id: string): void;
}

interface AppWithSettings {
  setting?: AppSettingsController;
}

export class NormalPublishModal extends Modal {
  private selectedTargetId: string | null = null;
  private isPublishing = false;
  private errorMessage: string | null = null;

  constructor(
    private readonly plugin: UltimatePublisherPlugin,
    private readonly file: TFile,
    private readonly workflow: PublishWorkflow
  ) {
    super(plugin.app);
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private openPublishSettings(): void {
    const appWithSettings = this.app as typeof this.app & AppWithSettings;
    appWithSettings.setting?.open();
    appWithSettings.setting?.openTabById(this.plugin.manifest.id);
  }

  private getTargetById(targetId: string): PublishTargetConfig | undefined {
    return this.plugin.settings.targets.find((target) => target.id === targetId);
  }

  private createInfoRow(container: HTMLElement, label: string, value: string): void {
    const row = container.createDiv();
    row.createEl("strong", { text: `${label}: ` });
    row.createSpan({ text: value });
  }

  private async handlePublish(target: PublishTargetConfig): Promise<void> {
    this.isPublishing = true;
    this.errorMessage = null;
    await this.render();

    try {
      const result = await this.workflow.runSingle(this.file, target, this.plugin.settings);
      this.plugin.settings = result.settings;
      await this.plugin.saveSettings();
      new Notice(`Publish succeeded: ${target.name} ${result.action}.`);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`Publish failed: ${this.errorMessage}`, 8000);
    } finally {
      this.isPublishing = false;
      await this.render();
    }
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Normal Publish" });

    const noteInfo = contentEl.createDiv();
    this.createInfoRow(noteInfo, "Note", this.file.basename);
    this.createInfoRow(noteInfo, "Path", this.file.path);

    const summaries = deriveNoteTargetSummaries(this.plugin.settings, this.file.path);
    this.selectedTargetId ??= summaries.find((item) => item.enabled)?.targetId ?? null;

    const enabledSummaries = summaries.filter((item) => item.enabled);
    if (enabledSummaries.length === 0) {
      contentEl.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: "No enabled publish targets. Open settings to enable at least one target.",
      });

      const settingsButton = contentEl.createEl("button", { text: "Open Publish Settings" });
      settingsButton.addEventListener("click", () => {
        this.openPublishSettings();
      });
      return;
    }

    if (!this.selectedTargetId || !summaries.some((item) => item.targetId === this.selectedTargetId && item.enabled)) {
      this.selectedTargetId = enabledSummaries[0].targetId;
    }

    const targetList = contentEl.createDiv();
    targetList.createEl("h3", { text: "Target" });

    for (const summary of summaries) {
      const row = targetList.createEl("label");
      row.style.display = "block";
      row.style.margin = "6px 0";

      const input = row.createEl("input", { type: "radio" });
      input.name = "ultimate-publisher-normal-target";
      input.value = summary.targetId;
      input.checked = summary.targetId === this.selectedTargetId;
      input.disabled = !summary.enabled || this.isPublishing;
      input.addEventListener("change", () => {
        if (input.checked) {
          this.selectedTargetId = summary.targetId;
          void this.render();
        }
      });

      row.appendText(` ${summary.name} (${summary.provider})`);
      row.createEl("small", {
        text: ` - ${summary.action === "update" ? "Update existing post" : "Publish new post"}${summary.enabled ? "" : " (disabled)"}`,
      });
    }

    const selectedSummary = summaries.find((item) => item.targetId === this.selectedTargetId) ?? null;
    const selectedAction = selectedSummary?.action ?? "publish";
    contentEl.createEl("p", {
      text: `Selected action: ${selectedAction === "update" ? "update" : "publish"}`,
    });

    if (this.errorMessage) {
      contentEl.createEl("p", {
        cls: "mod-warning",
        text: `Last error: ${this.errorMessage}`,
      });
    }

    const actions = contentEl.createDiv({ cls: "ultimate-publisher-setting-actions" });

    const publishButton = actions.createEl("button", {
      text: selectedAction === "update" ? "Update" : "Publish",
    });
    publishButton.toggleClass("mod-cta", true);
    publishButton.disabled = this.isPublishing || !this.selectedTargetId;
    publishButton.addEventListener("click", () => {
      if (!this.selectedTargetId) {
        return;
      }
      const target = this.getTargetById(this.selectedTargetId);
      if (!target || !target.enabled) {
        this.errorMessage = "Selected target is not available.";
        new Notice(this.errorMessage, 6000);
        void this.render();
        return;
      }
      void this.handlePublish(target);
    });

    const settingsButton = actions.createEl("button", { text: "Open Publish Settings" });
    settingsButton.disabled = this.isPublishing;
    settingsButton.addEventListener("click", () => {
      this.openPublishSettings();
    });
  }
}
