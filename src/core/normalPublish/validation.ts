import { getProviderDefinition } from "../../providers/definitions";
import { ProviderPublishDraft } from "./types";

export function validateTargetDraft(draft: ProviderPublishDraft): string | null {
  return getProviderDefinition(draft.provider).normalPublish?.validateDraft?.(draft as never) ?? null;
}
