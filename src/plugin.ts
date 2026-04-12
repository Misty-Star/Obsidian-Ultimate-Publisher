import { MarkdownView, Menu, MenuItem, Notice, Plugin, TFile } from "obsidian";
import { buildPublishFrontmatterTemplate, hasLeadingFrontmatter, injectPublishFrontmatter } from "./core/frontmatterTemplate";
import { loadJuejinOptionSnapshot } from "./core/providerOptionCache";
import { buildInitialTargetDraft } from "./core/normalPublish/drafts";
import { NormalPublishExecutionContext, JuejinPublishDraft } from "./core/normalPublish/types";
import { extractPublishableNote, PublishableNote } from "./core/note";
import { PublishService } from "./core/publishService";
import { PublishWorkflow } from "./core/publishWorkflow";
import { getPublishFailureProviderOptionCache, getPublishFailureSettings } from "./core/providers";
import { mergeProviderOptionCacheIntoSettings } from "./core/publishService";
import { resolveJuejinPublishInput } from "./core/webPublishConfig";
import { createI18nFromObsidianLanguage, Translator } from "./i18n";
import { ProviderRegistry } from "./providers/registry";
import {
  cloneTarget,
  DEFAULT_SETTINGS,
  normalizeFrontmatterAutomationSettings,
  normalizeLlmSettings,
  normalizeProviderOptionCache,
  normalizeTarget,
} from "./settings";
import {
  FrontmatterAutomationSettings,
  JuejinTargetConfig,
  LlmSettings,
  ProviderOptionCache,
  isProviderId,
  PublishRecord,
  PublishTargetConfig,
  UltimatePublisherSettings,
} from "./types";
import { PublishTargetModal } from "./ui/PublishTargetModal";
import { UltimatePublisherSettingTab } from "./ui/UltimatePublisherSettingTab";
import { BatchPublishModal } from "./ui/modals/BatchPublishModal";
import { JuejinQuickPublishMetadataModal } from "./ui/modals/JuejinQuickPublishMetadataModal";
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

