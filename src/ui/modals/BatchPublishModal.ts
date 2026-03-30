import { Modal, Notice, TFile } from "obsidian";
import {
  buildBatchPublishWizardState,
  updateBatchCommonDraft,
  updateBatchTargetDraft,
} from "../../core/batchPublish/state";
import { BatchPublishStep, BatchPublishWizardState } from "../../core/batchPublish/types";
import { extractPublishableNote, PublishableNote } from "../../core/note";
import { ensureRemoteOptionsLoaded } from "../../core/normalPublish/remoteOptions";
import { NormalPublishSessionState, ProviderPublishDraft } from "../../core/normalPublish/types";
import { BatchPublishTargetResult, PublishWorkflow } from "../../core/publishWorkflow";
import { createI18nFromObsidianLanguage } from "../../i18n";
import UltimatePublisherPlugin from "../../plugin";
import { ProviderRegistry } from "../../providers/registry";
import { PublishTargetConfig } from "../../types";
import { renderStringListInput, renderTextArea, renderTextInput } from "../normalPublish/formControls";
import { renderTargetForm } from "../normalPublish/renderTargetForm";

interface AppSettingsController {
  open(): void;
  openTabById(id: string): void;
}

interface AppWithSettings {
  setting?: AppSettingsController;
}

type NoteLoader = (app: typeof Modal.prototype.app, file: TFile) => Promise<PublishableNote>;

