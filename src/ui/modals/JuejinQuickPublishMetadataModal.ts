import { Modal } from "obsidian";
import { PublishableNote } from "../../core/note";
import { JuejinPublishDraft, ProviderRemoteOptionsState } from "../../core/normalPublish/types";
import { validateTargetDraft } from "../../core/normalPublish/validation";
import { createI18nFromObsidianLanguage } from "../../i18n";
import { ProviderRegistry } from "../../providers/registry";
import { JuejinTargetConfig } from "../../types";
import { renderHelperText } from "../normalPublish/formControls";
import { renderTargetForm } from "../normalPublish/renderTargetForm";

function cloneDraft(draft: JuejinPublishDraft): JuejinPublishDraft {
  return {
    ...draft,
    tagIds: draft.tagIds.slice(),
    tagNames: draft.tagNames.slice(),
  };
}

function createIdleRemoteOptionsState(): ProviderRemoteOptionsState {
  return {
    status: "idle",
    data: {},
    manualFallbackFields: [],
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeOptionLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export class JuejinQuickPublishMetadataModal extends Modal {
  private draft: JuejinPublishDraft;
  private remoteOptions: ProviderRemoteOptionsState = createIdleRemoteOptionsState();
  private errorMessage: string | null = null;
  private isLoading = false;
  private isSubmitting = false;
  private resolved = false;
  private readonly resultPromise: Promise<JuejinPublishDraft | null>;
  private readonly resolveResult: (value: JuejinPublishDraft | null) => void;

  constructor(
    app: Modal["app"],
    private readonly target: JuejinTargetConfig,
    private readonly note: PublishableNote,
    initialDraft: JuejinPublishDraft,
    private readonly providerRegistry: ProviderRegistry = new ProviderRegistry(app)
  ) {
    super(app);
    this.draft = cloneDraft(initialDraft);
    let resolvePromise: (value: JuejinPublishDraft | null) => void = () => {};
    this.resultPromise = new Promise<JuejinPublishDraft | null>((resolve) => {
      resolvePromise = resolve;
    });
    this.resolveResult = resolvePromise;
  }

  openAndWait(): Promise<JuejinPublishDraft | null> {
    this.open();
    return this.resultPromise;
  }

  async onOpen(): Promise<void> {
    await this.render();
    await this.loadRemoteOptions();
    await this.render();
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.resolved) {
      this.finish(null);
    }
  }

  private finish(result: JuejinPublishDraft | null): void {
    if (this.resolved) {
      return;
    }
    this.resolved = true;
    this.resolveResult(result ? cloneDraft(result) : null);
  }

  private readOptionItems(key: "juejinCategories" | "juejinTags"): Array<{ id: string; label: string }> {
    const raw = this.remoteOptions.data[key];
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.filter(
      (item): item is { id: string; label: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { label?: unknown }).label === "string"
    );
  }

  private applyFrontmatterPrefill(): void {
    const categories = this.readOptionItems("juejinCategories");
    const tags = this.readOptionItems("juejinTags");

    if (!this.draft.categoryId) {
      const frontmatterCategory = readString(this.note.frontmatter["juejinCategory"]);
      if (frontmatterCategory) {
        const matchedCategory = categories.find(
          (item) => normalizeOptionLabel(item.label) === normalizeOptionLabel(frontmatterCategory)
        );
        if (matchedCategory) {
          this.draft = {
            ...this.draft,
            categoryId: matchedCategory.id,
            categoryName: matchedCategory.label,
          };
        }
      }
    }

    if (this.draft.tagIds.length === 0) {
      const frontmatterTags = readStringArray(this.note.frontmatter["juejinTags"]);
      if (frontmatterTags.length > 0) {
        const matchedTags = frontmatterTags
          .map((tagName) =>
            tags.find((item) => normalizeOptionLabel(item.label) === normalizeOptionLabel(tagName))
          )
          .filter((item): item is { id: string; label: string } => Boolean(item));

        if (matchedTags.length > 0) {
          this.draft = {
            ...this.draft,
            tagIds: matchedTags.map((item) => item.id),
            tagNames: matchedTags.map((item) => item.label),
          };
        }
      }
    }
  }

  private async loadRemoteOptions(): Promise<void> {
    const provider = this.providerRegistry.get(this.target);
    if (!provider.loadNormalPublishOptions) {
      this.remoteOptions = {
        status: "loaded",
        data: {},
        manualFallbackFields: [],
      };
      return;
    }

    this.isLoading = true;
    try {
      const data = await provider.loadNormalPublishOptions(this.target);
      this.remoteOptions = {
        status: "loaded",
        data: data as Record<string, unknown>,
        manualFallbackFields: [],
      };
      this.applyFrontmatterPrefill();
    } catch (error) {
      this.remoteOptions = {
        status: "error",
        data: {},
        errorMessage: error instanceof Error ? error.message : String(error),
        manualFallbackFields: ["categoryId", "tagIds"],
      };
    } finally {
      this.isLoading = false;
    }
  }

  private updateDraft(update: (draft: JuejinPublishDraft) => JuejinPublishDraft): void {
    this.draft = update(this.draft);
    this.errorMessage = null;
    void this.render();
  }

  private async handleSubmit(): Promise<void> {
    const validationError = validateTargetDraft(this.draft);
    if (validationError) {
      this.errorMessage = validationError;
      await this.render();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    await this.render();
    this.finish(this.draft);
    this.close();
  }

  private async render(): Promise<void> {
    const i18n = createI18nFromObsidianLanguage();
    this.titleEl.setText(i18n.t("publish.quickJuejin.title"));
    this.contentEl.empty();

    const container = this.contentEl.createDiv({ cls: "ultimate-publisher-normal-modal" });
    container.createEl("p", {
      text: i18n.t("publish.quickJuejin.subtitle"),
    });

    if (this.errorMessage) {
      renderHelperText(container, this.errorMessage, "warning");
    }

    if (this.isLoading) {
      renderHelperText(container, i18n.t("publish.normal.loading"), "info");
    }

    renderTargetForm({
      container,
      draft: this.draft,
      remoteOptions: this.remoteOptions,
      i18n,
      hiddenFields: ["briefContent"],
      fieldNamePrefix: "quick-publish",
      onChange: (update) => {
        if (this.isSubmitting) {
          return;
        }
        this.updateDraft((draft) => {
          const nextDraft = update(draft);
          return nextDraft.provider === "juejin" ? nextDraft : draft;
        });
      },
    });

    const actions = container.createDiv({ cls: "ultimate-publisher-setting-actions" });
    const cancelButton = actions.createEl("button", {
      text: i18n.t("publish.quickJuejin.action.cancel"),
    });
    cancelButton.disabled = this.isSubmitting;
    cancelButton.addEventListener("click", () => {
      this.finish(null);
      this.close();
    });

    const confirmButton = actions.createEl("button", {
      text: i18n.t("publish.quickJuejin.action.confirm"),
    });
    confirmButton.toggleClass("mod-cta", true);
    confirmButton.disabled = this.isSubmitting;
    confirmButton.addEventListener("click", () => {
      void this.handleSubmit();
    });
  }
}
