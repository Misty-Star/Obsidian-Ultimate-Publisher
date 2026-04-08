import { Modal, Notice, TFile } from "obsidian";
import { LlmService } from "../../core/llm/service";
import { buildNormalPublishAiTaskInput, getSupportedAiFields, NormalPublishAiField } from "../../core/normalPublish/ai";
import { buildNormalPublishSessionState } from "../../core/normalPublish/drafts";
import { ensureRemoteOptionsLoaded } from "../../core/normalPublish/remoteOptions";
import { NormalPublishExecutionContext, NormalPublishSessionState, ProviderPublishDraft } from "../../core/normalPublish/types";
import { validateTargetDraft } from "../../core/normalPublish/validation";
import { extractPublishableNote, PublishableNote } from "../../core/note";
import { PublishWorkflow } from "../../core/publishWorkflow";
import { ProviderRegistry } from "../../providers/registry";
import { createI18nFromObsidianLanguage } from "../../i18n";
import UltimatePublisherPlugin from "../../plugin";
import { DEFAULT_LLM_SETTINGS } from "../../settings";
import { PublishTargetConfig } from "../../types";
import { deriveNoteTargetSummaries, NoteTargetSummary } from "../publishSummary";
import { renderTargetForm } from "../normalPublish/renderTargetForm";
import { renderHelperText, renderTextInput } from "../normalPublish/formControls";

interface AppSettingsController {
  open(): void;
  openTabById(id: string): void;
}

interface AppWithSettings {
  setting?: AppSettingsController;
}

type NoteLoader = (app: typeof Modal.prototype.app, file: TFile) => Promise<PublishableNote>;

interface NormalPublishAiFieldState {
  status: "idle" | "loading" | "error";
  errorMessage?: string;
}

const NORMAL_PUBLISH_MODAL_FRAME_CLASS = "ultimate-publisher-normal-modal-frame";
const NORMAL_PUBLISH_MODAL_CONTAINER_CLASS = "ultimate-publisher-normal-modal-container";

export class NormalPublishModal extends Modal {
  private selectedTargetId: string | null = null;
  private isPublishing = false;
  private isInitializing = false;
  private errorMessage: string | null = null;
  private sessionState: NormalPublishSessionState | null = null;
  private note: PublishableNote | null = null;
  private aiFieldState: Record<string, NormalPublishAiFieldState> = {};

  constructor(
    private readonly plugin: UltimatePublisherPlugin,
    private readonly file: TFile,
    private readonly workflow: PublishWorkflow,
    private readonly providerRegistry: ProviderRegistry = new ProviderRegistry(plugin.app),
    private readonly noteLoader: NoteLoader = extractPublishableNote,
    private readonly llmService: Pick<LlmService, "generate"> = new LlmService()
  ) {
    super(plugin.app);
  }

  async onOpen(): Promise<void> {
    this.containerEl.addClass(NORMAL_PUBLISH_MODAL_CONTAINER_CLASS);
    this.modalEl.addClass(NORMAL_PUBLISH_MODAL_FRAME_CLASS);
    this.isInitializing = true;
    await this.render();
    try {
      this.note = await this.noteLoader(this.app, this.file);
      this.sessionState = buildNormalPublishSessionState(this.note, this.plugin.settings.targets);
      this.selectedTargetId = this.sessionState.selectedTargetId;
      await this.loadRemoteOptionsForSelectedTarget();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      this.isInitializing = false;
    }
    await this.render();
  }

  onClose(): void {
    this.containerEl.removeClass(NORMAL_PUBLISH_MODAL_CONTAINER_CLASS);
    this.modalEl.removeClass(NORMAL_PUBLISH_MODAL_FRAME_CLASS);
    this.contentEl.removeClass("ultimate-publisher-normal-modal");
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
    const row = container.createDiv({ cls: "ultimate-publisher-normal-note-row" });
    row.createSpan({
      cls: "ultimate-publisher-normal-note-label",
      text: label,
    });
    row.createSpan({
      cls: "ultimate-publisher-normal-note-value",
      text: value,
    });
  }

  private getSelectedDraft(): ProviderPublishDraft | null {
    if (!this.sessionState || !this.selectedTargetId) {
      return null;
    }
    return this.sessionState.targetDrafts[this.selectedTargetId] ?? null;
  }

