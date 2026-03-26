import { Translator } from "../../i18n";
import { renderHelperText, renderStringListInput, renderTextArea, renderTextInput } from "./formControls";
import { ProviderPublishDraft, ProviderRemoteOptionsState } from "../../core/normalPublish/types";

interface RenderTargetFormOptions {
  container: HTMLElement;
  draft: ProviderPublishDraft;
  remoteOptions: ProviderRemoteOptionsState | undefined;
  i18n: Translator;
  onChange: (draft: ProviderPublishDraft) => void;
}

export function renderTargetForm(options: RenderTargetFormOptions): void {
  const { container, draft, remoteOptions, i18n, onChange } = options;

  if (remoteOptions?.status === "error") {
    renderHelperText(container, i18n.t("publish.normal.remote.fallback"));
  }

  switch (draft.provider) {
    case "wordpress":
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.slug"),
        name: "normal-publish-wordpress-slug",
        value: draft.slug,
        onInput: (value) => onChange({ ...draft, slug: value }),
      });
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.excerpt"),
        name: "normal-publish-wordpress-excerpt",
        value: draft.excerpt,
        onInput: (value) => onChange({ ...draft, excerpt: value }),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.tags"),
        name: "normal-publish-wordpress-tags",
        value: draft.tags,
        onInput: (value) => onChange({ ...draft, tags: value }),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.categories"),
        name: "normal-publish-wordpress-categories",
        value: draft.categories,
        onInput: (value) => onChange({ ...draft, categories: value }),
      });
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.status"),
        name: "normal-publish-wordpress-status",
        value: draft.status,
        onInput: (value) => onChange({ ...draft, status: value as typeof draft.status }),
      });
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.password"),
        name: "normal-publish-wordpress-password",
        value: draft.password,
        onInput: (value) => onChange({ ...draft, password: value }),
      });
      return;
    case "yuque":
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.slug"),
        name: "normal-publish-yuque-slug",
        value: draft.slug,
        onInput: (value) => onChange({ ...draft, slug: value }),
      });
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.publicLevel"),
        name: "normal-publish-yuque-publicLevel",
        value: String(draft.publicLevel),
        onInput: (value) => onChange({ ...draft, publicLevel: value === "1" ? 1 : 0 }),
      });
      return;
    case "local-export":
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.slug"),
        name: "normal-publish-local-export-slug",
        value: draft.slug,
        onInput: (value) => onChange({ ...draft, slug: value }),
      });
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.excerpt"),
        name: "normal-publish-local-export-excerpt",
        value: draft.excerpt,
        onInput: (value) => onChange({ ...draft, excerpt: value }),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.tags"),
        name: "normal-publish-local-export-tags",
        value: draft.tags,
        onInput: (value) => onChange({ ...draft, tags: value }),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.categories"),
        name: "normal-publish-local-export-categories",
        value: draft.categories,
        onInput: (value) => onChange({ ...draft, categories: value }),
      });
      return;
    case "zhihu":
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.columnId"),
        name: "normal-publish-zhihu-columnId",
        value: draft.columnId,
        onInput: (value) => onChange({ ...draft, columnId: value }),
      });
      return;
    case "csdn":
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.excerpt"),
        name: "normal-publish-csdn-excerpt",
        value: draft.excerpt,
        onInput: (value) => onChange({ ...draft, excerpt: value }),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.tags"),
        name: "normal-publish-csdn-tags",
        value: draft.tags,
        onInput: (value) => onChange({ ...draft, tags: value }),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.categories"),
        name: "normal-publish-csdn-categories",
        value: draft.categories,
        onInput: (value) => onChange({ ...draft, categories: value }),
      });
      return;
    case "juejin":
      renderTextInput(container, {
        label: i18n.t("publish.normal.field.categoryId"),
        name: "normal-publish-juejin-categoryId",
        value: draft.categoryId,
        onInput: (value) => onChange({ ...draft, categoryId: value }),
      });
      renderStringListInput(container, {
        label: i18n.t("publish.normal.field.tagIds"),
        name: "normal-publish-juejin-tagIds",
        value: draft.tagIds,
        onInput: (value) => onChange({ ...draft, tagIds: value }),
      });
      renderTextArea(container, {
        label: i18n.t("publish.normal.field.briefContent"),
        name: "normal-publish-juejin-briefContent",
        value: draft.briefContent,
        onInput: (value) => onChange({ ...draft, briefContent: value }),
      });
      return;
  }
}
