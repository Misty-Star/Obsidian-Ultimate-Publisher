import { MarkdownView, Menu, MenuItem, Notice, Plugin, TFile } from "obsidian";
import { PublishService } from "./core/publishService";
import { PublishWorkflow } from "./core/publishWorkflow";
import { createI18nFromObsidianLanguage, Translator } from "./i18n";
import { ProviderRegistry } from "./providers/registry";
import { cloneTarget, DEFAULT_SETTINGS, normalizeLlmSettings, normalizeTarget } from "./settings";
import {
  LlmSettings,
  isProviderId,
  PublishRecord,
  PublishTargetConfig,
  UltimatePublisherSettings,
} from "./types";
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
  overlap?: boolean;
  left?: boolean;
}

interface MenuItemWithSubmenu extends MenuItem {
  setSubmenu(): Menu;
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLoadedTarget(target: unknown): PublishTargetConfig | null {
  if (
    !isRecordLike(target) ||
    typeof target.id !== "string" ||
    typeof target.name !== "string" ||
    !isProviderId(target.provider)
  ) {
    return null;
  }

  return normalizeTarget(target as unknown as PublishTargetConfig);
}

function normalizeLoadedRecord(record: unknown, targetIds: Set<string>): PublishRecord | null {
  if (
    !isRecordLike(record) ||
    typeof record.notePath !== "string" ||
    !isProviderId(record.provider) ||
    typeof record.targetId !== "string" ||
    typeof record.remoteId !== "string" ||
    typeof record.lastPublishedAt !== "string" ||
    typeof record.contentHash !== "string"
  ) {
    return null;
  }

  if (!targetIds.has(record.targetId)) {
    return null;
  }

  return {
    notePath: record.notePath,
    provider: record.provider,
    targetId: record.targetId,
    remoteId: record.remoteId,
    remoteUrl: typeof record.remoteUrl === "string" ? record.remoteUrl : undefined,
    lastPublishedAt: record.lastPublishedAt,
    contentHash: record.contentHash,
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
    const rawTargets = Array.isArray(loaded?.targets) ? loaded.targets : [];
    const targets = rawTargets
      .map((target) => normalizeLoadedTarget(target))
      .filter((target): target is PublishTargetConfig => target !== null);
    const targetIds = new Set(targets.map((target) => target.id));
    const rawRecords = Array.isArray(loaded?.records) ? loaded.records : [];
    const records = rawRecords
      .map((record) => normalizeLoadedRecord(record, targetIds))
      .filter((record): record is PublishRecord => record !== null);

    const nextSettings: UltimatePublisherSettings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      targets,
      records,
      llm: normalizeLlmSettings(loaded?.llm),
    };

    this.settings = nextSettings;

    const targetCountChanged = rawTargets.length !== targets.length;
    const recordCountChanged = rawRecords.length !== records.length;
    const llmChanged = JSON.stringify(loaded?.llm ?? null) !== JSON.stringify(nextSettings.llm);
    if (loaded && (targetCountChanged || recordCountChanged || llmChanged)) {
      await this.saveSettings();
    }
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

  async updateLlmSettings(updater: (settings: LlmSettings) => void): Promise<void> {
    const draft = normalizeLlmSettings(this.settings.llm);
    updater(draft);
    this.settings = {
      ...this.settings,
      llm: normalizeLlmSettings(draft),
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

  private showPublisherMenu(
    items: PublisherMenuItem[],
    position: MenuPosition,
  ): Menu {
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
          const submenu = (menuItem as MenuItemWithSubmenu).setSubmenu();
          this.populateSubmenu(submenu, item.children);
          return;
        }

        menuItem.onClick(() => this.handleMenuItem(item));
      });
    }

    const doc = this.getMenuDocument();
    if (doc) {
      menu.showAtPosition(position, doc);
    } else {
      menu.showAtPosition(position);
    }

    return menu;
  }

  private populateSubmenu(submenu: Menu, children: PublisherMenuItem[]): void {
    for (const child of children) {
      submenu.addItem((menuItem) => {
        menuItem
          .setTitle(child.title)
          .setIcon(child.icon)
          .setSection(child.section)
          .setDisabled(Boolean(child.disabled));

        if (child.disabled) {
          return;
        }

        if (child.children?.length) {
          const nested = (menuItem as MenuItemWithSubmenu).setSubmenu();
          this.populateSubmenu(nested, child.children);
          return;
        }

        menuItem.onClick(() => this.handleMenuItem(child));
      });
    }
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

  private getMenuDocument(): Document | null {
    return typeof document === "undefined" ? null : document;
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
