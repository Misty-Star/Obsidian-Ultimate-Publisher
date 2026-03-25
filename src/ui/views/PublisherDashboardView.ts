import { ItemView, WorkspaceLeaf } from "obsidian";
import { createI18nFromObsidianLanguage, Translator } from "../../i18n";
import type UltimatePublisherPlugin from "../../plugin";
import { DashboardTargetSummary, deriveDashboardSummary } from "../publishSummary";

export const PUBLISHER_DASHBOARD_VIEW_TYPE = "ultimate-publisher-dashboard";

function formatTimestamp(timestamp: string | undefined, i18n: Translator): string {
  if (!timestamp) {
    return i18n.t("dashboard.timestamp.never");
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return parsed.toLocaleString();
}

export class PublisherDashboardView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: UltimatePublisherPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return PUBLISHER_DASHBOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Ultimate Publisher";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  async render(): Promise<void> {
    const summary = deriveDashboardSummary(this.plugin.settings, 10);
    const i18n = createI18nFromObsidianLanguage();
    const { contentEl } = this;
    const lastPublishedAt = summary.recentRecords[0]?.lastPublishedAt;

    contentEl.empty();
    contentEl.toggleClass("ultimate-publisher-dashboard", true);

    contentEl.createEl("h2", { text: "Ultimate Publisher" });

    const cards = contentEl.createDiv({ cls: "ultimate-publisher-dashboard-cards" });
    this.renderCard(
      cards,
      i18n.t("dashboard.card.configuredTargets.label"),
      String(summary.configuredCount),
      i18n.t("dashboard.card.configuredTargets.help")
    );
    this.renderCard(
      cards,
      i18n.t("dashboard.card.enabledTargets.label"),
      String(summary.enabledCount),
      i18n.t("dashboard.card.enabledTargets.help")
    );
    this.renderCard(
      cards,
      i18n.t("dashboard.card.lastPublish.label"),
      formatTimestamp(lastPublishedAt, i18n),
      i18n.t("dashboard.card.lastPublish.help")
    );

    const statusSection = contentEl.createEl("section", { cls: "ultimate-publisher-panel" });
    statusSection.createEl("h3", { text: i18n.t("dashboard.section.targetStatus") });
    if (summary.targetSummaries.length === 0) {
      statusSection.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: i18n.t("dashboard.empty.targets"),
      });
    } else {
      const statusList = statusSection.createDiv({
        cls: "ultimate-publisher-status-list ultimate-publisher-target-list",
      });
      for (const target of summary.targetSummaries) {
        this.renderTargetStatus(statusList, target, i18n);
      }
    }

    const recordSection = contentEl.createEl("section", { cls: "ultimate-publisher-panel" });
    recordSection.createEl("h3", { text: i18n.t("dashboard.section.recentRecords") });
    if (summary.recentRecords.length === 0) {
      recordSection.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: i18n.t("dashboard.empty.records"),
      });
    } else {
      const targetNames = new Map(summary.targetSummaries.map((target) => [target.targetId, target.name]));
      const recordList = recordSection.createDiv({ cls: "ultimate-publisher-record-list" });
      for (const record of summary.recentRecords) {
        const row = recordList.createDiv({ cls: "ultimate-publisher-record-row" });
        row.createEl("strong", { text: record.notePath });

        const meta = row.createDiv({ cls: "ultimate-publisher-meta" });
        meta.createSpan({
          text: `${targetNames.get(record.targetId) ?? record.targetId} (${record.provider})`,
        });
        meta.createSpan({ text: formatTimestamp(record.lastPublishedAt, i18n) });

        if (record.remoteUrl) {
          meta.createSpan({ text: record.remoteUrl });
        }
      }
    }

    const shortcutSection = contentEl.createEl("section", { cls: "ultimate-publisher-panel" });
    shortcutSection.createEl("h3", { text: i18n.t("dashboard.section.shortcuts") });
    const shortcuts = shortcutSection.createDiv({ cls: "ultimate-publisher-shortcuts" });

    const normalPublishButton = shortcuts.createEl("button", { text: i18n.t("dashboard.shortcuts.normalPublish") });
    normalPublishButton.addEventListener("click", () => {
      this.plugin.openNormalPublishForActiveNote();
    });

    const batchPublishButton = shortcuts.createEl("button", { text: i18n.t("dashboard.shortcuts.batchPublish") });
    batchPublishButton.addEventListener("click", () => {
      this.plugin.openBatchPublishForActiveNote();
    });

    const settingsButton = shortcuts.createEl("button", { text: i18n.t("dashboard.shortcuts.publishSettings") });
    settingsButton.addEventListener("click", () => {
      this.plugin.openPublishSettings();
    });
  }

  private renderCard(container: HTMLElement, label: string, value: string, helpText: string): void {
    const card = container.createDiv({ cls: "ultimate-publisher-card" });
    card.createDiv({
      cls: "ultimate-publisher-card-label",
      text: label,
    });
    card.createDiv({
      cls: "ultimate-publisher-card-value",
      text: value,
    });
    card.createDiv({
      cls: "ultimate-publisher-card-help",
      text: helpText,
    });
  }

  private renderTargetStatus(container: HTMLElement, target: DashboardTargetSummary, i18n: Translator): void {
    const row = container.createDiv({ cls: "ultimate-publisher-status-row" });
    const details = row.createDiv({ cls: "ultimate-publisher-status-row-main" });
    details.createEl("strong", { text: target.name });
    details.createDiv({
      cls: "ultimate-publisher-meta",
      text: `${target.provider} - ${
        target.lastPublishedAt ? formatTimestamp(target.lastPublishedAt, i18n) : i18n.t("dashboard.status.neverPublished")
      }`,
    });

    const badge = row.createSpan({
      cls: "ultimate-publisher-status-badge",
      text: target.enabled ? i18n.t("dashboard.status.enabled") : i18n.t("dashboard.status.disabled"),
    });
    badge.toggleClass("is-enabled", target.enabled);
    badge.toggleClass("is-disabled", !target.enabled);
  }
}
