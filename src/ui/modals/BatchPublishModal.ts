import { Modal, Notice, TFile } from "obsidian";
import { BatchPublishTargetResult, PublishWorkflow } from "../../core/publishWorkflow";
import UltimatePublisherPlugin from "../../plugin";
import { PublishTargetConfig } from "../../types";
import { NoteTargetSummary, deriveNoteTargetSummaries, summarizeBatchSelection } from "../publishSummary";

interface AppSettingsController {
  open(): void;
  openTabById(id: string): void;
}

interface AppWithSettings {
  setting?: AppSettingsController;
}

interface NoteSnapshot {
  basename: string;
  path: string;
}

interface BatchRunSummary {
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export class BatchPublishModal extends Modal {
  private readonly selectedTargetIds = new Set<string>();
  private noteSnapshot: NoteSnapshot | null = null;
  private enabledSummaries: NoteTargetSummary[] = [];
  private isPublishing = false;
  private fatalErrorMessage: string | null = null;
  private results: BatchPublishTargetResult[] = [];
  private lastRunSummary: BatchRunSummary | null = null;

  constructor(
    private readonly plugin: UltimatePublisherPlugin,
    private readonly file: TFile,
    private readonly workflow: PublishWorkflow
  ) {
    super(plugin.app);
  }

  async onOpen(): Promise<void> {
    this.noteSnapshot = {
      basename: this.file.basename,
      path: this.file.path,
    };
    this.enabledSummaries = deriveNoteTargetSummaries(this.plugin.settings, this.file.path).filter((item) => item.enabled);

    this.selectedTargetIds.clear();
    for (const summary of this.enabledSummaries) {
      this.selectedTargetIds.add(summary.targetId);
    }

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

  private getSelectedTargets(): PublishTargetConfig[] {
    return this.plugin.settings.targets.filter(
      (target) => target.enabled && this.selectedTargetIds.has(target.id)
    );
  }

  private toggleTargetSelection(targetId: string, checked: boolean): void {
    if (checked) {
      this.selectedTargetIds.add(targetId);
      return;
    }
    this.selectedTargetIds.delete(targetId);
  }

  private renderResultSection(container: HTMLElement): void {
    if (this.results.length === 0) {
      return;
    }

    container.createEl("h3", { text: "Batch Results" });

    const summary = this.lastRunSummary ?? {
      totalCount: this.results.length,
      successCount: this.results.filter((item) => item.status === "success").length,
      failureCount: this.results.filter((item) => item.status === "failure").length,
    };

    container.createEl("p", {
      text: `Completed ${summary.totalCount} targets: ${summary.successCount} succeeded, ${summary.failureCount} failed.`,
    });

    const list = container.createEl("ul");
    for (const result of this.results) {
      const item = list.createEl("li");
      const actionLabel = result.action === "update" ? "update" : "publish";
      if (result.status === "success") {
        const remoteDetail = result.remoteUrl ? ` (${result.remoteUrl})` : "";
        item.setText(`${result.targetName}: success (${actionLabel})${remoteDetail}`);
        continue;
      }
      const failure = result.error?.message ?? "Unknown error";
      item.setText(`${result.targetName}: failed (${actionLabel}) - ${failure}`);
    }
  }

  private async handleBatchPublish(): Promise<void> {
    const selectedTargets = this.getSelectedTargets();
    if (selectedTargets.length === 0) {
      new Notice("Select at least one target before running batch publish.", 6000);
      return;
    }

    this.isPublishing = true;
    this.fatalErrorMessage = null;
    this.results = [];
    this.lastRunSummary = null;
    await this.render();

    try {
      const result = await this.workflow.runBatch(this.file, selectedTargets, this.plugin.settings);
      this.plugin.settings = result.settings;
      await this.plugin.saveSettings();

      this.results = result.results;
      this.lastRunSummary = {
        totalCount: result.totalCount,
        successCount: result.successCount,
        failureCount: result.failureCount,
      };

      new Notice(
        `Batch publish finished: ${result.successCount} succeeded, ${result.failureCount} failed.`,
        6000
      );
    } catch (error) {
      this.fatalErrorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`Batch publish failed: ${this.fatalErrorMessage}`, 8000);
    } finally {
      this.isPublishing = false;
      await this.render();
    }
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Batch Publish" });

    if (this.noteSnapshot) {
      const noteInfo = contentEl.createDiv();
      noteInfo.createEl("strong", { text: "Note: " });
      noteInfo.createSpan({ text: this.noteSnapshot.basename });
      noteInfo.createEl("br");
      noteInfo.createEl("strong", { text: "Path: " });
      noteInfo.createSpan({ text: this.noteSnapshot.path });
    }

    if (this.enabledSummaries.length === 0) {
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

    const targetSection = contentEl.createDiv();
    targetSection.createEl("h3", { text: "Targets" });

    for (const summary of this.enabledSummaries) {
      const row = targetSection.createEl("label");
      row.style.display = "block";
      row.style.margin = "6px 0";

      const input = row.createEl("input", { type: "checkbox" });
      input.checked = this.selectedTargetIds.has(summary.targetId);
      input.disabled = this.isPublishing;
      input.addEventListener("change", () => {
        this.toggleTargetSelection(summary.targetId, input.checked);
        void this.render();
      });

      const actionLabel = summary.action === "update" ? "Update existing post" : "Publish new post";
      row.appendText(` ${summary.name} (${summary.provider}) - ${actionLabel}`);
    }

    const selectionSummary = summarizeBatchSelection(
      this.enabledSummaries.map((item) => ({
        targetId: item.targetId,
        action: item.action,
        enabled: item.enabled,
      })),
      Array.from(this.selectedTargetIds)
    );

    contentEl.createEl("p", {
      text: `Selected ${selectionSummary.selectedCount} targets (${selectionSummary.publishCount} publish, ${selectionSummary.updateCount} update).`,
    });

    if (this.isPublishing) {
      contentEl.createEl("p", {
        text: "Batch publish is running sequentially. Please wait...",
      });
    }

    if (this.fatalErrorMessage) {
      contentEl.createEl("p", {
        cls: "mod-warning",
        text: `Batch failed before completion: ${this.fatalErrorMessage}`,
      });
    }

    this.renderResultSection(contentEl);

    const actions = contentEl.createDiv({ cls: "ultimate-publisher-setting-actions" });

    const runButton = actions.createEl("button", { text: "Run Batch Publish" });
    runButton.toggleClass("mod-cta", true);
    runButton.disabled = this.isPublishing || this.selectedTargetIds.size === 0;
    runButton.addEventListener("click", () => {
      void this.handleBatchPublish();
    });

    const settingsButton = actions.createEl("button", { text: "Open Publish Settings" });
    settingsButton.disabled = this.isPublishing;
    settingsButton.addEventListener("click", () => {
      this.openPublishSettings();
    });
  }
}
