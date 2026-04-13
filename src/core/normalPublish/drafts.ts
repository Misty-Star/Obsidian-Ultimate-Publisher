import { PublishableNote } from "../note";
import { PublishTargetConfig } from "../../types";
import { getProviderDefinition } from "../../providers/definitions";
import {
  NormalPublishSessionState,
  ProviderPublishDraft,
  ProviderRemoteOptionsState,
} from "./types";

function createIdleRemoteOptionsState(): ProviderRemoteOptionsState {
  return {
    status: "idle",
    data: {},
    manualFallbackFields: [],
  };
}

export function buildInitialTargetDraft(target: PublishTargetConfig, note: PublishableNote): ProviderPublishDraft {
  const definition = getProviderDefinition(target.provider);
  if (!definition.buildInitialDraft) {
    throw new Error(`Provider ${target.provider} does not define a normal publish draft builder.`);
  }
  return definition.buildInitialDraft(note, target as never);
}

export function buildNormalPublishSessionState(
  note: PublishableNote,
  targets: PublishTargetConfig[]
): NormalPublishSessionState {
  const enabledTargets = targets.filter((target) => target.enabled);
  const targetDrafts: Record<string, ProviderPublishDraft> = {};
  const remoteOptions: Record<string, ProviderRemoteOptionsState> = {};
  const lastErrorByTargetId: Record<string, string | null> = {};

  for (const target of enabledTargets) {
    targetDrafts[target.id] = buildInitialTargetDraft(target, note);
    remoteOptions[target.id] = createIdleRemoteOptionsState();
    lastErrorByTargetId[target.id] = null;
  }

  return {
    selectedTargetId: enabledTargets[0]?.id ?? null,
    commonDraft: {
      title: note.title,
    },
    targetDrafts,
    remoteOptions,
    lastErrorByTargetId,
  };
}
