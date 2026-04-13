import { ProviderRegistry } from "../../providers/registry";
import { getProviderDefinition } from "../../providers/definitions";
import { PublishTargetConfig } from "../../types";
import { ProviderRemoteOptions } from "../providers";
import { NormalPublishSessionState, ProviderRemoteOptionsState } from "./types";

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

  const definition = getProviderDefinition(target.provider);
  if (definition.skipNormalPublishOptionsLoad) {
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
          definition.getManualFallbackFields?.(target as never) ?? []
        ),
      },
    };
  }
}
