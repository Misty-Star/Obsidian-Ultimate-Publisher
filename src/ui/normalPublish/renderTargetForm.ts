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
import { ProviderPublishDraft, ProviderRemoteOptionsState } from "../../core/normalPublish/types";

interface RenderTargetFormOptions {
  container: HTMLElement;
  draft: ProviderPublishDraft;
  remoteOptions: ProviderRemoteOptionsState | undefined;
  i18n: Translator;
  onChange: (update: (draft: ProviderPublishDraft) => ProviderPublishDraft) => void;
}

export function renderTargetForm(options: RenderTargetFormOptions): void {
  const { container, draft, remoteOptions, i18n, onChange } = options;

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
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.slug"),
        name: "normal-publish-wordpress-slug",
        value: draft.slug,
        onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, slug: value })),
      });
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.excerpt"),
        name: "normal-publish-wordpress-excerpt",
        value: draft.excerpt,
        onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, excerpt: value })),
      });
      const wordpressTags = readOptionItems("wordpressTags");
      const wordpressCategories = readOptionItems("wordpressCategories");
      if (wordpressTags.length > 0 && !remoteOptions?.manualFallbackFields.includes("tags")) {
        renderSelectableStringListInput(container, {
          label: i18n.t("publish.normal.field.tags"),
          name: "normal-publish-wordpress-tags",
          value: draft.tags,
          choices: toSelectableStringChoices(wordpressTags),
          description: i18n.t("publish.normal.remote.manualHint"),
          onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, tags: value })),
        });
      } else {
        renderStringListInput(container, {
          label: i18n.t("publish.normal.field.tags"),
          name: "normal-publish-wordpress-tags",
          value: draft.tags,
          onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, tags: value })),
        });
      }
      if (wordpressCategories.length > 0 && !remoteOptions?.manualFallbackFields.includes("categories")) {
        renderDropdownSelectableStringListInput(container, {
          label: i18n.t("publish.normal.field.categories"),
          name: "normal-publish-wordpress-categories",
          value: draft.categories,
          choices: toSelectableStringChoices(wordpressCategories),
          description: i18n.t("publish.normal.remote.dropdownInputHint"),
          onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, categories: value })),
        });
      } else {
        renderStringListInput(container, {
          label: i18n.t("publish.normal.field.categories"),
          name: "normal-publish-wordpress-categories",
          value: draft.categories,
          onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, categories: value })),
        });
      }
      renderSelectInput(container, {
        label: i18n.t("publish.normal.field.status"),
        name: "normal-publish-wordpress-status",
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
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.password"),
        name: "normal-publish-wordpress-password",
        value: draft.password,
        onInput: (value) => applyDraftUpdate("wordpress", (currentDraft) => ({ ...currentDraft, password: value })),
      });
      return;
    case "yuque":
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.slug"),
        name: "normal-publish-yuque-slug",
        value: draft.slug,
        onInput: (value) => applyDraftUpdate("yuque", (currentDraft) => ({ ...currentDraft, slug: value })),
      });
      renderSelectInput(container, {
        label: i18n.t("publish.normal.field.publicLevel"),
        name: "normal-publish-yuque-publicLevel",
        value: String(draft.publicLevel),
        choices: [
          { value: "0", label: i18n.t("publish.normal.option.visibility.private") },
          { value: "1", label: i18n.t("publish.normal.option.visibility.public") },
        ],
        onChange: (value) => applyDraftUpdate("yuque", (currentDraft) => ({ ...currentDraft, publicLevel: value === "1" ? 1 : 0 })),
      });
      return;
    case "local-export":
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.slug"),
        name: "normal-publish-local-export-slug",
        value: draft.slug,
        onInput: (value) => applyDraftUpdate("local-export", (currentDraft) => ({ ...currentDraft, slug: value })),
      });
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.excerpt"),
        name: "normal-publish-local-export-excerpt",
        value: draft.excerpt,
        onInput: (value) => applyDraftUpdate("local-export", (currentDraft) => ({ ...currentDraft, excerpt: value })),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.tags"),
        name: "normal-publish-local-export-tags",
        value: draft.tags,
        onInput: (value) => applyDraftUpdate("local-export", (currentDraft) => ({ ...currentDraft, tags: value })),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.categories"),
        name: "normal-publish-local-export-categories",
        value: draft.categories,
        onInput: (value) => applyDraftUpdate("local-export", (currentDraft) => ({ ...currentDraft, categories: value })),
      });
      return;
    case "zhihu":
      const columns = readOptionItems("zhihuColumns");
      if (columns.length > 0 && !remoteOptions?.manualFallbackFields.includes("columnId")) {
        renderSelectInput(container, {
          label: i18n.t("publish.normal.field.columnId"),
          name: "normal-publish-zhihu-columnId",
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
          name: "normal-publish-zhihu-columnId",
          value: draft.columnId,
          description: i18n.t("publish.normal.remote.manualFallbackHint"),
          onInput: (value) => applyDraftUpdate("zhihu", (currentDraft) => ({ ...currentDraft, columnId: value })),
        });
      }
      return;
    case "csdn":
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.excerpt"),
        name: "normal-publish-csdn-excerpt",
        value: draft.excerpt,
        onInput: (value) => applyDraftUpdate("csdn", (currentDraft) => ({ ...currentDraft, excerpt: value })),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.tags"),
        name: "normal-publish-csdn-tags",
        value: draft.tags,
        description:
          readOptionItems("csdnTags").length > 0
            ? i18n.t("publish.normal.remote.manualHint")
            : undefined,
        onInput: (value) => applyDraftUpdate("csdn", (currentDraft) => ({ ...currentDraft, tags: value })),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.categories"),
        name: "normal-publish-csdn-categories",
        value: draft.categories,
        description:
          readOptionItems("csdnCategories").length > 0
            ? i18n.t("publish.normal.remote.manualHint")
            : undefined,
        onInput: (value) => applyDraftUpdate("csdn", (currentDraft) => ({ ...currentDraft, categories: value })),
      });
      return;
    case "juejin":
      const categories = readOptionItems("juejinCategories");
      if (categories.length > 0 && !remoteOptions?.manualFallbackFields.includes("categoryId")) {
        renderSelectInput(container, {
          label: i18n.t("publish.normal.field.categoryId"),
          name: "normal-publish-juejin-categoryId",
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
          name: "normal-publish-juejin-categoryId",
          value: draft.categoryId,
          description: i18n.t("publish.normal.remote.manualFallbackHint"),
          onInput: (value) => applyDraftUpdate("juejin", (currentDraft) => ({ ...currentDraft, categoryId: value })),
        });
      }
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.tagIds"),
        name: "normal-publish-juejin-tagIds",
        value: draft.tagIds,
        description:
          readOptionItems("juejinTags").length > 0
            ? i18n.t("publish.normal.remote.manualHint")
            : undefined,
        onInput: (value) => applyDraftUpdate("juejin", (currentDraft) => ({ ...currentDraft, tagIds: value })),
      });
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.briefContent"),
        name: "normal-publish-juejin-briefContent",
        value: draft.briefContent,
        onInput: (value) => applyDraftUpdate("juejin", (currentDraft) => ({ ...currentDraft, briefContent: value })),
      });
      return;
  }
}
