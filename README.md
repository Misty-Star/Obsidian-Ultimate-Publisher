# Ultimate Publisher

[中文文档](README_zh-CN.md)

Publish your Obsidian notes to multiple platforms with one click.

![Demo](https://github.com/user-attachments/assets/3951e978-747d-4b9c-aa8a-e4cd4fe265d7)

## ✨ Features

- **One-Click Publishing** - Quickly publish current note to configured platforms
- **Batch Publishing** - Publish to multiple platforms simultaneously
- **Multi-Platform Support** - Supports Zhihu, Juejin, CSDN, WordPress, Yuque, and more
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

- **Zhihu** - Article publishing and updates
- **Juejin** - Article publishing and updates
- **CSDN** - Article publishing and updates
- **WordPress** - Self-hosted WordPress sites
- **Yuque** - Knowledge base documentation
- More platforms coming soon...

## ⚙️ Configuration

### Adding Publishing Targets

1. Open plugin settings
2. Click "Add Publishing Target"
3. Select platform type
4. Fill in configuration:
   - **Target Name**: Custom name for identification
   - **Authentication**: API Token, Cookie, etc. (platform-specific)
   - **Default Settings**: Tags, categories, etc.

### Platform-Specific Configuration

Different platforms require different authentication methods. Please refer to each platform's API documentation.

### Frontmatter Metadata

Use note frontmatter to prefill publish metadata:

- Common fields: `title`, `slug`, `tags`, `categories`, `description`
- WordPress field: `status`
- Juejin fields:
  - `juejinCategory`
  - `juejinTags`

Notes:

- CSDN uses the shared `categories` and `tags` fields.
- Juejin summary now reuses the shared `description` field.
- Zhihu no longer uses a frontmatter field for `columnId`.
- `juejinCategory` and `juejinTags` should be names. They are resolved to IDs automatically at publish time.

Frontmatter option hints prioritize cached Juejin options. If cache is missing or older than one day, the plugin refreshes options automatically and writes them back to cache.

You can enable automatic template insertion in the settings panel, and you can also run the command `Insert publish frontmatter template` manually for the current note.

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
