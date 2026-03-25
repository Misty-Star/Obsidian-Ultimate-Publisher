import { MarkdownView, Menu, Notice, Plugin, TFile } from "obsidian";
import { PublishService } from "./core/publishService";
import { PublishWorkflow } from "./core/publishWorkflow";
import { createI18nFromObsidianLanguage, Translator } from "./i18n";
import { ProviderRegistry } from "./providers/registry";
import { cloneTarget, DEFAULT_SETTINGS, normalizeTarget } from "./settings";
import { PublishTargetConfig, UltimatePublisherSettings } from "./types";
import { PublishTargetModal } from "./ui/PublishTargetModal";
import { UltimatePublisherSettingTab } from "./ui/UltimatePublisherSettingTab";
import { BatchPublishModal } from "./ui/modals/BatchPublishModal";
import { NormalPublishModal } from "./ui/modals/NormalPublishModal";
import { buildPublisherMenuModel, PublisherMenuItem } from "./ui/publisherMenu";
import {
  PUBLISHER_DASHBOARD_VIEW_TYPE,
  PublisherDashboardView,
} from "./ui/views/PublisherDashboardView";

interface AppSettingsController {
  open(): void;
  openTabById(id: string): void;
}

interface AppWithSettings {
  setting?: AppSettingsController;
}

interface MenuPosition {
  x: number;
  y: number;
  width?: number;
}

interface RectAnchor {
  getBoundingClientRect(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
  };
}

export default class UltimatePublisherPlugin extends Plugin {
  settings: UltimatePublisherSettings = DEFAULT_SETTINGS;
  private publishService!: PublishService;
  private publishWorkflow!: PublishWorkflow;
  private i18n: Translator = createI18nFromObsidianLanguage();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.i18n = createI18nFromObsidianLanguage();

    const providers = new ProviderRegistry(this.app);
    this.publishService = new PublishService(this.app, providers);
    this.publishWorkflow = new PublishWorkflow(this.publishService);

    this.registerView(PUBLISHER_DASHBOARD_VIEW_TYPE, (leaf) => new PublisherDashboardView(leaf, this));

    this.addRibbonIcon("upload", this.i18n.t("menu.publish"), (event) => {
      const anchorEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
      this.openRibbonMenu(anchorEl);
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

  openRibbonMenu(anchorEl: HTMLElement | null): void {
    const activeFile = this.getActiveMarkdownFile();
    const menuModel = buildPublisherMenuModel({
      hasActiveMarkdown: Boolean(activeFile),
      enabledTargets: this.getEnabledTargets().map(({ id, name, provider }) => ({
        id,
        name,
        provider,
      })),
    }, this.i18n);

    this.showPublisherMenu(menuModel, this.getRootMenuPosition(anchorEl));
  }

  async openDashboard(): Promise<void> {
    const existingLeaf = this.app.workspace.getLeavesOfType(PUBLISHER_DASHBOARD_VIEW_TYPE)[0];
    const leaf = existingLeaf ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice(this.i18n.t("notice.dashboard.openFailed"));
      return;
    }

    await leaf.setViewState({
      type: PUBLISHER_DASHBOARD_VIEW_TYPE,
      active: true,
    });
    await this.app.workspace.revealLeaf(leaf);

    if (leaf.view instanceof PublisherDashboardView) {
      await leaf.view.render();
    }
  }

  openNormalPublishForActiveNote(): void {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice(this.i18n.t("notice.publish.noActiveMarkdown"));
      return;
    }

    new NormalPublishModal(this, file, this.publishWorkflow).open();
  }

  openBatchPublishForActiveNote(): void {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice(this.i18n.t("notice.publish.noActiveMarkdown"));
      return;
    }

    new BatchPublishModal(this, file, this.publishWorkflow).open();
  }

  async runQuickPublishForTarget(targetId: string): Promise<void> {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice(this.i18n.t("notice.publish.noActiveMarkdown"));
      return;
    }

    const target = this.getEnabledTargets().find((item) => item.id === targetId);
    if (!target) {
      new Notice(this.i18n.t("notice.quickPublish.targetUnavailable"), 6000);
      return;
    }

    await this.publishToTarget(file, target);
  }

  openPublishSettings(): void {
    const appWithSettings = this.app as typeof this.app & AppWithSettings;
    appWithSettings.setting?.open();
    appWithSettings.setting?.openTabById(this.manifest.id);
  }

  async publishActiveNote(): Promise<void> {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice(this.i18n.t("notice.publish.noActiveMarkdown"));
      return;
    }

    const targets = this.getEnabledTargets();
    if (targets.length === 0) {
      new Notice(this.i18n.t("notice.publish.noEnabledTargets"));
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

  private showPublisherMenu(items: PublisherMenuItem[], position: MenuPosition): void {
    const menu = new Menu();
    menu.setUseNativeMenu(false);

    for (const item of items) {
      menu.addItem((menuItem) => {
        menuItem
          .setTitle(item.title)
          .setIcon(item.icon)
          .setSection(item.section)
          .setDisabled(Boolean(item.disabled));

        if (item.disabled) {
          return;
        }

        if (item.children?.length) {
          menuItem.onClick((event) => {
            this.showPublisherMenu(item.children ?? [], this.getChildMenuPosition(event));
          });
          return;
        }

        menuItem.onClick(() => this.handleMenuItem(item));
      });
    }

    menu.showAtPosition(position);
  }

  private getRootMenuPosition(anchorEl: HTMLElement | null): MenuPosition {
    if (!anchorEl) {
      return { x: 0, y: 0 };
    }

    const rect = anchorEl.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.bottom,
      width: rect.width,
    };
  }

  private getChildMenuPosition(event: MouseEvent | KeyboardEvent | undefined): MenuPosition {
    const anchor = this.resolveRectAnchor(event?.currentTarget);
    if (!anchor) {
      return { x: 0, y: 0 };
    }

    const rect = anchor.getBoundingClientRect();
    return {
      x: rect.right,
      y: rect.top,
      width: rect.width,
    };
  }

  private resolveRectAnchor(value: unknown): RectAnchor | null {
    if (!value || typeof value !== "object" || !("getBoundingClientRect" in value)) {
      return null;
    }

    const candidate = value as Partial<RectAnchor>;
    return typeof candidate.getBoundingClientRect === "function" ? (candidate as RectAnchor) : null;
  }

  private handleMenuItem(item: PublisherMenuItem): void {
    switch (item.key) {
      case "dashboard":
        void this.openDashboard();
        return;
      case "normal-publish":
        this.openNormalPublishForActiveNote();
        return;
      case "batch-publish":
        this.openBatchPublishForActiveNote();
        return;
      case "publish-settings":
        this.openPublishSettings();
        return;
      case "quick-publish-target":
        if (item.targetId) {
          void this.runQuickPublishForTarget(item.targetId);
        }
        return;
      default:
        return;
    }
  }

  private async publishToTarget(file: TFile, target: PublishTargetConfig): Promise<void> {
    new Notice(this.i18n.t("notice.publish.started", { note: file.basename, target: target.name }));

    try {
      const result = await this.publishWorkflow.runSingle(file, target, this.settings);
      this.settings = result.settings;
      await this.saveSettings();
      const actionLabel =
        result.action === "update"
          ? this.i18n.t("notice.publish.action.updated")
          : this.i18n.t("notice.publish.action.published");
      new Notice(this.i18n.t("notice.publish.succeeded", { target: target.name, action: actionLabel }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(this.i18n.t("notice.publish.failed", { error: message }), 8000);
      throw error;
    }
  }
}
