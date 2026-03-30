import { Modal, Notice, TFile } from "obsidian";
import {
  buildBatchPublishExecutionContext,
  buildBatchPublishWizardState,
  updateBatchCommonDraft,
  updateBatchTargetDraft,
} from "../../core/batchPublish/state";
import {
  BatchPublishExecutionRow,
  BatchPublishStep,
  BatchPublishWizardState,
} from "../../core/batchPublish/types";
import { validateTargetDraft } from "../../core/normalPublish/validation";
import { extractPublishableNote, PublishableNote } from "../../core/note";
import { ensureRemoteOptionsLoaded } from "../../core/normalPublish/remoteOptions";
import { NormalPublishSessionState, ProviderPublishDraft } from "../../core/normalPublish/types";
import {
  BatchPublishProgressEvent,
  BatchPublishRunOptions,
  BatchPublishTargetResult,
  PublishWorkflow,
} from "../../core/publishWorkflow";
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

const BATCH_PUBLISH_MODAL_FRAME_CLASS = "ultimate-publisher-batch-modal-frame";
const BATCH_PUBLISH_MODAL_CONTAINER_CLASS = "ultimate-publisher-batch-modal-container";

interface BatchRunSummary {
  totalCount: number;
  successCount: number;
  failureCount: number;
}

const VALIDATION_MESSAGE_KEY_BY_TEXT: Record<string, string> = {
  "Zhihu publish requires a columnId.": "publish.batch.validation.zhihu.columnIdRequired",
  "Juejin publish requires a categoryId.": "publish.batch.validation.juejin.categoryIdRequired",
  "Juejin publish requires at least one tagId.": "publish.batch.validation.juejin.tagIdsRequired",
};

export class BatchPublishModal extends Modal {
  private wizardState: BatchPublishWizardState | null = null;
  private note: PublishableNote | null = null;
  private isInitializing = false;
  private isModalVisible = false;
  private isPublishing = false;
  private fatalErrorMessage: string | null = null;

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
    this.containerEl.addClass(BATCH_PUBLISH_MODAL_CONTAINER_CLASS);
    this.modalEl.addClass(BATCH_PUBLISH_MODAL_FRAME_CLASS);
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
    this.containerEl.removeClass(BATCH_PUBLISH_MODAL_CONTAINER_CLASS);
    this.modalEl.removeClass(BATCH_PUBLISH_MODAL_FRAME_CLASS);
    this.contentEl.removeClass("ultimate-publisher-batch-modal");
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

