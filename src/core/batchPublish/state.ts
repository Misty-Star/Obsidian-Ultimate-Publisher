import type { PublishTargetConfig } from "../../types";
import type { PublishableNote } from "../note";
import { buildInitialTargetDraft } from "../normalPublish/drafts";
import type {
  NormalPublishExecutionContext,
  ProviderPublishDraft,
  ProviderRemoteOptionsState,
} from "../normalPublish/types";
import type { BatchPublishCommonDraft, BatchPublishWizardState } from "./types";

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

type ProviderDraftFieldUpdate = { field: "excerpt"; value: string } | { field: "tags"; value: string[] };

function updateProviderDraftField(draft: ProviderPublishDraft, update: ProviderDraftFieldUpdate): ProviderPublishDraft {
  if (draft.provider !== "wordpress" && draft.provider !== "csdn") {
    return draft;
  }

  if (update.field === "excerpt") {
    return {
      ...draft,
      excerpt: update.value,
    };
  }

  return {
    ...draft,
    tags: cloneStringList(update.value),
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
  let commonDraft: BatchPublishCommonDraft;
  if (field === "tags") {
    if (!Array.isArray(value)) {
      throw new Error("Batch publish common draft field 'tags' requires string array value");
    }

    commonDraft = {
      ...state.commonDraft,
      tags: cloneStringList(value),
    };
  } else {
    if (typeof value !== "string") {
      throw new Error(`Batch publish common draft field '${field}' requires string value`);
    }

    commonDraft = {
      ...state.commonDraft,
      [field]: value,
    };
  }

  if (field === "title") {
    return {
      ...state,
      commonDraft,
    };
  }

  const targetDrafts: Record<string, ProviderPublishDraft> = {};
  for (const [targetId, draft] of Object.entries(state.targetDrafts)) {
    if (field === "excerpt") {
      if (typeof value !== "string") {
        throw new Error("Batch publish common draft field 'excerpt' requires string value");
      }
      targetDrafts[targetId] = updateProviderDraftField(draft, { field: "excerpt", value });
      continue;
    }

    if (!Array.isArray(value)) {
      throw new Error("Batch publish common draft field 'tags' requires string array value");
    }
    targetDrafts[targetId] = updateProviderDraftField(draft, { field: "tags", value });
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