  private getDraftByTargetId(targetId: string): ProviderPublishDraft | null {
    if (!this.sessionState) {
      return null;
    }
    return this.sessionState.targetDrafts[targetId] ?? null;
  }

  private buildAiKey(field: NormalPublishAiField, targetId: string | null = this.selectedTargetId): string {
    if (field === "title") {
      return "common:title";
    }
    return targetId ? `${targetId}:${field}` : `common:${field}`;
  }

  private getAiFieldState(field: NormalPublishAiField, targetId: string | null = this.selectedTargetId): NormalPublishAiFieldState {
    return this.aiFieldState[this.buildAiKey(field, targetId)] ?? { status: "idle" };
  }

  private setAiFieldState(field: NormalPublishAiField, next: NormalPublishAiFieldState, targetId: string | null = this.selectedTargetId): void {
    this.aiFieldState = {
      ...this.aiFieldState,
      [this.buildAiKey(field, targetId)]: next,
    };
  }

  private buildExecutionContext(): NormalPublishExecutionContext | null {
    const draft = this.getSelectedDraft();
    if (!this.sessionState || !draft) {
      return null;
    }
    return {
      common: {
        title: this.sessionState.commonDraft.title,
      },
      provider: draft,
    };
  }

  private syncSelectedTarget(targetId: string | null): void {
    this.selectedTargetId = targetId;
    if (this.sessionState) {
      this.sessionState.selectedTargetId = targetId;
    }
  }

  private updateSelectedDraft(update: (draft: ProviderPublishDraft) => ProviderPublishDraft): void {
    if (!this.sessionState || !this.selectedTargetId) {
      return;
    }
    this.updateTargetDraftById(this.selectedTargetId, update);
  }

  private updateTargetDraftById(
    targetId: string,
    update: (draft: ProviderPublishDraft) => ProviderPublishDraft
  ): void {
    if (!this.sessionState) {
      return;
    }
    const currentDraft = this.sessionState.targetDrafts[targetId];
    if (!currentDraft) {
      return;
    }
    this.sessionState = {
      ...this.sessionState,
      targetDrafts: {
        ...this.sessionState.targetDrafts,
        [targetId]: update(currentDraft),
      },
    };
  }

  private setSelectedTargetError(message: string | null): void {
    if (!this.sessionState || !this.selectedTargetId) {
      this.errorMessage = message;
      return;
    }
    this.sessionState = {
      ...this.sessionState,
      lastErrorByTargetId: {
        ...this.sessionState.lastErrorByTargetId,
        [this.selectedTargetId]: message,
      },
    };
  }

  private getSelectedTargetError(): string | null {
    if (!this.sessionState || !this.selectedTargetId) {
      return this.errorMessage;
    }
    return this.sessionState.lastErrorByTargetId[this.selectedTargetId] ?? null;
  }

  private markRemoteOptionsLoading(targetId: string): void {
    if (!this.sessionState) {
      return;
    }
    const current = this.sessionState.remoteOptions[targetId];
    if (!current || current.status !== "idle") {
      return;
    }
    this.sessionState = {
      ...this.sessionState,
      remoteOptions: {
        ...this.sessionState.remoteOptions,
        [targetId]: {
          ...current,
          status: "loading",
          errorMessage: undefined,
        },
      },
    };
  }

  private async loadRemoteOptionsForSelectedTarget(): Promise<void> {
    if (!this.sessionState || !this.selectedTargetId) {
      return;
    }
    const target = this.getTargetById(this.selectedTargetId);
    if (!target || !target.enabled) {
      return;
    }
    const current = this.sessionState.remoteOptions[target.id];
    if (current?.status === "loaded" || current?.status === "error") {
      return;
    }
    if (current?.status !== "loading") {
      this.markRemoteOptionsLoading(target.id);
    }
    const nextState = await ensureRemoteOptionsLoaded(this.sessionState, target, this.providerRegistry);
    if (!this.sessionState) {
      this.sessionState = nextState;
      return;
    }
    this.sessionState = {
      ...this.sessionState,
      remoteOptions: {
        ...this.sessionState.remoteOptions,
        [target.id]: nextState.remoteOptions[target.id],
      },
    };
  }

