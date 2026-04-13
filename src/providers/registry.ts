import { App } from "obsidian";
import { PublisherProvider } from "../core/providers";
import { ProviderId, PublishTargetConfig } from "../types";
import { getProviderDefinition } from "./definitions";

export class ProviderRegistry {
  private readonly providers = new Map<ProviderId, PublisherProvider>();

  constructor(private readonly app: App) {}

  get(target: PublishTargetConfig): PublisherProvider {
    const cached = this.providers.get(target.provider);
    if (cached) {
      return cached;
    }

    const provider = getProviderDefinition(target.provider).createProvider(this.app);
    this.providers.set(target.provider, provider);
    return provider;
  }
}
