import { PublishTargetConfig } from "../../types";
import { PublishableNote } from "../note";
import { buildInitialTargetDraft } from "../normalPublish/drafts";
import { NormalPublishExecutionContext, ProviderPublishDraft, ProviderRemoteOptionsState } from "../normalPublish/types";
import { BatchPublishCommonDraft, BatchPublishWizardState } from "./types";

function cloneStringList(values: string[]): string[] {
  return values.slice();
}

function createIdleRemoteOptionsState(): ProviderRemoteOptionsState {
  return {
    status: "idle",
    data: {},
    manualFallbackFields: [],
  };
}

function updateProviderDraftField(
  draft: ProviderPublishDraft,
  field: "excerpt" | "tags",
  value: string | string[]
): ProviderPublishDraft {
  if (draft.provider !== "wordpress" && draft.provider !== "csdn") {
    return draft;
  }

  if (field === "excerpt") {
    return {
      ...draft,
      excerpt: value as string,
    };
  }

  return {
    ...draft,
    tags: cloneStringList(value as string[]),
  };
}

export function buildBatchPublishWizardState(note: PublishableNote, targets: PublishTargetConfig[]): BatchPublishWizardState {
  const enabledTargets = targets.filter((target) => target.enabled);
  const targetDrafts: Record<string, ProviderPublishDraft> = {};
  const remoteOptions: Record<string, ProviderRemoteOptionsState> = {};
  const validationErrors: Record<string, string | null> = {};

  for (const target of enabledTargets) {
    targetDrafts[target.id] = buildInitialTargetDraft(target, note);
    remoteOptions[target.id] = createIdleRemoteOptionsState();
    validationErrors[target.id] = null;
  }

  return {
    step: 1,
    selectedTargetIds: new Set(enabledTargets.map((target) => target.id)),
    commonDraft: {
      title: note.title,
      tags: cloneStringList(note.tags),
      excerpt: note.excerpt,
    },
    targetDrafts,
    remoteOptions,
    validationErrors,
    executionState: {
      status: "idle",
      currentIndex: 0,
      runningInBackground: false,
      results: enabledTargets.map((target) => ({
        targetId: target.id,
        targetName: target.name,
        // Task 1 state-layer default: action is publish until workflow computes real action.
        action: "publish",
        status: "waiting",
      })),
    },
  };
}

export function updateBatchCommonDraft<K extends keyof BatchPublishCommonDraft>(
  state: BatchPublishWizardState,
  field: K,
  value: BatchPublishCommonDraft[K]
): BatchPublishWizardState {
  const commonDraft: BatchPublishCommonDraft = {
    ...state.commonDraft,
    [field]: field === "tags" ? cloneStringList(value as string[]) : value,
  };

  if (field === "title") {
    return {
      ...state,
      commonDraft,
    };
  }

  const targetDrafts: Record<string, ProviderPublishDraft> = {};
  for (const [targetId, draft] of Object.entries(state.targetDrafts)) {
    targetDrafts[targetId] = updateProviderDraftField(draft, field, value as string | string[]);
  }

  return {
    ...state,
    commonDraft,
    targetDrafts,
  };
}

export function updateBatchTargetDraft(
  state: BatchPublishWizardState,
  targetId: string,
  update: (draft: ProviderPublishDraft) => ProviderPublishDraft
): BatchPublishWizardState {
  const currentDraft = state.targetDrafts[targetId];
  if (!currentDraft) {
    throw new Error(`Batch publish target draft not found: ${targetId}`);
  }

  return {
    ...state,
    targetDrafts: {
      ...state.targetDrafts,
      [targetId]: update(currentDraft),
    },
  };
}

export function buildBatchPublishExecutionContext(
  state: BatchPublishWizardState,
  targetId: string
): NormalPublishExecutionContext {
  const providerDraft = state.targetDrafts[targetId];
  if (!providerDraft) {
    throw new Error(`Batch publish target draft not found: ${targetId}`);
  }

  return {
    common: {
      title: state.commonDraft.title,
    },
    provider: providerDraft,
  };
}
