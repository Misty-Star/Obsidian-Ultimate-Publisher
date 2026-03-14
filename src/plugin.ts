import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { PublishService } from "./core/publishService";
import { ProviderRegistry } from "./providers/registry";
import { cloneTarget, DEFAULT_SETTINGS, normalizeTarget } from "./settings";
import { PublishTargetConfig, UltimatePublisherSettings } from "./types";
import { PublishTargetModal } from "./ui/PublishTargetModal";
import { UltimatePublisherSettingTab } from "./ui/UltimatePublisherSettingTab";

export default class UltimatePublisherPlugin extends Plugin {
  settings: UltimatePublisherSettings = DEFAULT_SETTINGS;
  private publishService!: PublishService;

  async onload(): Promise<void> {
    await this.loadSettings();
    const providers = new ProviderRegistry(this.app);
    this.publishService = new PublishService(this.app, providers);

    this.addRibbonIcon("upload", "Publish active note", () => {
      void this.publishActiveNote();
    });

    this.addCommand({
      id: "publish-active-note",
      name: "Publish active note",
      callback: () => {
        void this.publishActiveNote();
      },
    });

    this.addSettingTab(new UltimatePublisherSettingTab(this));
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<UltimatePublisherSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      targets: (loaded?.targets ?? []).map((target) => normalizeTarget(target)),
      records: loaded?.records ?? [],
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async addTarget(target: PublishTargetConfig): Promise<void> {
    this.settings = {
      ...this.settings,
      targets: [...this.settings.targets, normalizeTarget(cloneTarget(target))],
    };
    await this.saveSettings();
  }

  async updateTarget(targetId: string, updater: (target: PublishTargetConfig) => void): Promise<void> {
    this.settings = {
      ...this.settings,
      targets: this.settings.targets.map((target) => {
        if (target.id !== targetId) {
          return target;
        }
        const draft = normalizeTarget(cloneTarget(target));
        updater(draft);
        return normalizeTarget(draft);
      }),
    };
    await this.saveSettings();
  }

  async removeTarget(targetId: string): Promise<void> {
    this.settings = {
      ...this.settings,
      targets: this.settings.targets.filter((target) => target.id !== targetId),
      records: this.settings.records.filter((record) => record.targetId !== targetId),
    };
    await this.saveSettings();
  }

  private getEnabledTargets(): PublishTargetConfig[] {
    return this.settings.targets.filter((target) => target.enabled);
  }

  private getActiveMarkdownFile(): TFile | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const file = view?.file ?? this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.extension !== "md") {
      return null;
    }
    return file;
  }

  async publishActiveNote(): Promise<void> {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice("Open a Markdown note before publishing.");
      return;
    }

    const targets = this.getEnabledTargets();
    if (targets.length === 0) {
      new Notice("Configure at least one enabled publish target first.");
      return;
    }

    if (targets.length === 1) {
      await this.publishToTarget(file, targets[0]);
      return;
    }

    new PublishTargetModal(this.app, targets, (target) => {
      void this.publishToTarget(file, target);
    }).open();
  }

  private async publishToTarget(file: TFile, target: PublishTargetConfig): Promise<void> {
    new Notice(`Publishing "${file.basename}" to ${target.name}...`);
    try {
      const result = await this.publishService.publishFile(file, target, this.settings);
      this.settings = this.publishService.updateSettings(this.settings, result.record);
      await this.saveSettings();
      const action = result.created ? "created" : "updated";
      new Notice(`Publish succeeded: ${target.name} ${action}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Publish failed: ${message}`, 8000);
      throw error;
    }
  }
}
