# Ultimate Publisher

[中文文档](README_zh-CN.md)

Publish your Obsidian notes to multiple platforms with one click.

![Demo](https://github.com/user-attachments/assets/3951e978-747d-4b9c-aa8a-e4cd4fe265d7)

## ✨ Features

- **One-Click Publishing** - Quickly publish current note to configured platforms
- **Batch Publishing** - Publish to multiple platforms simultaneously
- **Multi-Platform Support** - Supports WordPress, WordPress.com, MetaWeblog/XML-RPC blogs, Yuque, Zhihu, CSDN, Juejin, GitHub static sites, and GitLab static sites
- **Smart Updates** - Automatically detects published articles and supports updates
- **Publishing History** - Track all publishing records
- **Custom Configuration** - Independent configuration for each platform

## 📦 Installation

### Method 1: Install via BRAT (Recommended)

1. Install [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Click "Add Beta plugin" in BRAT settings
3. Enter repository: `Misty-Star/obsidian-ultimate-publisher`
4. Click "Add Plugin"
5. Enable "Ultimate Publisher" in Community Plugins

### Method 2: Manual Installation

1. Download the latest release from [Releases](https://github.com/Misty-Star/obsidian-ultimate-publisher/releases)
2. Extract files to: `<vault>/.obsidian/plugins/ultimate-publisher/`
3. Restart Obsidian
4. Enable "Ultimate Publisher" in settings

## 🚀 Quick Start

1. **Configure Publishing Platforms**
   - Open plugin settings
   - Add publishing targets (e.g., Zhihu, Juejin)
   - Fill in platform authentication info

2. **Publish Notes**
   - Open the note you want to publish
   - Click the publish icon in the sidebar
   - Choose "Quick Publish" or "Batch Publish"
   - Select target platforms and confirm

3. **View Publishing History**
   - Check all publishing records in the dashboard
   - Update previously published articles

## 🎯 Supported Platforms

The currently supported providers are:

| Provider            | Target type / settings form                                                                                                                                                             | Provider class / definition                                                 | Publish/update                                                                  | Delete / media / normal publish behavior                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| WordPress           | REST target; settings form captures endpoint, username, application password, default status, and Markdown/HTML output format                                                           | `WordpressProvider`; `wordpressDefinition` (`rest-api`)                     | Posts can be published and updated                                              | Delete supported; local Obsidian images upload to WordPress media; normal publish supports slug, excerpt, tags, categories, status, and password |
| Yuque               | REST target; settings form captures Yuque base URL, repo, token, and public level                                                                                                       | `YuqueProvider`; `yuqueDefinition` (`rest-api`)                             | Docs can be published and updated                                               | Delete supported; local Obsidian images are blocked; normal publish supports slug and public/private visibility                                  |
| Zhihu               | Cookie-web target; settings form stays focused on enabled/name/cookie authorization fields                                                                                              | `ZhihuProvider`; `zhihuDefinition` (`cookie-web`)                           | Articles can be published and updated                                           | Delete supported; local Obsidian images are blocked; normal publish can use target default column metadata                                       |
| CSDN                | Cookie-web target; settings form captures cookie plus default categories/tags                                                                                                           | `CsdnProvider`; `csdnDefinition` (`cookie-web`)                             | Articles can be published and updated                                           | Delete supported; local Obsidian images are blocked; normal publish supports excerpt, tags, and categories                                       |
| Juejin              | Cookie-web target; settings form captures cookie plus default category/tag IDs and brief content                                                                                        | `JuejinProvider`; `juejinDefinition` (`cookie-web`)                         | Articles can be published and updated                                           | Delete supported; local Obsidian images are blocked; normal publish requires a category and at least one tag and supports brief content          |
| GitHub static-site generators | Concrete Marketplace targets for GitHub Hugo, Hexo, Jekyll, VuePress, VuePress 2, VitePress, and Quartz; each form captures owner/repo, token, branch, content root, commit message template, and optional preview base URL | Shared `GithubProvider`; hidden legacy `githubDefinition` plus generator-specific definitions (`github-static-site`) | Markdown files can be published and updated through the repository contents API | Delete is explicitly unsupported; local Obsidian images are blocked before API writes; normal publish is intentionally not exposed |
| GitLab static-site generators | Concrete Marketplace targets for GitLab Hugo, Hexo, Jekyll, VuePress, VuePress 2, and VitePress; each form captures base URL, project path/ID, token, branch, content root, commit message template, and optional preview base URL | Shared `GitlabProvider`; hidden legacy `gitlabDefinition` plus generator-specific definitions (`gitlab-static-site`) | Markdown files can be published and updated through the repository files API | Delete is explicitly unsupported; local Obsidian images are blocked before API writes; normal publish is intentionally not exposed |

Unsupported provider families and empty Marketplace categories are not shown as installable providers. Reference platforms that are still planned, such as Notion, Halo API, WeChat, Jianshu, Bilibili, and Xiaohongshu, are not shown in Marketplace until a real provider definition and publish/update tests exist.

## ⚙️ Configuration

### Adding Publishing Targets

1. Open plugin settings
2. Click "Add Publishing Target"
3. Select platform type
4. Fill in configuration:
   - **Target Name**: Custom name for identification
   - **Authentication**: API Token, Cookie, etc. (platform-specific)
   - **Default Settings**: Tags, categories, etc.

Marketplace providers are grouped by category in the Marketplace tab. Only categories with supported providers are shown.

### Frontmatter Metadata

Use note frontmatter to prefill publish metadata that the current providers support:

- Common fields: `title`, `slug`, `tags`, `categories`, `description`
- WordPress-only field: `status`
- Juejin-only fields:
  - `juejinCategory`
  - `juejinTags`

The automatic frontmatter template only includes provider-specific fields for enabled targets that can use them. You can enable automatic template insertion in the settings panel, and you can also run the command `Insert publish frontmatter template` manually for the current note.

Title precedence when publishing: `frontmatter.title` -> first level-one heading -> file name.

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

## Provider architecture

Ultimate Publisher keeps provider identity flat and stable: a target stores one `target.provider` value such as `wordpress`, `github-hugo`, or `gitlab-vitepress`. Marketplace categories (`common`, `wordpress`, `github`, `gitlab`, `web`, etc.) are UI grouping metadata derived from provider definitions, not persisted runtime hierarchy.

Provider definitions own the family and capability metadata used by settings, Marketplace cards, normal publish integration, and runtime provider factories. Static-site generators now appear as concrete Marketplace provider objects, matching the reference project: GitHub exposes Hugo, Hexo, Jekyll, VuePress, VuePress 2, VitePress, and Quartz; GitLab exposes the reference-backed Hugo, Hexo, Jekyll, VuePress, VuePress 2, and VitePress set. Each generator-specific target still stores its fixed generator in `target.siteGenerator` so the shared GitHub/GitLab runtimes can build the correct content path.

Legacy saved `github` and `gitlab` targets remain accepted by the definition/registry layer for migration compatibility, but they are no longer shown as Marketplace cards and their generator dropdown is not used for newly created generator-specific targets. Local File/Local Filesystem publishing has been removed from the product surface. Media upload and delete are intentionally not exposed for static-site repository targets yet.

When migrating additional platforms from `references/siyuan-plugin-publisher`, keep the inventory explicit: a reference platform is either implemented, covered by a shared provider, or planned with a rationale. Do not add Marketplace presentation for planned platforms until the provider implements `validateConfig`, `publish`, `update`, preview URL behavior, and explicit delete support or an explicit unsupported-delete error with tests.

## 📝 Use Cases

- **Tech Bloggers** - Write once, publish to multiple platforms
- **Knowledge Management** - Sync Obsidian notes to online knowledge bases
- **Content Creators** - Manage multi-platform content publishing
- **Team Collaboration** - Publish documents to shared platforms

## 🤝 Contributing

Contributions are welcome! Feel free to submit Issues and Pull Requests.

Before contributing, please read [AGENTS.md](AGENTS.md) for development guidelines and best practices.

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Inspired by [siyuan-plugin-publisher](https://github.com/terwer/siyuan-plugin-publisher) project.

Thanks to the Obsidian community for their support and contributions.

---

For questions or suggestions, please open an [Issue](https://github.com/Misty-Star/obsidian-ultimate-publisher/issues).
