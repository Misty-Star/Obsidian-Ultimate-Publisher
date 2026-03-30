import { ProviderPublishDraft, ProviderRemoteOptionsState } from "../normalPublish/types";
import { PublishAction } from "../publishWorkflow";

export type BatchPublishStep = 1 | 2 | 3;

export type BatchPublishExecutionStatus = "idle" | "running" | "completed";

export type BatchPublishRowStatus = "waiting" | "running" | "success" | "failure";

export interface BatchPublishCommonDraft {
  title: string;
  tags: string[];
  excerpt: string;
}

export interface BatchPublishExecutionRow {
  targetId: string;
  targetName: string;
  action: PublishAction;
  status: BatchPublishRowStatus;
  remoteUrl?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface BatchPublishExecutionState {
  status: BatchPublishExecutionStatus;
  currentIndex: number;
  runningInBackground: boolean;
  results: BatchPublishExecutionRow[];
}

export interface BatchPublishWizardState {
  step: BatchPublishStep;
  selectedTargetIds: Set<string>;
  commonDraft: BatchPublishCommonDraft;
  targetDrafts: Record<string, ProviderPublishDraft>;
  remoteOptions: Record<string, ProviderRemoteOptionsState>;
  validationErrors: Record<string, string | null>;
  executionState: BatchPublishExecutionState;
}
