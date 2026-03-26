import { sanitizeFileName } from "../note";
import { ProviderPublishDraft } from "./types";

export function validateTargetDraft(draft: ProviderPublishDraft): string | null {
  switch (draft.provider) {
    case "zhihu":
      return draft.columnId.trim() ? null : "Zhihu publish requires a columnId.";
    case "juejin":
      if (!draft.categoryId.trim()) {
        return "Juejin publish requires a categoryId.";
      }
      if (draft.tagIds.length === 0) {
        return "Juejin publish requires at least one tagId.";
      }
      return null;
    case "local-export": {
      const candidate = sanitizeFileName(draft.slug || "", "");
      return candidate ? null : "Local export requires a valid slug or title.";
    }
    default:
      return null;
  }
}
