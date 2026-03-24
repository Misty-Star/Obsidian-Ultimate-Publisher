import { App } from "obsidian";
import { PublisherProvider } from "../core/providers";
import { PublishTargetConfig } from "../types";
import { LocalExportProvider } from "./localExportProvider";
import { WordpressProvider } from "./wordpressProvider";
import { YuqueProvider } from "./yuqueProvider";
import { CsdnProvider } from "./csdnProvider";
import { JuejinProvider } from "./juejinProvider";
import { ZhihuProvider } from "./zhihuProvider";

export class ProviderRegistry {
  private readonly wordpress: WordpressProvider;
  private readonly yuque = new YuqueProvider();
  private readonly localExport: LocalExportProvider;
  private readonly csdn: CsdnProvider;
  private readonly juejin = new JuejinProvider();
  private readonly zhihu: ZhihuProvider;

  constructor(app: App) {
    this.wordpress = new WordpressProvider(app);
    this.localExport = new LocalExportProvider(app);
    this.csdn = new CsdnProvider(app);
    this.zhihu = new ZhihuProvider(app);
  }

  get(target: PublishTargetConfig): PublisherProvider {
    switch (target.provider) {
      case "wordpress":
        return this.wordpress;
      case "yuque":
        return this.yuque;
      case "local-export":
        return this.localExport;
      case "csdn":
        return this.csdn;
      case "juejin":
        return this.juejin;
      case "zhihu":
        return this.zhihu;
      default:
        throw new Error(`Unsupported provider: ${(target as PublishTargetConfig).provider}`);
    }
  }
}
