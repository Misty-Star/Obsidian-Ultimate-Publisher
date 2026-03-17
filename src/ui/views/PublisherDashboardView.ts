import { ItemView, WorkspaceLeaf } from "obsidian";
import type UltimatePublisherPlugin from "../../plugin";
import { DashboardTargetSummary, deriveDashboardSummary } from "../publishSummary";

export const PUBLISHER_DASHBOARD_VIEW_TYPE = "ultimate-publisher-dashboard";

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "Never";
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

  onClose(): void {
    this.contentEl.empty();
  }

  async render(): Promise<void> {
    const summary = deriveDashboardSummary(this.plugin.settings, 10);
    const { contentEl } = this;
    const lastPublishedAt = summary.recentRecords[0]?.lastPublishedAt;

    contentEl.empty();
    contentEl.toggleClass("ultimate-publisher-dashboard", true);

    contentEl.createEl("h2", { text: "Ultimate Publisher" });

    const cards = contentEl.createDiv({ cls: "ultimate-publisher-dashboard-cards" });
    this.renderCard(cards, "Configured Targets", String(summary.configuredCount), "All saved publish destinations");
    this.renderCard(cards, "Enabled Targets", String(summary.enabledCount), "Targets available to publish now");
    this.renderCard(cards, "Last Publish", formatTimestamp(lastPublishedAt), "Most recent publish record");

    const statusSection = contentEl.createEl("section", { cls: "ultimate-publisher-panel" });
    statusSection.createEl("h3", { text: "Target Status" });
    if (summary.targetSummaries.length === 0) {
      statusSection.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: "No publish targets configured yet.",
      });
    } else {
      const statusList = statusSection.createDiv({
        cls: "ultimate-publisher-status-list ultimate-publisher-target-list",
      });
      for (const target of summary.targetSummaries) {
        this.renderTargetStatus(statusList, target);
      }
    }

    const recordSection = contentEl.createEl("section", { cls: "ultimate-publisher-panel" });
    recordSection.createEl("h3", { text: "Recent Records" });
    if (summary.recentRecords.length === 0) {
      recordSection.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: "No publish activity recorded yet.",
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
        meta.createSpan({ text: formatTimestamp(record.lastPublishedAt) });

        if (record.remoteUrl) {
          meta.createSpan({ text: record.remoteUrl });
        }
      }
    }

    const shortcutSection = contentEl.createEl("section", { cls: "ultimate-publisher-panel" });
    shortcutSection.createEl("h3", { text: "Shortcuts" });
    const shortcuts = shortcutSection.createDiv({ cls: "ultimate-publisher-shortcuts" });

    const normalPublishButton = shortcuts.createEl("button", { text: "Normal Publish" });
    normalPublishButton.addEventListener("click", () => {
      this.plugin.openNormalPublishForActiveNote();
    });

    const batchPublishButton = shortcuts.createEl("button", { text: "Batch Publish" });
    batchPublishButton.addEventListener("click", () => {
      this.plugin.openBatchPublishForActiveNote();
    });

    const settingsButton = shortcuts.createEl("button", { text: "Publish Settings" });
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

  private renderTargetStatus(container: HTMLElement, target: DashboardTargetSummary): void {
    const row = container.createDiv({ cls: "ultimate-publisher-status-row" });
    const details = row.createDiv({ cls: "ultimate-publisher-status-row-main" });
    details.createEl("strong", { text: target.name });
    details.createDiv({
      cls: "ultimate-publisher-meta",
      text: `${target.provider} - ${target.lastPublishedAt ? formatTimestamp(target.lastPublishedAt) : "Never published"}`,
    });

    const badge = row.createSpan({
      cls: "ultimate-publisher-status-badge",
      text: target.enabled ? "Enabled" : "Disabled",
    });
    badge.toggleClass("is-enabled", target.enabled);
    badge.toggleClass("is-disabled", !target.enabled);
  }
}