  private async handleTargetSelection(targetId: string): Promise<void> {
    this.syncSelectedTarget(targetId);
    if (this.sessionState?.remoteOptions[targetId]?.status === "idle") {
      this.markRemoteOptionsLoading(targetId);
      await this.render();
      await this.loadRemoteOptionsForSelectedTarget();
    }
    await this.render();
  }

  private async handleAiGenerate(field: NormalPublishAiField): Promise<void> {
    const initiatingTargetId = this.selectedTargetId;
    if (!this.note || !this.sessionState || !initiatingTargetId) {
      return;
    }
    const target = this.getTargetById(initiatingTargetId);
    const draft = this.getDraftByTargetId(initiatingTargetId);
    if (!target || !draft) {
      return;
    }

    const llmSettings = this.plugin.settings.llm ?? DEFAULT_LLM_SETTINGS;
    if (!llmSettings.enabled || !llmSettings.apiKey || !llmSettings.model) {
      this.setAiFieldState(field, {
        status: "error",
        errorMessage: createI18nFromObsidianLanguage().t("publish.normal.ai.notConfigured"),
      }, initiatingTargetId);
      void this.render();
      return;
    }

    this.setAiFieldState(field, { status: "loading" }, initiatingTargetId);
    void this.render();

    try {
      const input = buildNormalPublishAiTaskInput({
        field,
        note: this.note,
        target,
        commonTitle: this.sessionState.commonDraft.title,
        draft,
        llmSettings,
      });
      const result = await this.llmService.generate(llmSettings, input);
      const text = result.text.trim();
      if (!text) {
        throw new Error("LLM returned no text.");
      }

      if (field === "title") {
        this.sessionState = {
          ...this.sessionState,
          commonDraft: {
            ...this.sessionState.commonDraft,
            title: text,
          },
        };
      } else if (field === "excerpt") {
        this.updateTargetDraftById(initiatingTargetId, (current) =>
          current.provider === "wordpress" || current.provider === "csdn"
            ? { ...current, excerpt: text }
            : current
        );
      } else if (field === "briefContent") {
        this.updateTargetDraftById(initiatingTargetId, (current) =>
          current.provider === "juejin"
            ? { ...current, briefContent: text }
            : current
        );
      }

      this.setAiFieldState(field, { status: "idle" }, initiatingTargetId);
    } catch (error) {
      this.setAiFieldState(field, {
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      }, initiatingTargetId);
    }

    void this.render();
  }

  private async handlePublish(target: PublishTargetConfig): Promise<void> {
    const i18n = createI18nFromObsidianLanguage();
    const draft = this.getSelectedDraft();
    if (draft) {
      const validationError = validateTargetDraft(draft);
      if (validationError) {
        this.setSelectedTargetError(validationError);
        new Notice(i18n.t("notice.publish.failed", { error: validationError }), 8000);
        await this.render();
        return;
      }
    }
    this.isPublishing = true;
    this.setSelectedTargetError(null);
    await this.render();

    try {
      const result = await this.workflow.runSingle(
        this.file,
        target,
        this.plugin.settings,
        this.buildExecutionContext() ?? undefined
      );
      this.plugin.settings = result.settings;
      await this.plugin.saveSettings();
      const actionLabel =
        result.action === "update"
          ? i18n.t("notice.publish.action.updated")
          : i18n.t("notice.publish.action.published");
      new Notice(
        i18n.t("notice.publish.succeeded", {
          target: target.name,
          action: actionLabel,
        })
      );
      this.setSelectedTargetError(null);
    } catch (error) {
      const pluginWithFailurePersistence = this.plugin as typeof this.plugin & {
        persistPublishFailureState?: (error: unknown) => Promise<boolean>;
      };
      await pluginWithFailurePersistence.persistPublishFailureState?.(error);
      const message = error instanceof Error ? error.message : String(error);
      this.setSelectedTargetError(message);
      new Notice(i18n.t("notice.publish.failed", { error: message }), 8000);
    } finally {
      this.isPublishing = false;
      await this.render();
    }
  }

  private renderHeader(container: HTMLElement, i18n: ReturnType<typeof createI18nFromObsidianLanguage>): void {
    const header = container.createDiv({ cls: "ultimate-publisher-normal-header" });
    header.createEl("h2", { text: i18n.t("publish.normal.title") });
    header.createEl("p", {
      text: i18n.t("publish.normal.subtitle"),
    });
  }