interface BatchRunSummary {
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export class BatchPublishModal extends Modal {
  private wizardState: BatchPublishWizardState | null = null;
  private note: PublishableNote | null = null;
  private isInitializing = false;
  private isModalVisible = false;
  private isPublishing = false;
  private fatalErrorMessage: string | null = null;
  private results: BatchPublishTargetResult[] = [];
  private lastRunSummary: BatchRunSummary | null = null;

  constructor(
    private readonly plugin: UltimatePublisherPlugin,
    private readonly file: TFile,
    private readonly workflow: PublishWorkflow,
    private readonly providerRegistry: ProviderRegistry = new ProviderRegistry(plugin.app),
    private readonly noteLoader: NoteLoader = extractPublishableNote
  ) {
    super(plugin.app);
  }

  async onOpen(): Promise<void> {
    this.isModalVisible = true;
    this.isInitializing = true;
    this.fatalErrorMessage = null;
    await this.render();

    try {
      this.note = await this.noteLoader(this.app, this.file);
      this.wizardState = buildBatchPublishWizardState(this.note, this.plugin.settings.targets);
    } catch (error) {
      this.fatalErrorMessage = error instanceof Error ? error.message : String(error);
      this.note = null;
      this.wizardState = null;
    } finally {
      this.isInitializing = false;
    }

    await this.render();
  }

  onClose(): void {
    this.isModalVisible = false;
    this.contentEl.empty();
  }

  private openPublishSettings(): void {
    const appWithSettings = this.app as typeof this.app & AppWithSettings;
    appWithSettings.setting?.open();
    appWithSettings.setting?.openTabById(this.plugin.manifest.id);
  }

  private getEnabledTargets(): PublishTargetConfig[] {
    return this.plugin.settings.targets.filter((target) => target.enabled);
  }

  private getTargetById(targetId: string): PublishTargetConfig | undefined {
    return this.plugin.settings.targets.find((target) => target.id === targetId);
  }

  private getSelectedTargets(): PublishTargetConfig[] {
    if (!this.wizardState) {
      return [];
    }

    return this.getEnabledTargets().filter((target) => this.wizardState?.selectedTargetIds.has(target.id));
  }

  private toggleTargetSelection(targetId: string, checked: boolean): void {
    if (!this.wizardState) {
      return;
    }

    const selectedTargetIds = new Set(this.wizardState.selectedTargetIds);
    if (checked) {
      selectedTargetIds.add(targetId);
    } else {
      selectedTargetIds.delete(targetId);
    }

    this.wizardState = {
      ...this.wizardState,
      selectedTargetIds,
    };
  }

  private updateCommonField(field: "title" | "tags" | "excerpt", value: string | string[]): void {
    if (!this.wizardState) {
      return;
    }

    this.wizardState = updateBatchCommonDraft(this.wizardState, field, value as never);
  }

  private updateTargetField(targetId: string, update: (draft: ProviderPublishDraft) => ProviderPublishDraft): void {
    if (!this.wizardState) {
      return;
    }

    this.wizardState = updateBatchTargetDraft(this.wizardState, targetId, update);
  }

  private async ensureRemoteOptionsLoadedForTarget(target: PublishTargetConfig): Promise<void> {
    if (!this.wizardState) {
      return;
    }

    const current = this.wizardState.remoteOptions[target.id];
    if (!current || current.status === "loaded" || current.status === "error" || current.status === "loading") {
      return;
    }

    this.wizardState = {
      ...this.wizardState,
      remoteOptions: {
        ...this.wizardState.remoteOptions,
        [target.id]: {
          ...current,
          status: "loading",
          errorMessage: undefined,
        },
      },
    };
    await this.render();

    const sessionState: NormalPublishSessionState = {
      selectedTargetId: target.id,
      commonDraft: {
        title: this.wizardState.commonDraft.title,
      },
      targetDrafts: this.wizardState.targetDrafts,
      remoteOptions: this.wizardState.remoteOptions,
      lastErrorByTargetId: {},
    };
    const nextState = await ensureRemoteOptionsLoaded(sessionState, target, this.providerRegistry);

    if (!this.wizardState) {
      return;
    }

    this.wizardState = {
      ...this.wizardState,
      remoteOptions: {
        ...this.wizardState.remoteOptions,
        [target.id]: nextState.remoteOptions[target.id],
      },
    };
  }

  private async goToStep(step: BatchPublishStep): Promise<void> {
    if (!this.wizardState) {
      return;
    }

    if (step === 2 && this.wizardState.selectedTargetIds.size === 0) {
      await this.render();
      return;
    }

    this.wizardState = {
      ...this.wizardState,
      step,
    };
    await this.render();

    if (step !== 2) {
      return;
    }

    for (const target of this.getSelectedTargets()) {
      await this.ensureRemoteOptionsLoadedForTarget(target);
    }

    await this.render();
  }

  private renderStepIndicator(container: HTMLElement): void {
    if (!this.wizardState) {
      return;
    }

    const i18n = createI18nFromObsidianLanguage();
    const progressLabel = i18n.locale === "zh-CN" ? `步骤 ${this.wizardState.step}/3` : `Step ${this.wizardState.step}/3`;
    container.createEl("h2", {
      text: `${i18n.t("publish.batch.title")} - ${progressLabel}`,
    });

    if (this.note) {
      const noteRow = container.createDiv();
      noteRow.createEl("strong", { text: `${i18n.t("publish.shared.note")}: ` });
      noteRow.createSpan({ text: this.file.basename });
    }
  }

  private renderStep1(container: HTMLElement): void {
    if (!this.wizardState) {
      return;
    }

    const i18n = createI18nFromObsidianLanguage();
    const enabledTargets = this.getEnabledTargets();

    container.createEl("h3", { text: i18n.t("publish.batch.wizard.step1.title") });
    container.createEl("p", {
      text: i18n.t("publish.batch.wizard.step1.selectTargets"),
    });

    if (enabledTargets.length === 0) {
      container.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: i18n.t("publish.shared.empty.noEnabledTargets"),
      });
      const settingsButton = container.createEl("button", { text: i18n.t("publish.shared.action.openSettings") });
      settingsButton.addEventListener("click", () => {
        this.openPublishSettings();
      });
      return;
    }

    const targetList = container.createDiv();
    for (const target of enabledTargets) {
      const row = targetList.createEl("label");
      row.style.display = "block";
      row.style.margin = "6px 0";

      const input = row.createEl("input", { type: "checkbox" });
      input.name = `batch-publish-target-${target.id}`;
      input.checked = this.wizardState.selectedTargetIds.has(target.id);
      input.disabled = this.isPublishing;
      input.addEventListener("change", () => {
        this.toggleTargetSelection(target.id, input.checked);
        void this.render();
      });

      row.appendText(` ${target.name}`);
    }

    container.createEl("p", {
      text: i18n.t("publish.batch.wizard.step1.selectedCount", {
        selectedCount: this.wizardState.selectedTargetIds.size,
      }),
    });

    const actions = container.createDiv({ cls: "ultimate-publisher-setting-actions" });
    const nextButton = actions.createEl("button", {
      text: i18n.t("publish.batch.wizard.step1.action.next"),
    });
    nextButton.toggleClass("mod-cta", true);
    nextButton.disabled = this.isPublishing || this.wizardState.selectedTargetIds.size === 0;
    nextButton.addEventListener("click", () => {
      void this.goToStep(2);
    });

