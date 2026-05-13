import { App, Modal, Setting } from "obsidian";
import { createI18nFromObsidianLanguage, Translator } from "../../i18n";
import { PublishTargetConfig } from "../../types";
import { getProviderCatalogEntry } from "./providerCatalog";
import { applyFieldValue, getModalFieldDefinitions, readFieldValue } from "./modalForm";
import { isWebAuthTarget, WebAuthTargetConfig } from "./webAuthTargetActions";

interface EditTargetModalOptions {
  mode: "create" | "edit";
  target: PublishTargetConfig;
  onSave: (target: PublishTargetConfig) => Promise<void> | void;
  onAuthorizeDraft?: (target: PublishTargetConfig) => Promise<PublishTargetConfig>;
  onValidateDraft?: (target: PublishTargetConfig) => Promise<PublishTargetConfig>;
  onClearAuthDraft?: (target: PublishTargetConfig) => Promise<PublishTargetConfig>;
}

export class EditTargetModal extends Modal {
  private draft: PublishTargetConfig;
  private activeAction: "authorize" | "validate" | "clear" | null = null;
  private statusMessage = "";

  constructor(
    app: App,
    private readonly options: EditTargetModalOptions
  ) {
    super(app);
    this.draft = options.target;
  }

  onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    const i18n = createI18nFromObsidianLanguage();

    const providerName = getProviderCatalogEntry(this.draft.provider, i18n)?.name ?? this.draft.name;
    contentEl.createEl("h2", {
      text:
        this.options.mode === "create"
          ? i18n.t("settings.modal.title.addTarget", { provider: providerName })
          : i18n.t("settings.modal.title.editTarget", { provider: providerName }),
    });

    for (const field of getModalFieldDefinitions(this.draft, i18n)) {
      const setting = new Setting(contentEl).setName(field.label);
      if (field.description) {
        setting.setDesc(field.description);
      }

      if (field.type === "toggle") {
        setting.addToggle((toggle) =>
          toggle.setValue(Boolean(readFieldValue(this.draft, field.key))).onChange((value) => {
            this.draft = applyFieldValue(this.draft, field.key, value);
          })
        );
        continue;
      }

      if (field.type === "dropdown") {
        setting.addDropdown((dropdown) => {
          for (const option of field.options ?? []) {
            dropdown.addOption(option.value, option.label);
          }

          dropdown.setValue(String(readFieldValue(this.draft, field.key))).onChange((value) => {
            this.draft = applyFieldValue(this.draft, field.key, value);
          });
        });
        continue;
      }

      setting.addText((text) => {
        if (field.type === "password") {
          text.inputEl.type = "password";
        }

        text.setValue(String(readFieldValue(this.draft, field.key))).onChange((value) => {
          this.draft = applyFieldValue(this.draft, field.key, value);
        });
      });
    }

    if (isWebAuthTarget(this.draft)) {
      this.renderWebAuthSection(contentEl, this.draft, i18n);
    }

    const actions = contentEl.createDiv({ cls: "ultimate-publisher-settings-modal-actions" });
    const cancelButton = actions.createEl("button", { text: i18n.t("settings.modal.action.cancel") });
    cancelButton.disabled = this.activeAction !== null;
    cancelButton.addEventListener("click", () => this.close());

    const saveButton = actions.createEl("button", { text: i18n.t("settings.modal.action.save") });
    saveButton.addClass("mod-cta");
    saveButton.disabled = this.activeAction !== null;
    saveButton.addEventListener("click", async () => {
      await this.options.onSave(this.draft);
      this.close();
    });
  }

  private renderWebAuthSection(containerEl: HTMLElement, target: WebAuthTargetConfig, i18n: Translator): void {
    const section = containerEl.createDiv({ cls: "ultimate-publisher-settings-web-auth" });
    section.createEl("h3", { text: i18n.t("settings.modal.auth.title") });

    const status = section.createEl("p", {
      text: target.cookie
        ? target.lastValidatedAt
          ? i18n.t("settings.modal.auth.status.authorized")
          : i18n.t("settings.modal.auth.status.cookiePending")
        : i18n.t("settings.modal.auth.status.notAuthorized"),
    });
    status.addClass("ultimate-publisher-meta");

    if (target.accountName || target.accountId) {
      const accountName = target.accountName ?? i18n.t("settings.modal.auth.unknownAccount");
      section.createEl("p", {
        text: i18n.t("settings.modal.auth.account", {
          name: `${accountName}${target.accountId ? ` (${target.accountId})` : ""}`,
        }),
      });
    }

    if (target.lastAuthAt) {
      section.createEl("p", {
        text: i18n.t("settings.modal.auth.lastAuth", { timestamp: target.lastAuthAt }),
      });
    }

    if (target.lastValidatedAt) {
      section.createEl("p", {
        text: i18n.t("settings.modal.auth.lastValidated", { timestamp: target.lastValidatedAt }),
      });
    }

    if (this.statusMessage) {
      section.createEl("p", { text: this.statusMessage });
    }

    const actions = section.createDiv({ cls: "ultimate-publisher-settings-modal-actions" });
    const authorizeButton = actions.createEl("button", {
      text:
        this.activeAction === "authorize"
          ? i18n.t("settings.modal.auth.action.authorizing")
          : i18n.t("settings.modal.auth.action.authorize"),
    });
    authorizeButton.disabled = this.activeAction !== null;
    authorizeButton.addEventListener("click", () => {
      void this.runDraftAction(
        "authorize",
        this.options.onAuthorizeDraft,
        i18n.t("settings.modal.auth.success.authorized")
      );
    });

    const validateButton = actions.createEl("button", {
      text:
        this.activeAction === "validate"
          ? i18n.t("settings.modal.auth.action.validating")
          : i18n.t("settings.modal.auth.action.validate"),
    });
    validateButton.disabled = this.activeAction !== null;
    validateButton.addEventListener("click", () => {
      void this.runDraftAction(
        "validate",
        this.options.onValidateDraft,
        i18n.t("settings.modal.auth.success.validated")
      );
    });

    const clearButton = actions.createEl("button", {
      text:
        this.activeAction === "clear"
          ? i18n.t("settings.modal.auth.action.clearing")
          : i18n.t("settings.modal.auth.action.clear"),
    });
    clearButton.disabled = this.activeAction !== null;
    clearButton.addEventListener("click", () => {
      void this.runDraftAction(
        "clear",
        this.options.onClearAuthDraft,
        i18n.t("settings.modal.auth.success.cleared")
      );
    });
  }

  private async runDraftAction(
    action: "authorize" | "validate" | "clear",
    handler: ((target: PublishTargetConfig) => Promise<PublishTargetConfig>) | undefined,
    successMessage: string
  ): Promise<void> {
    if (!handler) {
      return;
    }

    this.activeAction = action;
    this.statusMessage = "";
    this.render();

    try {
      this.draft = await handler(this.draft);
      this.statusMessage = successMessage;
    } catch (error) {
      this.statusMessage = error instanceof Error ? error.message : String(error);
    } finally {
      this.activeAction = null;
      this.render();
    }
  }
}