    const next = updateBatchTargetDraft(this.wizardState, targetId, update);
    this.wizardState = {
      ...next,
      validationErrors: {
        ...next.validationErrors,
        [targetId]: null,
      },
    };
  }

  private getLocalizedValidationError(message: string): string {
    const i18n = createI18nFromObsidianLanguage();
    const key = VALIDATION_MESSAGE_KEY_BY_TEXT[message];
    return key ? i18n.t(key) : message;
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
    const indicator = container.createDiv({ cls: "ultimate-publisher-batch-step-indicator" });
    const header = indicator.createDiv();
    header.createEl("h2", {
      text: `${i18n.t("publish.batch.title")} - ${progressLabel}`,
    });

    if (this.note) {
      const noteRow = header.createDiv();
      noteRow.createEl("strong", { text: `${i18n.t("publish.shared.note")}: ` });
      noteRow.createSpan({ text: this.file.basename });
    }

    const steps = [
      i18n.t("publish.batch.wizard.step1.title"),
      i18n.t("publish.batch.wizard.step2.title"),
      i18n.t("publish.batch.wizard.step3.title"),
    ];
    const stepList = indicator.createDiv();
    for (const [index, label] of steps.entries()) {
      const item = stepList.createDiv();
      const dot = item.createSpan({ cls: "ultimate-publisher-batch-step-dot" });
      dot.toggleClass("is-active", this.wizardState.step === index + 1);
      item.createSpan({ text: label });
    }
  }

  private renderStep1(container: HTMLElement): void {
    if (!this.wizardState) {
      return;
    }

    const i18n = createI18nFromObsidianLanguage();
    const enabledTargets = this.getEnabledTargets();

    const panel = container.createDiv({ cls: "ultimate-publisher-batch-panel" });
    panel.createEl("h3", { text: i18n.t("publish.batch.wizard.step1.title") });
    panel.createEl("p", {
      text: i18n.t("publish.batch.wizard.step1.selectTargets"),
    });

    if (enabledTargets.length === 0) {
      panel.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: i18n.t("publish.shared.empty.noEnabledTargets"),
      });
      const settingsButton = panel.createEl("button", { text: i18n.t("publish.shared.action.openSettings") });
      settingsButton.addEventListener("click", () => {
        this.openPublishSettings();
      });
      return;
    }

    const targetList = panel.createDiv();
    for (const target of enabledTargets) {
      const row = targetList.createEl("label", { cls: "ultimate-publisher-batch-target-card" });

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

    panel.createEl("p", {
      text: i18n.t("publish.batch.wizard.step1.selectedCount", {
        selectedCount: this.wizardState.selectedTargetIds.size,
      }),
    });

    const actions = panel.createDiv({ cls: "ultimate-publisher-setting-actions" });
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

    const panel = container.createDiv({ cls: "ultimate-publisher-batch-panel" });
    panel.createEl("h3", { text: i18n.t("publish.batch.wizard.step2.title") });

    const commonSection = panel.createDiv();
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

    const targetSection = panel.createDiv();
    targetSection.createEl("h4", { text: i18n.t("publish.batch.wizard.step2.targetFields") });

    for (const target of selectedTargets) {
      const card = targetSection.createDiv({ cls: "ultimate-publisher-batch-target-card" });
      card.createEl("h5", { text: target.name });
      const validationError = this.wizardState.validationErrors[target.id];
      if (validationError) {
        card.createEl("p", {
          cls: "mod-warning",
          text: this.getLocalizedValidationError(validationError),
        });
      }

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

    const actions = panel.createDiv({ cls: "ultimate-publisher-setting-actions" });

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
      void this.startBatchPublish();
    });
  }

  private renderStep3(container: HTMLElement): void {
    if (!this.wizardState) {
      return;
    }

    const i18n = createI18nFromObsidianLanguage();
    const { executionState } = this.wizardState;
    const summary = this.getExecutionSummary();
    const completedCount = executionState.results.filter(
      (row) => row.status === "success" || row.status === "failure"
    ).length;
    const progressPercent = summary.totalCount === 0 ? 0 : Math.round((completedCount / summary.totalCount) * 100);

    const panel = container.createDiv({ cls: "ultimate-publisher-batch-panel" });
    panel.createEl("h3", { text: i18n.t("publish.batch.wizard.step3.title") });
    panel.createEl("p", {
      text:
        executionState.status === "completed"
          ? i18n.t("publish.batch.wizard.step3.completed")
          : i18n.t("publish.batch.wizard.step3.publishing"),
    });

    const progressBar = panel.createDiv({ cls: "ultimate-publisher-batch-progress-bar" });
    const progressFill = progressBar.createDiv({ cls: "ultimate-publisher-batch-progress-bar-fill" });
    progressFill.style.width = `${progressPercent}%`;

    if (executionState.status === "completed") {
      panel.createEl("p", {
        text: i18n.t("publish.batch.wizard.step3.summary", {
          successCount: summary.successCount,
          failureCount: summary.failureCount,
        }),
      });
    }

    const resultList = panel.createDiv();
    for (const row of executionState.results) {
      const resultItem = resultList.createDiv({ cls: "ultimate-publisher-batch-result-item" });
      resultItem.createEl("strong", { text: row.targetName });
      resultItem.createEl("p", {
        text: `${i18n.t(`publish.shared.summary.action.${row.action}`)} · ${i18n.t(
          `publish.batch.wizard.status.${this.toStatusMessageKey(row.status)}`
        )}`,
      });

      if (typeof row.durationMs === "number") {
        resultItem.createEl("p", { text: `${row.durationMs} ms` });
      }

      if (row.remoteUrl) {
        resultItem.createEl("p", { text: row.remoteUrl });
      }

      if (row.errorMessage) {
        resultItem.createEl("p", {
          cls: "mod-warning",
          text: row.errorMessage,
        });
      }
    }

    const actions = panel.createDiv({ cls: "ultimate-publisher-setting-actions" });
    if (executionState.status === "running") {
      const backgroundButton = actions.createEl("button", {
        text: i18n.t("publish.batch.wizard.step3.action.background"),
      });
      backgroundButton.addEventListener("click", () => {
        this.markBackgroundRun();
      });
    }

    const closeButton = actions.createEl("button", {
      text: i18n.t("publish.batch.wizard.step3.action.close"),
    });
    closeButton.disabled = executionState.status === "running";
    closeButton.addEventListener("click", () => {
      this.close();
    });
  }

  private buildExecutionRows(targets: PublishTargetConfig[]): BatchPublishExecutionRow[] {
    return targets.map((target) => ({
      targetId: target.id,
      targetName: target.name,
      action: "publish",
      status: "waiting",
    }));
  }

  private getExecutionSummary(): BatchRunSummary {
    const rows = this.wizardState?.executionState.results ?? [];
    const successCount = rows.filter((row) => row.status === "success").length;
    const failureCount = rows.filter((row) => row.status === "failure").length;

    return {
      totalCount: rows.length,
      successCount,
      failureCount,
    };
  }

  private toStatusMessageKey(status: BatchPublishExecutionRow["status"]): "waiting" | "publishing" | "success" | "failed" {
    switch (status) {
      case "running":
        return "publishing";
      case "failure":
        return "failed";
      default:
        return status;
    }
  }

  private buildBatchRunOptions(selectedTargets: PublishTargetConfig[]): BatchPublishRunOptions {
    const contextByTargetId = Object.fromEntries(
      selectedTargets.map((target) => [target.id, buildBatchPublishExecutionContext(this.wizardState!, target.id)])
    );

    return {
      contextByTargetId,
      onProgress: async (event) => {
        this.updateExecutionRow(event);
        this.requestRender();
      },
    };
  }

  private updateExecutionResults(results: BatchPublishTargetResult[]): void {
    if (!this.wizardState) {
      return;
    }

    const resultMap = new Map(results.map((result) => [result.targetId, result]));
    this.wizardState = {
      ...this.wizardState,
      executionState: {
        ...this.wizardState.executionState,
        currentIndex: results.length,
        results: this.wizardState.executionState.results.map((row) => {
          const result = resultMap.get(row.targetId);
          if (!result) {
            return row;
          }

          return {
            ...row,
            action: result.action,
            status: result.status,
            durationMs: result.durationMs,
            remoteUrl: result.remoteUrl,
            errorMessage: result.error?.message,
          };
        }),
      },
    };
  }

  private updateExecutionRow(event: BatchPublishProgressEvent): void {
    if (!this.wizardState) {
      return;
    }

    const nextStatus =
      event.status === "running"
        ? "running"
        : event.status === "success"
          ? "success"
          : "failure";

    this.wizardState = {
      ...this.wizardState,
      executionState: {
        ...this.wizardState.executionState,
        currentIndex: event.currentIndex,
        results: this.wizardState.executionState.results.map((row) => {
          if (row.targetId !== event.targetId) {
            return row;
          }

          return {
            ...row,
            targetName: event.targetName,
            action: event.action,
            status: nextStatus,
            durationMs: event.durationMs ?? row.durationMs,
            remoteUrl: event.remoteUrl ?? row.remoteUrl,
            errorMessage: event.error?.message,
          };
        }),
      },
    };
  }

  private markBackgroundRun(): void {
    if (!this.wizardState) {
      return;
    }

    this.wizardState = {
      ...this.wizardState,
      executionState: {
        ...this.wizardState.executionState,
        runningInBackground: true,
      },
    };
    this.close();
  }

  private requestRender(): void {
    if (this.isModalVisible) {
      void this.render();
    }
  }

  private async startBatchPublish(): Promise<void> {
    const i18n = createI18nFromObsidianLanguage();
    if (!this.wizardState) {
      return;
    }

    const selectedTargets = this.getSelectedTargets();
    if (selectedTargets.length === 0) {
      new Notice(i18n.t("notice.batch.selectOne"), 6000);
      return;
    }

    const validationErrors = selectedTargets.reduce<Record<string, string | null>>((acc, target) => {
      acc[target.id] = validateTargetDraft(this.wizardState!.targetDrafts[target.id]);
      return acc;
    }, {});
    const hasValidationError = Object.values(validationErrors).some((value) => value !== null);

    this.wizardState = {
      ...this.wizardState,
      step: hasValidationError ? 2 : 3,
      validationErrors: {
        ...this.wizardState.validationErrors,
        ...validationErrors,
      },
      executionState: hasValidationError
        ? this.wizardState.executionState
        : {
            status: "running",
            currentIndex: 0,
            runningInBackground: false,
            results: this.buildExecutionRows(selectedTargets),
          },
    };
    this.requestRender();

    if (hasValidationError) {
      new Notice(i18n.t("notice.batch.invalidDraft"), 8000);
      return;
    }

    this.isPublishing = true;
    this.fatalErrorMessage = null;
    this.requestRender();

    try {
      const result = await this.workflow.runBatch(
        this.file,
        selectedTargets,
        this.plugin.settings,
        this.buildBatchRunOptions(selectedTargets)
      );
      this.plugin.settings = result.settings;
      await this.plugin.saveSettings();
      this.updateExecutionResults(result.results);

      if (this.wizardState) {
        this.wizardState = {
          ...this.wizardState,
          step: 3,
          executionState: {
            ...this.wizardState.executionState,
            status: "completed",
            currentIndex: result.totalCount,
          },
        };
      }

      new Notice(
        i18n.t("notice.batch.finished", {
          successCount: result.successCount,
          failureCount: result.failureCount,
        }),
        6000
      );
    } catch (error) {
      this.fatalErrorMessage = error instanceof Error ? error.message : String(error);
      if (this.wizardState) {
        this.wizardState = {
          ...this.wizardState,
          step: 3,
          executionState: {
            ...this.wizardState.executionState,
            status: "completed",
          },
        };
      }
      new Notice(i18n.t("notice.batch.failed", { error: this.fatalErrorMessage }), 8000);
    } finally {
      this.isPublishing = false;
      this.requestRender();
    }
  }

  private async render(): Promise<void> {
    if (!this.isModalVisible) {
      return;
    }

    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ultimate-publisher-batch-modal");
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

    if (this.wizardState.step === 2) {
      this.renderStep2(contentEl);
      return;
    }

    this.renderStep3(contentEl);
  }
}