  private renderNoteCard(container: HTMLElement, i18n: ReturnType<typeof createI18nFromObsidianLanguage>): void {
    const noteCard = container.createDiv({ cls: "ultimate-publisher-normal-note-card" });
    noteCard.createEl("h3", {
      text: i18n.t("publish.normal.noteCard.title"),
    });

    const noteInline = noteCard.createDiv({ cls: "ultimate-publisher-normal-note-inline" });
    this.createInfoRow(noteInline, i18n.t("publish.shared.note"), this.file.basename);
  }

  private renderTargetButton(
    container: HTMLElement,
    summary: NoteTargetSummary,
    isSelected: boolean,
    i18n: ReturnType<typeof createI18nFromObsidianLanguage>
  ): void {
    const item = container.createDiv({ cls: "ultimate-publisher-normal-target-item" });
    const button = item.createEl("button", { cls: "ultimate-publisher-normal-target-button" });
    if (isSelected) {
      button.addClass("is-selected");
    }
    button.disabled = this.isPublishing;
    button.addEventListener("click", () => {
      void this.handleTargetSelection(summary.targetId);
    });

    const content = button.createDiv({ cls: "ultimate-publisher-normal-target-button-content" });
    content.createEl("span", {
      cls: "ultimate-publisher-normal-target-name",
      text: summary.name,
    });
    content.createEl("span", {
      cls: "ultimate-publisher-normal-target-action",
      text: i18n.t(`publish.shared.summary.action.${summary.action}`),
    });
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ultimate-publisher-normal-modal");
    const i18n = createI18nFromObsidianLanguage();

    this.renderHeader(contentEl, i18n);
    this.renderNoteCard(contentEl, i18n);

    if (this.isInitializing) {
      const loadingPanel = contentEl.createDiv({ cls: "ultimate-publisher-normal-panel" });
      loadingPanel.createEl("p", {
        text: i18n.t("publish.normal.loading"),
      });
      return;
    }

    const summaries = deriveNoteTargetSummaries(this.plugin.settings, this.file.path);
    const enabledSummaries = summaries.filter((item) => item.enabled);
    if (enabledSummaries.length === 0) {
      const emptyPanel = contentEl.createDiv({ cls: "ultimate-publisher-normal-panel" });
      emptyPanel.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: i18n.t("publish.shared.empty.noEnabledTargets"),
      });

