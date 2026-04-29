# Ultimate Publisher

一键将 Obsidian 笔记发布到多个平台的插件。

![Demo](https://github.com/user-attachments/assets/3951e978-747d-4b9c-aa8a-e4cd4fe265d7)

## ✨ 特性

- **一键发布** - 快速将当前笔记发布到配置的平台
- **批量发布** - 同时发布到多个平台，统一管理
- **多平台支持** - 支持 WordPress、语雀、知乎、CSDN、掘金
- **智能更新** - 自动识别已发布文章，支持更新操作
- **发布历史** - 记录所有发布历史，方便追踪管理
- **自定义配置** - 每个平台独立配置，灵活控制发布行为

## 📦 安装

### 方法一：通过 BRAT 插件安装（推荐）

1. 安装 [BRAT 插件](https://github.com/TfTHacker/obsidian42-brat)
2. 在 BRAT 设置中点击 "Add Beta plugin"
3. 输入仓库地址：`Misty-Star/obsidian-ultimate-publisher`
4. 点击 "Add Plugin"
5. 在社区插件列表中启用 "Ultimate Publisher"

### 方法二：手动安装

1. 从 [Releases](https://github.com/Misty-Star/obsidian-ultimate-publisher/releases) 下载最新版本
2. 解压文件到 Obsidian 插件目录：`<vault>/.obsidian/plugins/ultimate-publisher/`
3. 重启 Obsidian
4. 在设置中启用 "Ultimate Publisher" 插件

## 🚀 快速开始

1. **配置发布平台**
   - 打开插件设置
   - 添加发布目标（如知乎、掘金等）
   - 填写平台认证信息

2. **发布笔记**
   - 打开要发布的笔记
   - 点击左侧边栏的发布图标
   - 选择"快速发布"或"批量发布"
   - 选择目标平台并确认

3. **查看发布历史**
   - 在发布仪表板中查看所有发布记录
   - 支持更新已发布的文章

## 🎯 支持的平台

当前支持的 Provider：

| Provider | 认证方式 | 发布/更新 | 普通发布支持的字段 | 本地图片处理 |
| --- | --- | --- | --- | --- |
| WordPress | REST API endpoint、用户名、应用密码 | 支持发布和更新文章 | 支持 slug、摘要、标签、分类、状态、密码，以及 Markdown/HTML 输出格式 | 会上传本地 Obsidian 图片到 WordPress 媒体库 |
| 语雀 | 语雀 base URL、知识库 repo、token、公开级别 | 支持发布和更新文档 | 支持 slug 和公开/私有可见性 | 不上传本地 Obsidian 图片 |
| 知乎 | 基于 Cookie 的网页认证 | 支持发布和更新文章 | 支持从目标默认值或普通发布对话框选择专栏 | 不上传本地 Obsidian 图片 |
| CSDN | 基于 Cookie 的网页认证 | 支持发布和更新文章 | 支持摘要、标签、分类 | 不上传本地 Obsidian 图片 |
| 掘金 | 基于 Cookie 的网页认证 | 支持发布和更新文章 | 必须填写分类和至少一个标签，支持摘要/简介 | 不上传本地 Obsidian 图片 |

尚未支持的 Provider 家族和没有可用 Provider 的 Marketplace 分类不会展示为可安装平台。

## ⚙️ 配置

### 添加发布目标

1. 打开插件设置
2. 点击“添加发布目标”
3. 选择平台类型
4. 填写配置：
   - **目标名称**：用于区分不同发布目标的自定义名称
   - **认证信息**：API Token、Cookie 等平台相关认证参数
   - **默认设置**：标签、分类等默认值

市场（Marketplace）中的平台会按平台大类分组展示；只有包含已支持 Provider 的分类会显示。

### Frontmatter 元数据

你可以在笔记的 frontmatter 中预填当前 Provider 已支持的发布元数据：

- 通用字段：`title`、`slug`、`tags`、`categories`、`description`
- WordPress 专属字段：`status`
- 掘金专属字段：
  - `juejinCategory`
  - `juejinTags`

自动 frontmatter 模板只会为已启用且支持对应字段的目标生成平台专属字段。你可以在设置页开启自动插入模板，也可以通过命令 `Insert publish frontmatter template` 手动为当前笔记插入发布 frontmatter 模板。

发布标题优先级：`frontmatter.title` -> 正文第一个一级标题 -> 文件名。

```yaml
---
title: Build Once, Publish Everywhere
slug: build-once-publish-everywhere
tags: [obsidian, publishing]
categories: [productivity]
description: Reuse one note for multiple publishing platforms.
status: draft
juejinCategory: Backend
juejinTags: [Obsidian, Efficiency]
---
```


## Provider 架构

Ultimate Publisher 保持 provider 身份扁平且稳定：每个目标只持久化一个 `target.provider`，例如 `wordpress`、`github` 或 `gitlab`。Marketplace 分类（`common`、`wordpress`、`github`、`gitlab`、`web` 等）只是从 provider definition 派生出来的 UI 分组元数据，不是运行时持久化层级。

Provider definition 负责声明 family、capability、设置表单、Marketplace 卡片、Normal Publish 集成和运行时 provider factory。对于静态站点 provider，按托管家族使用一个共享 provider id（`github` 或 `gitlab`），并把静态站点生成器子类型（`hugo`、`hexo`、`jekyll`、`vuepress`、`vuepress2`、`vitepress` 或 `quartz`）放在目标配置里。只有当认证方式、API 或持久化边界确实不同，才新增 provider id；默认不要为每个静态站点生成器创建单独 provider id。

当前 GitHub/GitLab 静态站点目标通过仓库内容 API 支持以 Hugo 风格内容路径发布和更新 Markdown 文件。静态站点目标暂不暴露媒体上传和删除能力。

## 📝 使用场景

- **技术博客作者** - 一次编写，同步发布到多个技术平台
- **知识管理** - 将 Obsidian 笔记同步到在线知识库
- **内容创作者** - 统一管理多平台内容发布
- **团队协作** - 将文档发布到团队共享平台

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

在贡献之前，请阅读 [AGENTS.md](AGENTS.md) 了解开发指南和最佳实践。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

本项目受 [siyuan-plugin-publisher](https://github.com/terwer/siyuan-plugin-publisher) 项目的启发。

感谢 Obsidian 社区的支持和贡献。

---

如有问题或建议，欢迎在 [Issues](https://github.com/Misty-Star/obsidian-ultimate-publisher/issues) 中反馈。
