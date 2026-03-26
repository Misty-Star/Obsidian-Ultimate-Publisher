import { Modal, Notice, TFile } from "obsidian";
import { buildNormalPublishSessionState } from "../../core/normalPublish/drafts";
import { ensureRemoteOptionsLoaded } from "../../core/normalPublish/remoteOptions";
import { NormalPublishExecutionContext, NormalPublishSessionState, ProviderPublishDraft } from "../../core/normalPublish/types";
import { validateTargetDraft } from "../../core/normalPublish/validation";
import { extractPublishableNote, PublishableNote } from "../../core/note";
import { PublishWorkflow } from "../../core/publishWorkflow";
import { ProviderRegistry } from "../../providers/registry";
import { createI18nFromObsidianLanguage } from "../../i18n";
import UltimatePublisherPlugin from "../../plugin";
import { PublishTargetConfig } from "../../types";
import { deriveNoteTargetSummaries } from "../publishSummary";
import { renderTargetForm } from "../normalPublish/renderTargetForm";
import { renderTextInput } from "../normalPublish/formControls";

interface AppSettingsController {
  open(): void;
  openTabById(id: string): void;
}

interface AppWithSettings {
  setting?: AppSettingsController;
}

type NoteLoader = (app: typeof Modal.prototype.app, file: TFile) => Promise<PublishableNote>;

export class NormalPublishModal extends Modal {
  private selectedTargetId: string | null = null;
  private isPublishing = false;
  private isInitializing = false;
  private errorMessage: string | null = null;
  private sessionState: NormalPublishSessionState | null = null;
  private note: PublishableNote | null = null;

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

  private getSelectedDraft(): ProviderPublishDraft | null {
    if (!this.sessionState || !this.selectedTargetId) {
      return null;
    }
    return this.sessionState.targetDrafts[this.selectedTargetId] ?? null;
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

  private updateSelectedDraft(draft: ProviderPublishDraft): void {
    if (!this.sessionState || !this.selectedTargetId) {
      return;
    }
    this.sessionState = {
      ...this.sessionState,
      targetDrafts: {
        ...this.sessionState.targetDrafts,
        [this.selectedTargetId]: draft,
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

  private async handlePublish(target: PublishTargetConfig): Promise<void> {
    const i18n = createI18nFromObsidianLanguage();
    const draft = this.getSelectedDraft();
    if (draft) {
      const validationError = validateTargetDraft(draft);
      if (validationError) {
        this.errorMessage = validationError;
        new Notice(i18n.t("notice.publish.failed", { error: validationError }), 8000);
        await this.render();
        return;
      }
    }
    this.isPublishing = true;
    this.errorMessage = null;
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

    if (this.isInitializing) {
      contentEl.createEl("p", {
        text: i18n.t("publish.normal.loading"),
      });
      return;
    }

    const summaries = deriveNoteTargetSummaries(this.plugin.settings, this.file.path);
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
    if (this.sessionState) {
      this.sessionState.selectedTargetId = this.selectedTargetId;
    }

    const layout = contentEl.createDiv({ cls: "ultimate-publisher-normal-layout" });
    const targetList = layout.createDiv({ cls: "ultimate-publisher-normal-targets" });
    targetList.createEl("h3", { text: i18n.t("publish.shared.targets") });

    for (const summary of enabledSummaries) {
      const button = targetList.createEl("button", { text: summary.name });
      button.toggleClass("mod-cta", summary.targetId === this.selectedTargetId);
      button.disabled = this.isPublishing;
      button.addEventListener("click", () => {
        this.selectedTargetId = summary.targetId;
        if (this.sessionState) {
          this.sessionState.selectedTargetId = summary.targetId;
        }
        void this.render();
        void this.loadRemoteOptionsForSelectedTarget().then(() => this.render());
      });
    }

    const details = layout.createDiv({ cls: "ultimate-publisher-normal-details" });
    details.createEl("h3", { text: i18n.t("publish.normal.section.details") });

    if (this.sessionState) {
      renderTextInput(details, {
        label: i18n.t("publish.normal.field.title"),
        name: "normal-publish-title",
        value: this.sessionState.commonDraft.title,
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

    const selectedDraft = this.getSelectedDraft();
    if (selectedDraft && this.sessionState && this.selectedTargetId) {
      renderTargetForm({
        container: details,
        draft: selectedDraft,
        remoteOptions: this.sessionState.remoteOptions[this.selectedTargetId],
        i18n,
        onChange: (draft) => {
          this.updateSelectedDraft(draft);
        },
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
