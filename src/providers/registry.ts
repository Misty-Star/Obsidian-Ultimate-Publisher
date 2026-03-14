import { App } from "obsidian";
import { PublisherProvider } from "../core/providers";
import { PublishTargetConfig } from "../types";
import { LocalExportProvider } from "./localExportProvider";
import { WordpressProvider } from "./wordpressProvider";
import { YuqueProvider } from "./yuqueProvider";

export class ProviderRegistry {
  private readonly wordpress: WordpressProvider;
  private readonly yuque = new YuqueProvider();
  private readonly localExport: LocalExportProvider;

  constructor(app: App) {
    this.wordpress = new WordpressProvider(app);
    this.localExport = new LocalExportProvider(app);
  }

  get(target: PublishTargetConfig): PublisherProvider {
    switch (target.provider) {
      case "wordpress":
        return this.wordpress;
      case "yuque":
        return this.yuque;
      case "local-export":
        return this.localExport;
      default:
        throw new Error(`Unsupported provider: ${(target as PublishTargetConfig).provider}`);
    }
  }
}
