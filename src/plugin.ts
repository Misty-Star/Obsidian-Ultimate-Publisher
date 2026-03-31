import { MarkdownView, Menu, Notice, Plugin, TFile } from "obsidian";
import { PublishService } from "./core/publishService";
import { PublishWorkflow } from "./core/publishWorkflow";
import { createI18nFromObsidianLanguage, Translator } from "./i18n";
import { ProviderRegistry } from "./providers/registry";
import { cloneTarget, DEFAULT_SETTINGS, normalizeTarget } from "./settings";
import {
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

interface HoverMenuParentBridge {
  cancelClose: () => void;
  scheduleClose: () => void;
  notifyHidden: (menu: Menu) => void;
}

type HoverTimer = ReturnType<typeof setTimeout> | null;

interface RectAnchor {
  getBoundingClientRect(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
  };
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
    };

    this.settings = nextSettings;

    const targetCountChanged = rawTargets.length !== targets.length;
    const recordCountChanged = rawRecords.length !== records.length;
    if (loaded && (targetCountChanged || recordCountChanged)) {
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
    parentBridge?: HoverMenuParentBridge,
  ): Menu {
    const HOVER_OPEN_DELAY = 250;
    const HOVER_CLOSE_DELAY = 300;

    let openTimer: HoverTimer = null;
    let closeTimer: HoverTimer = null;
    let activeSubmenu: Menu | null = null;
    let activeSection: string | null = null;

    const menu = new Menu();
    menu.setUseNativeMenu(false);
    const doc = this.getMenuDocument();
    const existingMenus = doc ? Array.from(doc.querySelectorAll(".menu")) : [];

    const clearOpenTimer = () => {
      if (openTimer === null) {
        return;
      }

      clearTimeout(openTimer);
      openTimer = null;
    };

    const clearCloseTimer = () => {
      if (closeTimer === null) {
        return;
      }

      clearTimeout(closeTimer);
      closeTimer = null;
    };

    const closeActiveSubmenu = () => {
      if (!activeSubmenu) {
        return;
      }

      const submenu = activeSubmenu;
      activeSubmenu = null;
      activeSection = null;
      submenu.hide();
    };

    const scheduleClose = () => {
      clearCloseTimer();
      if (!activeSubmenu) {
        return;
      }

      closeTimer = setTimeout(() => {
        closeTimer = null;
        closeActiveSubmenu();
      }, HOVER_CLOSE_DELAY);
    };

    const openSubmenu = (item: PublisherMenuItem, submenuPosition: MenuPosition) => {
      clearOpenTimer();
      clearCloseTimer();

      if (!item.children?.length) {
        return null;
      }

      if (activeSubmenu && activeSection === item.section) {
        return activeSubmenu;
      }

      closeActiveSubmenu();
      activeSection = item.section;
      activeSubmenu = this.showPublisherMenu(item.children, submenuPosition, {
        cancelClose: clearCloseTimer,
        scheduleClose,
        notifyHidden: (hiddenMenu) => {
          if (activeSubmenu === hiddenMenu) {
            activeSubmenu = null;
            activeSection = null;
          }
        },
      });

      return activeSubmenu;
    };

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
            clearOpenTimer();
            clearCloseTimer();

            if (activeSubmenu && activeSection === item.section) {
              closeActiveSubmenu();
              return;
            }

            openSubmenu(item, this.getChildMenuPosition(event));
          });
          return;
        }

        menuItem.onClick(() => this.handleMenuItem(item));
      });
    }

    if (doc) {
      menu.showAtPosition(position, doc);
    } else {
      menu.showAtPosition(position);
    }

    menu.onHide(() => {
      clearOpenTimer();
      clearCloseTimer();
      closeActiveSubmenu();
      parentBridge?.notifyHidden(menu);
    });

    if (doc) {
      setTimeout(() => {
        const menuEl = this.findLatestMenuElement(doc, existingMenus);
        if (!menuEl) {
          return;
        }

        menuEl.addEventListener("mouseenter", () => {
          clearCloseTimer();
          parentBridge?.cancelClose();
        });

        menuEl.addEventListener("mouseleave", () => {
          if (activeSubmenu) {
            scheduleClose();
          }
          parentBridge?.scheduleClose();
        });

        items.forEach((item) => {
          if (!item.children?.length) {
            return;
          }

          const menuItemEl = this.findMenuItemElement(menuEl, item);
          if (!menuItemEl) {
            return;
          }

          menuItemEl.addEventListener("mouseenter", () => {
            clearCloseTimer();

            if (activeSubmenu && activeSection === item.section) {
              return;
            }

            clearOpenTimer();
            openTimer = setTimeout(() => {
              openTimer = null;
              openSubmenu(item, this.getSubmenuPositionForElement(menuItemEl));
            }, HOVER_OPEN_DELAY);
          });

          menuItemEl.addEventListener("mouseleave", () => {
            clearOpenTimer();
            if (activeSubmenu && activeSection === item.section) {
              scheduleClose();
            }
          });
        });
      }, 0);
    }

    return menu;
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

    return this.getSubmenuPositionForElement(anchor);
  }

  private resolveRectAnchor(value: unknown): RectAnchor | null {
    if (!value || typeof value !== "object" || !("getBoundingClientRect" in value)) {
      return null;
    }

    const candidate = value as Partial<RectAnchor>;
    return typeof candidate.getBoundingClientRect === "function" ? (candidate as RectAnchor) : null;
  }

  private getSubmenuPositionForElement(anchor: RectAnchor): MenuPosition {
    const rect = anchor.getBoundingClientRect();
    const parentMenu = this.findContainingMenuElement(anchor);
    const parentMenuRect = parentMenu?.getBoundingClientRect();

    return {
      x: parentMenuRect?.left ?? rect.left,
      y: rect.top,
      width: parentMenuRect?.width ?? rect.width,
    };
  }

  private findContainingMenuElement(value: unknown): RectAnchor | null {
    let current = this.resolveParentElement(value);

    while (current) {
      if (this.elementHasClass(current, "menu")) {
        return this.resolveRectAnchor(current);
      }
      current = this.resolveParentElement(current);
    }

    return null;
  }

  private resolveParentElement(value: unknown): unknown {
    if (!value || typeof value !== "object" || !("parentElement" in value)) {
      return null;
    }

    return (value as { parentElement?: unknown }).parentElement ?? null;
  }

  private elementHasClass(value: unknown, className: string): boolean {
    if (!value || typeof value !== "object" || !("className" in value)) {
      return false;
    }

    const currentClassName = (value as { className?: unknown }).className;
    return typeof currentClassName === "string" && currentClassName.split(/\s+/).includes(className);
  }

  private getMenuDocument(): Document | null {
    return typeof document === "undefined" ? null : document;
  }

  private findLatestMenuElement(doc: Document, existingMenus: Element[]): HTMLElement | null {
    const currentMenus = Array.from(doc.querySelectorAll(".menu"));
    return (currentMenus.find((menuEl) => !existingMenus.includes(menuEl)) ??
      currentMenus[currentMenus.length - 1] ??
      null) as HTMLElement | null;
  }

  private findMenuItemElement(menuEl: HTMLElement, item: PublisherMenuItem): HTMLElement | null {
    const escapedSection = this.escapeAttributeSelectorValue(item.section);
    const escapedTitle = this.escapeAttributeSelectorValue(item.title);

    return (menuEl.querySelector(`[data-section="${escapedSection}"][aria-label="${escapedTitle}"]`) ??
      menuEl.querySelector(`[data-section="${escapedSection}"]`) ??
      menuEl.querySelector(`.menu-item[aria-label="${escapedTitle}"]`) ??
      null) as HTMLElement | null;
  }

  private escapeAttributeSelectorValue(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
