import { describe, expect, it, vi } from "vitest";
import { PROVIDER_OPTION_CACHE_TTL_MS, loadJuejinOptionSnapshot } from "../src/core/providerOptionCache";
import { createJuejinTarget, EMPTY_PROVIDER_OPTION_CACHE } from "../src/settings";
import type { ProviderOptionCache, JuejinProviderOptionCacheEntry, JuejinTargetConfig } from "../src/types";

const TARGET_ID = "juejin-cache-target";
const OTHER_TARGET_ID = "juejin-cache-target-other";

function buildTarget(): JuejinTargetConfig {
  return {
    ...createJuejinTarget(),
    id: TARGET_ID,
  };
}

function buildCache(entry: JuejinProviderOptionCacheEntry): ProviderOptionCache {
  return {
    juejinByTargetId: {
      [TARGET_ID]: entry,
    },
  };
}

function buildCacheWithOtherEntry(): { cache: ProviderOptionCache; otherEntry: JuejinProviderOptionCacheEntry } {
  const otherEntry = buildEntry(new Date(1000).toISOString());
  return {
    cache: {
      juejinByTargetId: {
        [OTHER_TARGET_ID]: otherEntry,
      },
    },
    otherEntry,
  };
}

function buildEntry(fetchedAt: string): JuejinProviderOptionCacheEntry {
  return {
    fetchedAt,
    categories: [
      {
        id: "cache-category",
        label: "缓存分类",
      },
    ],
    tags: [
      {
        id: "cache-tag",
        label: "缓存标签",
      },
    ],
  };
}

function buildRemoteOptions() {
  return {
    juejinCategories: [
      {
        id: "network-category",
        label: "网络分类",
        description: "来自网络",
      },
    ],
    juejinTags: [
      {
        id: "network-tag",
        label: "网络标签",
      },
    ],
  };
}

describe("loadJuejinOptionSnapshot", () => {
  it("returns cache when entry is still fresh", async () => {
    const target = buildTarget();
    const entry = buildEntry(new Date(0).toISOString());
    const cache = buildCache(entry);
    const loader = vi.fn().mockResolvedValue(buildRemoteOptions());

    const snapshot = await loadJuejinOptionSnapshot({
      target,
      targetId: target.id,
      providerOptionCache: cache,
      loadNormalPublishOptions: loader,
      nowMs: Date.parse(entry.fetchedAt) + PROVIDER_OPTION_CACHE_TTL_MS / 2,
    });

    expect(snapshot.source).toBe("cache");
    expect(snapshot.categories).toEqual(entry.categories);
    expect(snapshot.tags).toEqual(entry.tags);
    expect(snapshot.nextCache.juejinByTargetId[target.id]?.fetchedAt).toBe(entry.fetchedAt);
    expect(snapshot.nextCache.juejinByTargetId[target.id]?.categories).toEqual(entry.categories);
    expect(snapshot.nextCache.juejinByTargetId[target.id]?.tags).toEqual(entry.tags);
    expect(loader).not.toHaveBeenCalled();
  });

  it("reloads when cache expired", async () => {
    const target = buildTarget();
    const entry = buildEntry(new Date(0).toISOString());
    const cache = buildCache(entry);
    const remote = buildRemoteOptions();
    const loader = vi.fn().mockResolvedValue(remote);
    const nowMs = PROVIDER_OPTION_CACHE_TTL_MS + 1000;

    const snapshot = await loadJuejinOptionSnapshot({
      target,
      targetId: target.id,
      providerOptionCache: cache,
      loadNormalPublishOptions: loader,
      nowMs,
    });

    expect(snapshot.source).toBe("network");
    expect(snapshot.categories).toEqual(remote.juejinCategories);
    expect(snapshot.tags).toEqual(remote.juejinTags);
    expect(snapshot.nextCache.juejinByTargetId[target.id]).toEqual({
      fetchedAt: new Date(nowMs).toISOString(),
      categories: remote.juejinCategories,
      tags: remote.juejinTags,
    });
    expect(loader).toHaveBeenCalledWith(target);
  });

  it("falls back to stale cache when refresh fails", async () => {
    const target = buildTarget();
    const entry = buildEntry(new Date(0).toISOString());
    const cache = buildCache(entry);
    const loader = vi.fn().mockRejectedValue(new Error("boom"));

    const snapshot = await loadJuejinOptionSnapshot({
      target,
      targetId: target.id,
      providerOptionCache: cache,
      loadNormalPublishOptions: loader,
      nowMs: PROVIDER_OPTION_CACHE_TTL_MS + 1000,
    });

    expect(snapshot.source).toBe("stale-cache");
    expect(snapshot.categories).toEqual(entry.categories);
    expect(snapshot.tags).toEqual(entry.tags);
    expect(snapshot.nextCache.juejinByTargetId[target.id]?.fetchedAt).toBe(entry.fetchedAt);
    expect(snapshot.nextCache.juejinByTargetId[target.id]?.categories).toEqual(entry.categories);
    expect(snapshot.nextCache.juejinByTargetId[target.id]?.tags).toEqual(entry.tags);
    expect(loader).toHaveBeenCalled();
  });

  it("reports unavailable when no cache and refresh fails", async () => {
    const target = buildTarget();
    const loader = vi.fn().mockRejectedValue(new Error("boom"));

    const snapshot = await loadJuejinOptionSnapshot({
      target,
      targetId: target.id,
      loadNormalPublishOptions: loader,
      nowMs: 0,
    });

    expect(snapshot.source).toBe("unavailable");
    expect(snapshot.categories).toEqual([]);
    expect(snapshot.tags).toEqual([]);
    expect(snapshot.nextCache).toEqual(EMPTY_PROVIDER_OPTION_CACHE);
    expect(loader).toHaveBeenCalled();
  });

  it("keeps unrelated caches when unavailable after refresh failure", async () => {
    const target = buildTarget();
    const { cache, otherEntry } = buildCacheWithOtherEntry();
    const loader = vi.fn().mockRejectedValue(new Error("boom"));

    const snapshot = await loadJuejinOptionSnapshot({
      target,
      targetId: target.id,
      providerOptionCache: cache,
      loadNormalPublishOptions: loader,
      nowMs: 0,
    });

    expect(snapshot.source).toBe("unavailable");
    expect(snapshot.nextCache.juejinByTargetId[OTHER_TARGET_ID]).toEqual(otherEntry);
  });

  it("treats TTL boundary as expired and reloads", async () => {
    const target = buildTarget();
    const entry = buildEntry(new Date(0).toISOString());
    const cache = buildCache(entry);
    const remote = buildRemoteOptions();
    const loader = vi.fn().mockResolvedValue(remote);
    const nowMs = PROVIDER_OPTION_CACHE_TTL_MS;

    const snapshot = await loadJuejinOptionSnapshot({
      target,
      targetId: target.id,
      providerOptionCache: cache,
      loadNormalPublishOptions: loader,
      nowMs,
    });

    expect(snapshot.source).toBe("network");
    expect(snapshot.categories).toEqual(remote.juejinCategories);
    expect(snapshot.tags).toEqual(remote.juejinTags);
    expect(snapshot.nextCache.juejinByTargetId[target.id]).toEqual({
      fetchedAt: new Date(nowMs).toISOString(),
      categories: remote.juejinCategories,
      tags: remote.juejinTags,
    });
  });
});