const FRONTMATTER_INSERTION_DEBOUNCE_MS = 5000;

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
  private providers!: ProviderRegistry;
  private publishService!: PublishService;
  private publishWorkflow!: PublishWorkflow;
  private i18n: Translator = createI18nFromObsidianLanguage();
  private readonly recentFrontmatterInsertions = new Map<string, number>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.i18n = createI18nFromObsidianLanguage();

    this.providers = new ProviderRegistry(this.app);
    this.publishService = new PublishService(this.app, this.providers);
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

    this.addCommand({
      id: "insert-publish-frontmatter-template",
      name: "Insert publish frontmatter template",
      callback: () => {
        void this.insertPublishFrontmatterForActiveNote();
      },
    });

    this.registerEvent(this.app.vault.on?.("create", (file) => {
      if (file instanceof TFile) {
        void this.handleCreatedMarkdownFile(file);
      }
    }) as never);

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
      frontmatterAutomation: normalizeFrontmatterAutomationSettings(loaded?.frontmatterAutomation),
      providerOptionCache: normalizeProviderOptionCache(loaded?.providerOptionCache),
      llm: normalizeLlmSettings(loaded?.llm),
    };

    this.settings = nextSettings;

    const targetCountChanged = rawTargets.length !== targets.length;
    const recordCountChanged = rawRecords.length !== records.length;
    const frontmatterAutomationChanged =
      JSON.stringify(loaded?.frontmatterAutomation ?? null) !== JSON.stringify(nextSettings.frontmatterAutomation);
    const providerOptionCacheChanged =
      JSON.stringify(loaded?.providerOptionCache ?? null) !== JSON.stringify(nextSettings.providerOptionCache);
    const llmChanged = JSON.stringify(loaded?.llm ?? null) !== JSON.stringify(nextSettings.llm);
    if (loaded && (targetCountChanged || recordCountChanged || frontmatterAutomationChanged || providerOptionCacheChanged || llmChanged)) {
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
    const currentCache = normalizeProviderOptionCache(this.settings.providerOptionCache);
    const nextJuejinByTargetId = { ...currentCache.juejinByTargetId };
    delete nextJuejinByTargetId[targetId];
    this.settings = {
      ...this.settings,
      targets: this.settings.targets.filter((target) => target.id !== targetId),
      records: this.settings.records.filter((record) => record.targetId !== targetId),
      providerOptionCache: {
        ...currentCache,
        juejinByTargetId: nextJuejinByTargetId,
      },
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

  async updateFrontmatterAutomationSettings(
    updater: (settings: FrontmatterAutomationSettings) => void
  ): Promise<void> {
    const draft = normalizeFrontmatterAutomationSettings(this.settings.frontmatterAutomation);
    updater(draft);
    this.settings = {
      ...this.settings,
      frontmatterAutomation: normalizeFrontmatterAutomationSettings(draft),
    };
    await this.saveSettings();
  }

  async updateProviderOptionCache(updater: (cache: ProviderOptionCache) => void): Promise<void> {
    const draft = normalizeProviderOptionCache(this.settings.providerOptionCache);
    updater(draft);
    this.settings = {
      ...this.settings,
      providerOptionCache: normalizeProviderOptionCache(draft),
    };
    await this.saveSettings();
  }

  async persistPublishFailureState(error: unknown): Promise<boolean> {
    const failureSettings = getPublishFailureSettings(error);
    if (failureSettings) {
      this.settings = failureSettings;
      await this.saveSettings();
      return true;
    }

    const providerOptionCache = getPublishFailureProviderOptionCache(error);
    if (providerOptionCache) {
      this.settings = mergeProviderOptionCacheIntoSettings(this.settings, providerOptionCache);
      await this.saveSettings();
      return true;
    }

    return false;
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

    let quickPublishContext: NormalPublishExecutionContext | null | undefined;
    try {
      quickPublishContext = await this.resolveQuickPublishContext(file, target);
    } catch (error) {
      await this.persistPublishFailureState(error);
      const message = error instanceof Error ? error.message : String(error);
      new Notice(this.i18n.t("notice.publish.failed", { error: message }), 8000);
      throw error;
    }

    if (quickPublishContext === null) {
      return;
    }

    await this.publishToTarget(file, target, quickPublishContext ?? undefined);
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

  async insertPublishFrontmatterForActiveNote(): Promise<void> {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice(this.i18n.t("notice.frontmatter.noActiveMarkdown"));
      return;
    }

    const result = await this.insertPublishFrontmatterIfNeeded(file);
    if (result === "skipped-existing") {
      new Notice(this.i18n.t("notice.frontmatter.skippedExisting"));
      return;
    }

    if (result === "inserted") {
      new Notice(this.i18n.t("notice.frontmatter.inserted"));
    }
  }

  async handleCreatedMarkdownFile(file: TFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
      return;
    }

    const automationSettings = normalizeFrontmatterAutomationSettings(this.settings.frontmatterAutomation);
    if (!automationSettings.enabled) {
      return;
    }

    const nowMs = Date.now();
    if (this.wasRecentlyInserted(file.path, nowMs)) {
      return;
    }

    await this.insertPublishFrontmatterIfNeeded(file);
  }

  private getEnabledTargets(): PublishTargetConfig[] {
    return this.settings.targets.filter((target) => target.enabled);
  }

  private async insertPublishFrontmatterIfNeeded(file: TFile): Promise<"inserted" | "skipped-existing" | "ignored"> {
    if (file.extension !== "md") {
      return "ignored";
    }

    const initialMarkdown = await this.app.vault.cachedRead(file);
    if (hasLeadingFrontmatter(initialMarkdown)) {
      return "skipped-existing";
    }

    const template = await this.buildFrontmatterTemplateForCurrentSettings();
    const latestMarkdown = await this.app.vault.cachedRead(file);
    if (hasLeadingFrontmatter(latestMarkdown)) {
      return "skipped-existing";
    }

    const nextMarkdown = injectPublishFrontmatter(latestMarkdown, template);
    if (nextMarkdown === latestMarkdown) {
      return "skipped-existing";
    }

    this.recordRecentFrontmatterInsertion(file.path, Date.now());
    await this.app.vault.modify(file, nextMarkdown);
    return "inserted";
  }

  private async buildFrontmatterTemplateForCurrentSettings(): Promise<string> {
    const automationSettings = normalizeFrontmatterAutomationSettings(this.settings.frontmatterAutomation);
    let juejinOptions: {
      categories?: { id: string; label: string; description?: string }[];
      tags?: { id: string; label: string; description?: string }[];
    } | undefined;

    const includeOptionComments = automationSettings.includeOptionComments;
    const target = includeOptionComments ? this.findSingleEnabledJuejinTarget() : null;
    if (target) {
      const provider = this.providers.get(target);
      if (typeof provider.loadNormalPublishOptions === "function") {
        const snapshot = await loadJuejinOptionSnapshot({
          targetId: target.id,
          target,
          providerOptionCache: this.settings.providerOptionCache,
          loadNormalPublishOptions: async (currentTarget) => provider.loadNormalPublishOptions!(currentTarget),
        });
        if (snapshot.source === "network") {
          await this.updateProviderOptionCache((cache) => {
            cache.juejinByTargetId = { ...snapshot.nextCache.juejinByTargetId };
          });
        }
        juejinOptions = {
          categories: snapshot.categories,
          tags: snapshot.tags,
        };
      }
    }

    return buildPublishFrontmatterTemplate({
      targets: this.settings.targets,
      includeOptionComments,
      juejinOptions,
    });
  }

  private findSingleEnabledJuejinTarget(): JuejinTargetConfig | null {
    const enabledJuejinTargets = this.settings.targets.filter(
      (target): target is JuejinTargetConfig => target.enabled && target.provider === "juejin"
    );
    return enabledJuejinTargets.length === 1 ? enabledJuejinTargets[0] : null;
  }

  private wasRecentlyInserted(path: string, nowMs: number): boolean {
    this.pruneRecentFrontmatterInsertions(nowMs);
    const insertedAt = this.recentFrontmatterInsertions.get(path);
    if (typeof insertedAt !== "number") {
      return false;
    }
    return nowMs - insertedAt < FRONTMATTER_INSERTION_DEBOUNCE_MS;
  }

  private recordRecentFrontmatterInsertion(path: string, nowMs: number): void {
    this.recentFrontmatterInsertions.set(path, nowMs);
    this.pruneRecentFrontmatterInsertions(nowMs);
  }

  private pruneRecentFrontmatterInsertions(nowMs: number): void {
    for (const [path, insertedAt] of this.recentFrontmatterInsertions.entries()) {
      if (nowMs - insertedAt >= FRONTMATTER_INSERTION_DEBOUNCE_MS) {
        this.recentFrontmatterInsertions.delete(path);
      }
    }
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

  private shouldPromptForJuejinQuickPublish(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message === "Juejin publish requires a categoryId." || message === "Juejin publish requires at least one tagId.";
  }

  private async promptForJuejinQuickPublishDraft(
    target: JuejinTargetConfig,
    note: PublishableNote
  ): Promise<JuejinPublishDraft | null> {
    const initialDraft = buildInitialTargetDraft(target, note);
    if (initialDraft.provider !== "juejin") {
      throw new Error(`Expected Juejin draft, received ${initialDraft.provider}.`);
    }

    return new JuejinQuickPublishMetadataModal(
      this.app,
      target,
      note,
      initialDraft,
      this.providers
    ).openAndWait();
  }

  private async resolveQuickPublishContext(
    file: TFile,
    target: PublishTargetConfig
  ): Promise<NormalPublishExecutionContext | null | undefined> {
    if (target.provider !== "juejin") {
      return undefined;
    }

    const note = await extractPublishableNote(this.app, file);
    const provider = this.providers.get(target);

    try {
      await resolveJuejinPublishInput(note, target, undefined, {
        providerOptionCache: this.settings.providerOptionCache,
        loadNormalPublishOptions:
          typeof provider.loadNormalPublishOptions === "function"
            ? async (currentTarget) => provider.loadNormalPublishOptions!(currentTarget)
            : undefined,
      });
      return undefined;
    } catch (error) {
      if (!this.shouldPromptForJuejinQuickPublish(error)) {
        throw error;
      }
    }

    const promptDraft = await this.promptForJuejinQuickPublishDraft(target, note);
    if (!promptDraft) {
      return null;
    }

    return {
      common: {
        title: note.title,
      },
      provider: promptDraft,
    };
  }

  private async publishToTarget(
    file: TFile,
    target: PublishTargetConfig,
    context?: NormalPublishExecutionContext
  ): Promise<void> {
    new Notice(this.i18n.t("notice.publish.started", { note: file.basename, target: target.name }));

    try {
      const result = await this.publishWorkflow.runSingle(file, target, this.settings, context);
      this.settings = result.settings;
      await this.saveSettings();
      const actionLabel =
        result.action === "update"
          ? this.i18n.t("notice.publish.action.updated")
          : this.i18n.t("notice.publish.action.published");
      new Notice(this.i18n.t("notice.publish.succeeded", { target: target.name, action: actionLabel }));
    } catch (error) {
      await this.persistPublishFailureState(error);
      const message = error instanceof Error ? error.message : String(error);
      new Notice(this.i18n.t("notice.publish.failed", { error: message }), 8000);
      throw error;
    }
  }
}
