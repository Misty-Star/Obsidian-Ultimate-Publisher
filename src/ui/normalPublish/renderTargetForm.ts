import { NormalPublishOptionItem } from "../../core/providers";
import { Translator } from "../../i18n";
import {
  renderDropdownSelectableStringListInput,
  renderHelperText,
  renderSelectableStringListInput,
  renderSelectInput,
  renderStringListInput,
  renderTextArea,
  renderTextInput,
} from "./formControls";
import {
  NormalPublishFieldKey,
  ProviderPublishDraft,
  ProviderRemoteOptionsState,
} from "../../core/normalPublish/types";

interface RenderTargetFormOptions {
  container: HTMLElement;
  draft: ProviderPublishDraft;
  remoteOptions: ProviderRemoteOptionsState | undefined;
  i18n: Translator;
  onChange: (update: (draft: ProviderPublishDraft) => ProviderPublishDraft) => void;
  hiddenFields?: NormalPublishFieldKey[];
  fieldNamePrefix?: string;
}

export function renderTargetForm(options: RenderTargetFormOptions): void {
  const { container, draft, remoteOptions, i18n, onChange } = options;
  const hiddenFields = new Set(options.hiddenFields ?? []);
  const prefix = options.fieldNamePrefix ?? "normal-publish";
  const fieldName = (suffix: string): string => `${prefix}-${suffix}`;

  const readOptionItems = (key: keyof NonNullable<typeof remoteOptions>["data"]): NormalPublishOptionItem[] => {
    const raw = remoteOptions?.data[key];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter(
      (item): item is NormalPublishOptionItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as NormalPublishOptionItem).id === "string" &&
        typeof (item as NormalPublishOptionItem).label === "string"
    );
  };

  const findOption = (items: NormalPublishOptionItem[], id: string): NormalPublishOptionItem | undefined =>
    items.find((item) => item.id === id);

  const toSelectableStringChoices = (items: NormalPublishOptionItem[]) =>
    items.map((item) => ({
      id: item.id,
      value: item.label,
      label: item.label,
      description: item.description,
    }));

  const applyDraftUpdate = <TDraft extends ProviderPublishDraft>(
    provider: TDraft["provider"],
    update: (currentDraft: TDraft) => TDraft
  ): void => {
    onChange((currentDraft) => (currentDraft.provider === provider ? update(currentDraft as TDraft) : currentDraft));
  };

  if (remoteOptions?.status === "loading") {
    renderHelperText(container, i18n.t("publish.normal.remote.loading"), "info");
  }

  if (remoteOptions?.status === "error") {
    renderHelperText(container, i18n.t("publish.normal.remote.fallback"), "warning");
  }

  switch (draft.provider) {
    case "wordpress":
      if (!hiddenFields.has("slug")) {
        renderTextInput(container, {
          label: i18n.t("publish.normal.field.slug"),
          name: fieldName("wordpress-slug"),
          value: draft.slug,
          onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, slug: value })),
        });
      }
      if (!hiddenFields.has("excerpt")) {
        renderTextArea(container, {
          label: i18n.t("publish.normal.field.excerpt"),
          name: fieldName("wordpress-excerpt"),
          value: draft.excerpt,
          onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, excerpt: value })),
        });
      }
      const wordpressTags = readOptionItems("wordpressTags");
      const wordpressCategories = readOptionItems("wordpressCategories");
      if (!hiddenFields.has("tags")) {
        if (wordpressTags.length > 0 && !remoteOptions?.manualFallbackFields.includes("tags")) {
          renderSelectableStringListInput(container, {
            label: i18n.t("publish.normal.field.tags"),
            name: fieldName("wordpress-tags"),
            value: draft.tags,
            choices: toSelectableStringChoices(wordpressTags),
            description: i18n.t("publish.normal.remote.manualHint"),
            onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, tags: value })),
          });
        } else {
          renderStringListInput(container, {
            label: i18n.t("publish.normal.field.tags"),
            name: fieldName("wordpress-tags"),
            value: draft.tags,
            onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, tags: value })),
          });
        }
      }
      if (!hiddenFields.has("categories")) {
        if (wordpressCategories.length > 0 && !remoteOptions?.manualFallbackFields.includes("categories")) {
          renderDropdownSelectableStringListInput(container, {
            label: i18n.t("publish.normal.field.categories"),
            name: fieldName("wordpress-categories"),
            value: draft.categories,
            choices: toSelectableStringChoices(wordpressCategories),
            description: i18n.t("publish.normal.remote.dropdownInputHint"),
            onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, categories: value })),
          });
        } else {
          renderStringListInput(container, {
            label: i18n.t("publish.normal.field.categories"),
            name: fieldName("wordpress-categories"),
            value: draft.categories,
            onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, categories: value })),
          });
        }
      }
      if (!hiddenFields.has("status")) {
        renderSelectInput(container, {
          label: i18n.t("publish.normal.field.status"),
          name: fieldName("wordpress-status"),
          value: draft.status,
          choices: [
            { value: "draft", label: i18n.t("publish.normal.option.status.draft") },
            { value: "publish", label: i18n.t("publish.normal.option.status.publish") },
            { value: "private", label: i18n.t("publish.normal.option.status.private") },
            { value: "pending", label: i18n.t("publish.normal.option.status.pending") },
          ],
          onChange: (value) =>
            applyDraftUpdate("wordpress", (currentDraft: typeof draft) => ({ ...currentDraft, status: value as typeof draft.status })),
        });
      }
      if (!hiddenFields.has("password")) {
        renderTextInput(container, {
          label: i18n.t("publish.normal.field.password"),
          name: fieldName("wordpress-password"),
          value: draft.password,
          onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, password: value })),
        });
      }
      return;
    case "yuque":
      if (!hiddenFields.has("slug")) {
        renderTextInput(container, {
          label: i18n.t("publish.normal.field.slug"),
          name: fieldName("yuque-slug"),
          value: draft.slug,
          onInput: (value) => applyDraftUpdate("yuque", (currentDraft) => ({ ...currentDraft, slug: value })),
        });
      }
      if (!hiddenFields.has("publicLevel")) {
        renderSelectInput(container, {
          label: i18n.t("publish.normal.field.publicLevel"),
          name: fieldName("yuque-publicLevel"),
          value: String(draft.publicLevel),
          choices: [
            { value: "0", label: i18n.t("publish.normal.option.visibility.private") },
            { value: "1", label: i18n.t("publish.normal.option.visibility.public") },
          ],
            onChange: (value) => applyDraftUpdate("yuque", (currentDraft) => ({ ...currentDraft, publicLevel: value === "1" ? 1 : 0 })),
        });
      }
      return;
    case "zhihu":
      const columns = readOptionItems("zhihuColumns");
      if (!hiddenFields.has("columnId")) {
        if (columns.length > 0 && !remoteOptions?.manualFallbackFields.includes("columnId")) {
          renderSelectInput(container, {
            label: i18n.t("publish.normal.field.columnId"),
            name: fieldName("zhihu-columnId"),
            value: draft.columnId,
            choices: columns.map((column) => ({
              value: column.id,
              label: `${column.label} (${column.id})`,
            })),
            description: i18n.t("publish.normal.remote.selectHint"),
            onChange: (value) => {
              const selected = findOption(columns, value);
              applyDraftUpdate("zhihu", (currentDraft: typeof draft) => ({
                ...currentDraft,
                columnId: value,
                columnTitle: selected?.label ?? currentDraft.columnTitle,
              }));
            },
          });
          const selectedColumn = findOption(columns, draft.columnId);
          if (selectedColumn?.description) {
            renderHelperText(container, selectedColumn.description);
          }
        } else {
          renderTextInput(container, {
            label: i18n.t("publish.normal.field.columnId"),
            name: fieldName("zhihu-columnId"),
            value: draft.columnId,
            description: i18n.t("publish.normal.remote.manualFallbackHint"),
            onInput: (value) => applyDraftUpdate("zhihu", (currentDraft) => ({ ...currentDraft, columnId: value })),
          });
        }
      }
      return;
    case "csdn":
      if (!hiddenFields.has("excerpt")) {
        renderTextArea(container, {
          label: i18n.t("publish.normal.field.excerpt"),
          name: fieldName("csdn-excerpt"),
          value: draft.excerpt,
          onInput: (value) => applyDraftUpdate("csdn", (currentDraft) => ({ ...currentDraft, excerpt: value })),
        });
      }
      if (!hiddenFields.has("tags")) {
        renderStringListInput(container, {
          label: i18n.t("publish.normal.field.tags"),
          name: fieldName("csdn-tags"),
          value: draft.tags,
          description:
            readOptionItems("csdnTags").length > 0
              ? i18n.t("publish.normal.remote.manualHint")
              : undefined,
          onInput: (value) => applyDraftUpdate("csdn", (currentDraft) => ({ ...currentDraft, tags: value })),
        });
      }
      if (!hiddenFields.has("categories")) {
        renderStringListInput(container, {
          label: i18n.t("publish.normal.field.categories"),
          name: fieldName("csdn-categories"),
          value: draft.categories,
          description:
            readOptionItems("csdnCategories").length > 0
              ? i18n.t("publish.normal.remote.manualHint")
              : undefined,
          onInput: (value) => applyDraftUpdate("csdn", (currentDraft) => ({ ...currentDraft, categories: value })),
        });
      }
      return;
    case "juejin":
      const categories = readOptionItems("juejinCategories");
      if (!hiddenFields.has("categoryId")) {
        if (categories.length > 0 && !remoteOptions?.manualFallbackFields.includes("categoryId")) {
          renderSelectInput(container, {
            label: i18n.t("publish.normal.field.categoryId"),
            name: fieldName("juejin-categoryId"),
            value: draft.categoryId,
            choices: categories.map((category) => ({
              value: category.id,
              label: `${category.label} (${category.id})`,
            })),
            description: i18n.t("publish.normal.remote.selectHint"),
            onChange: (value) => {
              const selected = findOption(categories, value);
              applyDraftUpdate("juejin", (currentDraft: typeof draft) => ({
                ...currentDraft,
                categoryId: value,
                categoryName: selected?.label ?? currentDraft.categoryName,
              }));
            },
          });
        } else {
          renderTextInput(container, {
            label: i18n.t("publish.normal.field.categoryId"),
            name: fieldName("juejin-categoryId"),
            value: draft.categoryId,
            description: i18n.t("publish.normal.remote.manualFallbackHint"),
            onInput: (value) => applyDraftUpdate("juejin", (currentDraft) => ({ ...currentDraft, categoryId: value })),
          });
        }
      }
      if (!hiddenFields.has("tagIds")) {
        renderStringListInput(container, {
          label: i18n.t("publish.normal.field.tagIds"),
          name: fieldName("juejin-tagIds"),
          value: draft.tagIds,
          description:
            readOptionItems("juejinTags").length > 0
              ? i18n.t("publish.normal.remote.manualHint")
              : undefined,
          onInput: (value) => applyDraftUpdate("juejin", (currentDraft) => ({ ...currentDraft, tagIds: value })),
        });
      }
      if (!hiddenFields.has("briefContent")) {
        renderTextArea(container, {
          label: i18n.t("publish.normal.field.briefContent"),
          name: fieldName("juejin-briefContent"),
          value: draft.briefContent,
          onInput: (value) => applyDraftUpdate("juejin", (currentDraft) => ({ ...currentDraft, briefContent: value })),
        });
      }
      return;
  }
}
