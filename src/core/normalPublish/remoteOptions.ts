import { ProviderRegistry } from "../../providers/registry";
import { PublishTargetConfig } from "../../types";
import { ProviderRemoteOptions } from "../providers";
import { NormalPublishSessionState, ProviderRemoteOptionsState } from "./types";

function getManualFallbackFields(target: PublishTargetConfig): string[] {
  switch (target.provider) {
    case "wordpress":
      return ["categories", "tags"];
    case "csdn":
      return ["categories", "tags"];
    case "juejin":
      return ["categoryId", "tagIds"];
    default:
      return [];
  }
}

function buildRemoteOptionsState(
  status: ProviderRemoteOptionsState["status"],
  data: ProviderRemoteOptions,
  errorMessage?: string,
  manualFallbackFields: string[] = []
): ProviderRemoteOptionsState {
  return {
    status,
    data: data as Record<string, unknown>,
    errorMessage,
    manualFallbackFields,
  };
}

export async function ensureRemoteOptionsLoaded(
  state: NormalPublishSessionState,
  target: PublishTargetConfig,
  registry: ProviderRegistry
): Promise<NormalPublishSessionState> {
  const currentState = state.remoteOptions[target.id];
  if (currentState?.status === "loaded") {
    return state;
  }

  if (target.provider === "zhihu") {
    return {
      ...state,
      remoteOptions: {
        ...state.remoteOptions,
        [target.id]: buildRemoteOptionsState("loaded", {}),
      },
    };
  }

  const provider = registry.get(target);
  if (!provider.loadNormalPublishOptions) {
    return {
      ...state,
      remoteOptions: {
        ...state.remoteOptions,
        [target.id]: buildRemoteOptionsState("loaded", {}),
      },
    };
  }

  try {
    const data = await provider.loadNormalPublishOptions(target as never);
    return {
      ...state,
      remoteOptions: {
        ...state.remoteOptions,
        [target.id]: buildRemoteOptionsState("loaded", data),
      },
    };
  } catch (error) {
    return {
      ...state,
      remoteOptions: {
        ...state.remoteOptions,
        [target.id]: buildRemoteOptionsState(
          "error",
          {},
          error instanceof Error ? error.message : String(error),
          getManualFallbackFields(target)
        ),
      },
    };
  }
}
