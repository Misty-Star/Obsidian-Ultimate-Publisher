import { App, Modal, Setting } from "obsidian";
import { PublishTargetConfig } from "../../types";
import { getProviderCatalogEntry } from "./providerCatalog";
import { applyFieldValue, getModalFieldDefinitions, readFieldValue } from "./modalForm";

interface EditTargetModalOptions {
  mode: "create" | "edit";
  target: PublishTargetConfig;
  onSave: (target: PublishTargetConfig) => Promise<void> | void;
}

export class EditTargetModal extends Modal {
  private draft: PublishTargetConfig;

  constructor(
    app: App,
    private readonly options: EditTargetModalOptions
  ) {
    super(app);
    this.draft = options.target;
  }

  onOpen(): void {
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

    const actions = contentEl.createDiv({ cls: "ultimate-publisher-settings-modal-actions" });
    const cancelButton = actions.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());

    const saveButton = actions.createEl("button", { text: "Save" });
    saveButton.addClass("mod-cta");
    saveButton.addEventListener("click", async () => {
      await this.options.onSave(this.draft);
      this.close();
    });
  }
}