      const settingsButton = emptyPanel.createEl("button", { text: i18n.t("publish.shared.action.openSettings") });
      settingsButton.addEventListener("click", () => {
        this.openPublishSettings();
      });
      return;
    }

    if (!this.selectedTargetId || !summaries.some((item) => item.targetId === this.selectedTargetId && item.enabled)) {
      this.syncSelectedTarget(enabledSummaries[0].targetId);
    }

    const selectedSummary = summaries.find((item) => item.targetId === this.selectedTargetId) ?? null;
    const selectedAction = selectedSummary?.action ?? "publish";
    const selectedTargetError = this.getSelectedTargetError();

    const shell = contentEl.createDiv({ cls: "ultimate-publisher-normal-shell" });
    const sidebar = shell.createDiv({ cls: "ultimate-publisher-normal-sidebar ultimate-publisher-normal-panel" });
    sidebar.createEl("h3", { text: i18n.t("publish.shared.targets") });
    sidebar.createEl("p", {
      cls: "ultimate-publisher-normal-helper",
      text: i18n.t("publish.normal.sidebar.description"),
    });
    const targetList = sidebar.createDiv({ cls: "ultimate-publisher-normal-target-list" });

    for (const summary of enabledSummaries) {
      this.renderTargetButton(targetList, summary, summary.targetId === this.selectedTargetId, i18n);
    }

    const main = shell.createDiv({ cls: "ultimate-publisher-normal-main" });
    const commonPanel = main.createDiv({ cls: "ultimate-publisher-normal-panel" });
    commonPanel.createEl("h3", { text: i18n.t("publish.normal.section.common") });

    if (this.sessionState) {
      const titleAiState = this.getAiFieldState("title", null);
      renderTextInput(commonPanel, {
        label: i18n.t("publish.normal.field.title"),
        name: "normal-publish-title",
        value: this.sessionState.commonDraft.title,
        action: selectedSummary
          ? {
              label: i18n.t("publish.normal.ai.optimizeTitle"),
              busyLabel: i18n.t("publish.normal.ai.generating"),
              busy: titleAiState.status === "loading",
              disabled: this.isPublishing || !this.note || !this.selectedTargetId,
              errorMessage: titleAiState.status === "error" ? titleAiState.errorMessage : undefined,
              onClick: () => {
                void this.handleAiGenerate("title");
              },
            }
          : undefined,
        onInput: (value) => {
          if (!this.sessionState) {
            return;
          }
          this.sessionState = {
            ...this.sessionState,
            commonDraft: {
              ...this.sessionState.commonDraft,
              title: value,
            },
          };
        },
      });
    }

    const detailPanel = main.createDiv({ cls: "ultimate-publisher-normal-panel ultimate-publisher-normal-detail-panel" });
    const detailHeader = detailPanel.createDiv({ cls: "ultimate-publisher-normal-detail-header" });
    const detailCopy = detailHeader.createDiv();
    detailCopy.createEl("h3", { text: i18n.t("publish.normal.section.details") });
    if (selectedSummary) {
      detailCopy.createEl("p", {
        cls: "ultimate-publisher-normal-helper",
        text: i18n.t("publish.normal.section.currentTarget", { target: selectedSummary.name }),
      });
      detailHeader.createEl("span", {
        cls: "ultimate-publisher-normal-target-action",
        text: i18n.t(`publish.shared.summary.action.${selectedSummary.action}`),
      });
    }

    const detailBody = detailPanel.createDiv({ cls: "ultimate-publisher-normal-detail-body" });
    const selectedDraft = this.getSelectedDraft();
    if (selectedDraft && this.sessionState && this.selectedTargetId) {
      const supportedAiFields = new Set(getSupportedAiFields(selectedDraft));
      const excerptAiState = this.getAiFieldState("excerpt", this.selectedTargetId);
      const briefContentAiState = this.getAiFieldState("briefContent", this.selectedTargetId);
      renderTargetForm({
        container: detailBody,
        draft: selectedDraft,
        remoteOptions: this.sessionState.remoteOptions[this.selectedTargetId],
        i18n,
        fieldActions: {
          excerpt: supportedAiFields.has("excerpt")
            ? {
                label: i18n.t("publish.normal.ai.generate"),
                busyLabel: i18n.t("publish.normal.ai.generating"),
                busy: excerptAiState.status === "loading",
                disabled: this.isPublishing || !this.note || !this.selectedTargetId,
                errorMessage: excerptAiState.status === "error" ? excerptAiState.errorMessage : undefined,
                onClick: () => {
                  void this.handleAiGenerate("excerpt");
                },
              }
            : undefined,
          briefContent: supportedAiFields.has("briefContent")
            ? {
                label: i18n.t("publish.normal.ai.generate"),
                busyLabel: i18n.t("publish.normal.ai.generating"),
                busy: briefContentAiState.status === "loading",
                disabled: this.isPublishing || !this.note || !this.selectedTargetId,
                errorMessage: briefContentAiState.status === "error" ? briefContentAiState.errorMessage : undefined,
                onClick: () => {
                  void this.handleAiGenerate("briefContent");
                },
              }
            : undefined,
        },
        onChange: (update) => {
          this.updateSelectedDraft(update);
        },
      });
    }

    const actions = main.createDiv({ cls: "ultimate-publisher-normal-actions ultimate-publisher-normal-panel" });
    actions.createEl("p", {
      cls: "ultimate-publisher-normal-action-summary",
      text: i18n.t("publish.normal.summary.selectedAction", {
        action: i18n.t(`publish.shared.summary.action.${selectedAction}`),
      }),
    });

    if (selectedTargetError) {
      renderHelperText(actions, i18n.t("publish.shared.error.last", { error: selectedTargetError }), "warning");
    }

    const actionRow = actions.createDiv({ cls: "ultimate-publisher-setting-actions" });

    const publishButton = actionRow.createEl("button", {
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
        const message = i18n.t("publish.shared.error.targetUnavailable");
        this.setSelectedTargetError(message);
        new Notice(message, 6000);
        void this.render();
        return;
      }
      void this.handlePublish(target);
    });

    const settingsButton = actionRow.createEl("button", { text: i18n.t("publish.shared.action.openSettings") });
    settingsButton.disabled = this.isPublishing;
    settingsButton.addEventListener("click", () => {
      this.openPublishSettings();
    });
  }
}
