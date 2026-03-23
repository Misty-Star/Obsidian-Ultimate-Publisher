import { PluginSettingTab } from "obsidian";
import UltimatePublisherPlugin from "../plugin";
import { mountSettingsView, MountedSettingsView } from "./settings/renderSettingsRoot";

export class UltimatePublisherSettingTab extends PluginSettingTab {
  private mountedView: MountedSettingsView | null = null;

  constructor(private readonly plugin: UltimatePublisherPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    this.mountedView?.destroy();

    const { containerEl } = this;
    containerEl.empty();

    const host = containerEl.createDiv({ cls: "ultimate-publisher-settings-shell" });
    this.mountedView = mountSettingsView(host as unknown as HTMLElement, {
      plugin: this.plugin,
      settings: this.plugin.settings,
      requestRefresh: () => this.display(),
    });
  }
}
