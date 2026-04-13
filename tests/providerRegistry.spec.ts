import { beforeEach, describe, expect, it, vi } from "vitest";

const definitionsMock = vi.hoisted(() => ({
  getProviderDefinition: vi.fn(),
}));

vi.mock("../src/providers/definitions", () => ({
  getProviderDefinition: definitionsMock.getProviderDefinition,
}));

describe("ProviderRegistry", () => {
  beforeEach(() => {
    definitionsMock.getProviderDefinition.mockReset();
  });

  it("creates providers through the matching provider definition and caches them by provider id", async () => {
    const providerInstance = {
      provider: "yuque",
      getMediaSupport: vi.fn(),
      validateConfig: vi.fn(),
      publish: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getPreviewUrl: vi.fn(),
    };
    const createProvider = vi.fn().mockReturnValue(providerInstance);

    definitionsMock.getProviderDefinition.mockReturnValue({
      createProvider,
    });

    const { ProviderRegistry } = await import("../src/providers/registry");
    const registry = new ProviderRegistry({} as never);
    const target = {
      id: "yuque-1",
      name: "Yuque",
      enabled: true,
      provider: "yuque",
      baseUrl: "https://www.yuque.com",
      repo: "docs",
      token: "secret",
      publicLevel: 0,
    } as const;

    const first = registry.get(target as never);
    const second = registry.get({ ...target, id: "yuque-2" } as never);

    expect(first).toBe(providerInstance);
    expect(second).toBe(providerInstance);
    expect(definitionsMock.getProviderDefinition).toHaveBeenCalledWith("yuque");
    expect(createProvider).toHaveBeenCalledTimes(1);
  });
});
