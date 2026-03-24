import { App, Modal, Setting } from "obsidian";
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

    const providerName = getProviderCatalogEntry(this.draft.provider)?.name ?? this.draft.name;
    contentEl.createEl("h2", {
      text: `${this.options.mode === "create" ? "Add" : "Edit"} ${providerName} Target`,
    });

    for (const field of getModalFieldDefinitions(this.draft)) {
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
      this.renderWebAuthSection(contentEl, this.draft);
    }

    const actions = contentEl.createDiv({ cls: "ultimate-publisher-settings-modal-actions" });
    const cancelButton = actions.createEl("button", { text: "Cancel" });
    cancelButton.disabled = this.activeAction !== null;
    cancelButton.addEventListener("click", () => this.close());

    const saveButton = actions.createEl("button", { text: "Save" });
    saveButton.addClass("mod-cta");
    saveButton.disabled = this.activeAction !== null;
    saveButton.addEventListener("click", async () => {
      await this.options.onSave(this.draft);
      this.close();
    });
  }

  private renderWebAuthSection(containerEl: HTMLElement, target: WebAuthTargetConfig): void {
    const section = containerEl.createDiv({ cls: "ultimate-publisher-settings-web-auth" });
    section.createEl("h3", { text: "Authorization" });

    const status = section.createEl("p", {
      text: target.cookie
        ? target.lastValidatedAt
          ? "Status: Authorized"
          : "Status: Cookie set, validation pending"
        : "Status: Not authorized",
    });
    status.addClass("ultimate-publisher-meta");

    if (target.accountName || target.accountId) {
      section.createEl("p", {
        text: `Account: ${target.accountName ?? "Unknown"}${target.accountId ? ` (${target.accountId})` : ""}`,
      });
    }

    if (target.lastAuthAt) {
      section.createEl("p", { text: `Last auth: ${target.lastAuthAt}` });
    }

    if (target.lastValidatedAt) {
      section.createEl("p", { text: `Last validated: ${target.lastValidatedAt}` });
    }

    if (this.statusMessage) {
      section.createEl("p", { text: this.statusMessage });
    }

    const actions = section.createDiv({ cls: "ultimate-publisher-settings-modal-actions" });
    const authorizeButton = actions.createEl("button", { text: this.activeAction === "authorize" ? "Authorizing..." : "网页授权" });
    authorizeButton.disabled = this.activeAction !== null;
    authorizeButton.addEventListener("click", () => {
      void this.runDraftAction("authorize", this.options.onAuthorizeDraft, "Browser authorization completed.");
    });

    const validateButton = actions.createEl("button", { text: this.activeAction === "validate" ? "Validating..." : "校验配置" });
    validateButton.disabled = this.activeAction !== null;
    validateButton.addEventListener("click", () => {
      void this.runDraftAction("validate", this.options.onValidateDraft, "Validation completed.");
    });

    const clearButton = actions.createEl("button", { text: this.activeAction === "clear" ? "Clearing..." : "清除授权" });
    clearButton.disabled = this.activeAction !== null;
    clearButton.addEventListener("click", () => {
      void this.runDraftAction("clear", this.options.onClearAuthDraft, "Authorization data cleared.");
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