    const settingsButton = actions.createEl("button", { text: i18n.t("publish.shared.action.openSettings") });
    settingsButton.disabled = this.isPublishing;
    settingsButton.addEventListener("click", () => {
      this.openPublishSettings();
    });
  }

  private renderStep2(container: HTMLElement): void {
    if (!this.wizardState) {
      return;
    }

    const i18n = createI18nFromObsidianLanguage();
    const selectedTargets = this.getSelectedTargets();

    container.createEl("h3", { text: i18n.t("publish.batch.wizard.step2.title") });

    const commonSection = container.createDiv();
    commonSection.createEl("h4", { text: i18n.t("publish.batch.wizard.step2.commonFields") });

    renderTextInput(commonSection, {
      label: i18n.t("publish.normal.field.title"),
      name: "batch-publish-common-title",
      value: this.wizardState.commonDraft.title,
      onInput: (value) => {
        this.updateCommonField("title", value);
      },
    });
    renderStringListInput(commonSection, {
      label: i18n.t("publish.normal.field.tags"),
      name: "batch-publish-common-tags",
      value: this.wizardState.commonDraft.tags,
      onInput: (value) => {
        this.updateCommonField("tags", value);
      },
    });
    renderTextArea(commonSection, {
      label: i18n.t("publish.normal.field.excerpt"),
      name: "batch-publish-common-excerpt",
      value: this.wizardState.commonDraft.excerpt,
      onInput: (value) => {
        this.updateCommonField("excerpt", value);
      },
    });

    const targetSection = container.createDiv();
    targetSection.createEl("h4", { text: i18n.t("publish.batch.wizard.step2.targetFields") });

    for (const target of selectedTargets) {
      const card = targetSection.createDiv();
      card.createEl("h5", { text: target.name });

      renderTargetForm({
        container: card,
        draft: this.wizardState.targetDrafts[target.id],
        remoteOptions: this.wizardState.remoteOptions[target.id],
        i18n,
        hiddenFields: target.provider === "wordpress" || target.provider === "csdn" ? ["excerpt", "tags"] : undefined,
        fieldNamePrefix: `batch-${target.id}`,
        onChange: (update) => {
          this.updateTargetField(target.id, update);
        },
      });
    }

    const actions = container.createDiv({ cls: "ultimate-publisher-setting-actions" });

    const prevButton = actions.createEl("button", {
      text: i18n.t("publish.batch.wizard.step2.action.prev"),
    });
    prevButton.disabled = this.isPublishing;
    prevButton.addEventListener("click", () => {
      void this.goToStep(1);
    });

    const publishButton = actions.createEl("button", {
      text: i18n.t("publish.batch.wizard.step2.action.publish"),
    });
    publishButton.toggleClass("mod-cta", true);
    publishButton.disabled = this.isPublishing || selectedTargets.length === 0;
    publishButton.addEventListener("click", () => {
      void this.handleBatchPublish();
    });
  }

  private async handleBatchPublish(): Promise<void> {
    const i18n = createI18nFromObsidianLanguage();
    const selectedTargets = this.getSelectedTargets();
    if (selectedTargets.length === 0) {
      new Notice(i18n.t("notice.batch.selectOne"), 6000);
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
        i18n.t("notice.batch.finished", {
          successCount: this.lastRunSummary.successCount,
          failureCount: this.lastRunSummary.failureCount,
        }),
        6000
      );
    } catch (error) {
      this.fatalErrorMessage = error instanceof Error ? error.message : String(error);
      new Notice(i18n.t("notice.batch.failed", { error: this.fatalErrorMessage }), 8000);
    } finally {
      this.isPublishing = false;
      await this.render();
    }
  }

  private async render(): Promise<void> {
    if (!this.isModalVisible) {
      return;
    }

    const { contentEl } = this;
    contentEl.empty();
    const i18n = createI18nFromObsidianLanguage();

    this.renderStepIndicator(contentEl);

    if (this.isInitializing) {
      contentEl.createEl("p", {
        text: i18n.t("publish.normal.loading"),
      });
      return;
    }

    if (this.fatalErrorMessage) {
      contentEl.createEl("p", {
        cls: "mod-warning",
        text: this.fatalErrorMessage,
      });
    }

    if (!this.wizardState) {
      return;
    }

    if (this.wizardState.step === 1) {
      this.renderStep1(contentEl);
      return;
    }

    this.renderStep2(contentEl);
  }
}
