import type { ProviderRemoteOptions, NormalPublishOptionItem } from "../core/providers";
import { normalizeProviderOptionCache } from "../settings";
import type { CachedProviderOption, ProviderOptionCache, JuejinTargetConfig } from "../types";

export const PROVIDER_OPTION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface JuejinOptionSnapshot {
  source: "cache" | "network" | "stale-cache" | "unavailable";
  categories: CachedProviderOption[];
  tags: CachedProviderOption[];
  nextCache: ProviderOptionCache;
}

export interface LoadJuejinOptionSnapshotArgs {
  targetId: string;
  target: JuejinTargetConfig;
  providerOptionCache?: ProviderOptionCache;
  loadNormalPublishOptions: (target: JuejinTargetConfig) => Promise<ProviderRemoteOptions>;
  nowMs?: number;
}

function toCachedOptions(items?: NormalPublishOptionItem[]): CachedProviderOption[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    id: item.id,
    label: item.label,
    description: typeof item.description === "string" ? item.description : undefined,
  }));
}

export async function loadJuejinOptionSnapshot(
  args: LoadJuejinOptionSnapshotArgs
): Promise<JuejinOptionSnapshot> {
  const nowMs = typeof args.nowMs === "number" ? args.nowMs : Date.now();
  const normalizedCache = normalizeProviderOptionCache(args.providerOptionCache);
  const cachedEntry = normalizedCache.juejinByTargetId[args.targetId];

  if (cachedEntry) {
    const parsedFetchedAt = Date.parse(cachedEntry.fetchedAt);
    const hasFreshCache = !Number.isNaN(parsedFetchedAt) && nowMs - parsedFetchedAt < PROVIDER_OPTION_CACHE_TTL_MS;
    if (hasFreshCache) {
      return {
        source: "cache",
        categories: cachedEntry.categories,
        tags: cachedEntry.tags,
        nextCache: normalizedCache,
      };
    }
  }

  try {
    const remoteOptions = await args.loadNormalPublishOptions(args.target);
    const categories = toCachedOptions(remoteOptions.juejinCategories);
    const tags = toCachedOptions(remoteOptions.juejinTags);
    const nextCache: ProviderOptionCache = {
      ...normalizedCache,
      juejinByTargetId: {
        ...normalizedCache.juejinByTargetId,
        [args.targetId]: {
          fetchedAt: new Date(nowMs).toISOString(),
          categories,
          tags,
        },
      },
    };

    return {
      source: "network",
      categories,
      tags,
      nextCache,
    };
  } catch {
    if (cachedEntry) {
      return {
        source: "stale-cache",
        categories: cachedEntry.categories,
        tags: cachedEntry.tags,
        nextCache: normalizedCache,
      };
    }

    return {
      source: "unavailable",
      categories: [],
      tags: [],
      nextCache: normalizedCache,
    };
  }
}
