import { PluginSettingTab, Setting } from "obsidian";
import UltimatePublisherPlugin from "../plugin";
import { PublishTargetConfig } from "../types";
import { createLocalExportTarget, createWordpressTarget, createYuqueTarget } from "../settings";

function providerLabel(target: PublishTargetConfig): string {
  switch (target.provider) {
    case "wordpress":
      return "WordPress";
    case "yuque":
      return "Yuque";
    case "local-export":
      return "Local Export";
  }
}

export class UltimatePublisherSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: UltimatePublisherPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Ultimate Publisher" });
    containerEl.createEl("p", {
      cls: "ultimate-publisher-empty-state",
      text: "Configure one or more targets, then run the command to publish the active note.",
    });

    new Setting(containerEl)
      .setName("Add WordPress target")
      .setDesc("REST API endpoint with application password auth.")
      .addButton((button) =>
        button.setButtonText("Add").onClick(async () => {
          await this.plugin.addTarget(createWordpressTarget());
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Add Yuque target")
      .setDesc("Token-based publishing to a Yuque repository.")
      .addButton((button) =>
        button.setButtonText("Add").onClick(async () => {
          await this.plugin.addTarget(createYuqueTarget());
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Add Local Export target")
      .setDesc("Write Markdown and copied assets to a local directory.")
      .addButton((button) =>
        button.setButtonText("Add").onClick(async () => {
          await this.plugin.addTarget(createLocalExportTarget());
          this.display();
        })
      );

    if (this.plugin.settings.targets.length === 0) {
      containerEl.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: "No targets configured yet.",
      });
      return;
    }

    for (const target of this.plugin.settings.targets) {
      const group = containerEl.createDiv({
        cls: `ultimate-publisher-setting-group ${target.enabled ? "" : "is-disabled"}`,
      });
      group.createEl("h4", { text: `${target.name} (${providerLabel(target)})` });

      new Setting(group)
        .setName("Enabled")
        .addToggle((toggle) =>
          toggle.setValue(target.enabled).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              draft.enabled = value;
            });
          })
        );

      new Setting(group)
        .setName("Display name")
        .addText((text) =>
          text.setPlaceholder("Target name").setValue(target.name).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              draft.name = value || providerLabel(draft);
            });
          })
        );

      if (target.provider === "wordpress") {
        new Setting(group)
          .setName("Endpoint")
          .setDesc("Example: https://example.com")
          .addText((text) =>
            text.setValue(target.endpoint).onChange(async (value) => {
              await this.plugin.updateTarget(target.id, (draft) => {
                if (draft.provider === "wordpress") {
                  draft.endpoint = value.trim();
                }
              });
            })
          );

        new Setting(group).setName("Username").addText((text) =>
          text.setValue(target.username).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "wordpress") {
                draft.username = value.trim();
              }
            });
          })
        );

        new Setting(group).setName("Application password").addText((text) => {
          text.inputEl.type = "password";
          text.setValue(target.appPassword).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "wordpress") {
                draft.appPassword = value.trim();
              }
            });
          });
        });

        new Setting(group)
          .setName("Default status")
          .addDropdown((dropdown) =>
            dropdown
              .addOption("draft", "Draft")
              .addOption("publish", "Publish")
              .addOption("private", "Private")
              .addOption("pending", "Pending")
              .setValue(target.defaultStatus)
              .onChange(async (value) => {
                await this.plugin.updateTarget(target.id, (draft) => {
                  if (draft.provider === "wordpress") {
                    draft.defaultStatus = value as typeof draft.defaultStatus;
                  }
                });
              })
          );

        new Setting(group)
          .setName("Publish format")
          .setDesc("Choose whether WordPress receives Markdown text or rendered HTML.")
          .addDropdown((dropdown) =>
            dropdown
              .addOption("markdown", "Markdown")
              .addOption("html", "HTML")
              .setValue(target.contentFormat)
              .onChange(async (value) => {
                await this.plugin.updateTarget(target.id, (draft) => {
                  if (draft.provider === "wordpress") {
                    draft.contentFormat = value as typeof draft.contentFormat;
                  }
                });
              })
          );
      }

      if (target.provider === "yuque") {
        new Setting(group).setName("Base URL").addText((text) =>
          text.setValue(target.baseUrl).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "yuque") {
                draft.baseUrl = value.trim();
              }
            });
          })
        );

        new Setting(group)
          .setName("Repo")
          .setDesc("Example: namespace/repo")
          .addText((text) =>
            text.setValue(target.repo).onChange(async (value) => {
              await this.plugin.updateTarget(target.id, (draft) => {
                if (draft.provider === "yuque") {
                  draft.repo = value.trim();
                }
              });
            })
          );

        new Setting(group).setName("Token").addText((text) => {
          text.inputEl.type = "password";
          text.setValue(target.token).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "yuque") {
                draft.token = value.trim();
              }
            });
          });
        });

        new Setting(group)
          .setName("Public level")
          .setDesc("0 = private, 1 = public")
          .addDropdown((dropdown) =>
            dropdown.addOption("0", "Private").addOption("1", "Public").setValue(String(target.publicLevel)).onChange(async (value) => {
              await this.plugin.updateTarget(target.id, (draft) => {
                if (draft.provider === "yuque") {
                  draft.publicLevel = Number(value) as 0 | 1;
                }
              });
            })
          );
      }

      if (target.provider === "local-export") {
        new Setting(group)
          .setName("Output directory")
          .setDesc("Absolute directory path on the local machine.")
          .addText((text) =>
            text.setValue(target.outputDir).onChange(async (value) => {
              await this.plugin.updateTarget(target.id, (draft) => {
                if (draft.provider === "local-export") {
                  draft.outputDir = value.trim();
                }
              });
            })
          );

        new Setting(group).setName("YAML type").addDropdown((dropdown) =>
          dropdown.addOption("default", "Default").addOption("hexo", "Hexo").setValue(target.yamlType).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "local-export") {
                draft.yamlType = value as typeof draft.yamlType;
              }
            });
          })
        );

        new Setting(group).setName("Asset directory name").addText((text) =>
          text.setValue(target.assetDirName).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "local-export") {
                draft.assetDirName = value.trim() || "assets";
              }
            });
          })
        );
      }

      new Setting(group)
        .setName("Remove target")
        .setDesc("Delete this target and any saved publish records for it.")
        .addButton((button) =>
          button.setWarning().setButtonText("Remove").onClick(async () => {
            await this.plugin.removeTarget(target.id);
            this.display();
          })
        );
    }
  }
}
