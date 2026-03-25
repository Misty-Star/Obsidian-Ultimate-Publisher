import { Modal, Notice, TFile } from "obsidian";
import { PublishWorkflow } from "../../core/publishWorkflow";
import { createI18nFromObsidianLanguage } from "../../i18n";
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
    const i18n = createI18nFromObsidianLanguage();
    this.isPublishing = true;
    this.errorMessage = null;
    await this.render();

    try {
      const result = await this.workflow.runSingle(this.file, target, this.plugin.settings);
      this.plugin.settings = result.settings;
      await this.plugin.saveSettings();
      new Notice(
        i18n.t("notice.publish.succeeded", {
          target: target.name,
          action: i18n.t(`publish.shared.summary.action.${result.action}`),
        })
      );
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(i18n.t("notice.publish.failed", { error: this.errorMessage }), 8000);
    } finally {
      this.isPublishing = false;
      await this.render();
    }
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const i18n = createI18nFromObsidianLanguage();

    contentEl.createEl("h2", { text: i18n.t("publish.normal.title") });

    const noteInfo = contentEl.createDiv();
    this.createInfoRow(noteInfo, i18n.t("publish.shared.note"), this.file.basename);
    this.createInfoRow(noteInfo, i18n.t("publish.shared.path"), this.file.path);

    const summaries = deriveNoteTargetSummaries(this.plugin.settings, this.file.path);
    this.selectedTargetId ??= summaries.find((item) => item.enabled)?.targetId ?? null;

    const enabledSummaries = summaries.filter((item) => item.enabled);
    if (enabledSummaries.length === 0) {
      contentEl.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: i18n.t("publish.shared.empty.noEnabledTargets"),
      });

      const settingsButton = contentEl.createEl("button", { text: i18n.t("publish.shared.action.openSettings") });
      settingsButton.addEventListener("click", () => {
        this.openPublishSettings();
      });
      return;
    }

    if (!this.selectedTargetId || !summaries.some((item) => item.targetId === this.selectedTargetId && item.enabled)) {
      this.selectedTargetId = enabledSummaries[0].targetId;
    }

    const targetList = contentEl.createDiv();
    targetList.createEl("h3", { text: i18n.t("publish.shared.target") });

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
      const actionLabel =
        summary.action === "update"
          ? i18n.t("publish.shared.summary.updateExistingPost")
          : i18n.t("publish.shared.summary.publishNewPost");
      row.createEl("small", {
        text: ` - ${actionLabel}${summary.enabled ? "" : i18n.t("publish.shared.summary.disabledSuffix")}`,
      });
    }

    const selectedSummary = summaries.find((item) => item.targetId === this.selectedTargetId) ?? null;
    const selectedAction = selectedSummary?.action ?? "publish";
    contentEl.createEl("p", {
      text: i18n.t("publish.normal.summary.selectedAction", {
        action: i18n.t(`publish.shared.summary.action.${selectedAction}`),
      }),
    });

    if (this.errorMessage) {
      contentEl.createEl("p", {
        cls: "mod-warning",
        text: i18n.t("publish.shared.error.last", { error: this.errorMessage }),
      });
    }

    const actions = contentEl.createDiv({ cls: "ultimate-publisher-setting-actions" });

    const publishButton = actions.createEl("button", {
      text: i18n.t(`publish.shared.summary.action.${selectedAction}`),
    });
    publishButton.toggleClass("mod-cta", true);
    publishButton.disabled = this.isPublishing || !this.selectedTargetId;
    publishButton.addEventListener("click", () => {
      if (!this.selectedTargetId) {
        return;
      }
      const target = this.getTargetById(this.selectedTargetId);
      if (!target || !target.enabled) {
        this.errorMessage = i18n.t("publish.shared.error.targetUnavailable");
        new Notice(this.errorMessage, 6000);
        void this.render();
        return;
      }
      void this.handlePublish(target);
    });

    const settingsButton = actions.createEl("button", { text: i18n.t("publish.shared.action.openSettings") });
    settingsButton.disabled = this.isPublishing;
    settingsButton.addEventListener("click", () => {
      this.openPublishSettings();
    });
  }
}
