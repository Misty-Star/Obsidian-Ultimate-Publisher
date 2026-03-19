"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => main_default
});
module.exports = __toCommonJS(main_exports);

// src/plugin.ts
var import_obsidian12 = require("obsidian");

// src/core/note.ts
var import_obsidian = require("obsidian");
var import_node_crypto = require("node:crypto");
var import_node_path = require("node:path");

// src/core/markdown.ts
var WIKI_EMBED_REGEX = /!\[\[([^\]]+)\]\]/g;
var MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
function isAbsoluteUrl(value) {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:");
}
function stripAlias(target) {
  return target.split("|")[0].trim();
}
function extractAssetReferences(markdown) {
  const references = [];
  for (const match of markdown.matchAll(WIKI_EMBED_REGEX)) {
    const raw = match[1] ?? "";
    references.push({
      originalText: match[0],
      rawTarget: stripAlias(raw),
      altText: raw.split("|")[1]?.trim() ?? "",
      source: "wiki-embed"
    });
  }
  for (const match of markdown.matchAll(MARKDOWN_IMAGE_REGEX)) {
    const target = (match[2] ?? "").trim();
    if (isAbsoluteUrl(target)) {
      continue;
    }
    references.push({
      originalText: match[0],
      rawTarget: target,
      altText: match[1] ?? "",
      source: "markdown-image"
    });
  }
  return references;
}
function replaceAssetReference(markdown, reference, replacementPath) {
  const altText = reference.altText.trim();
  const rewritten = `![${altText}](${replacementPath})`;
  return markdown.split(reference.originalText).join(rewritten);
}
function replaceAssetReferences(markdown, replacements) {
  return replacements.reduce(
    (currentMarkdown, replacement) => replaceAssetReference(currentMarkdown, replacement.reference, replacement.replacementPath),
    markdown
  );
}

// src/core/content.ts
function stripFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return markdown;
  }
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/^\s*\n/, "");
}

// src/core/note.ts
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"]);
function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
function pickExcerpt(markdown, frontmatter) {
  const explicit = typeof frontmatter.description === "string" && frontmatter.description || typeof frontmatter.excerpt === "string" && frontmatter.excerpt || typeof frontmatter.summary === "string" && frontmatter.summary || "";
  if (explicit) {
    return explicit;
  }
  const collapsed = markdown.replace(/^---[\s\S]*?---\s*/m, "").replace(/!\[\[[^\]]+\]\]/g, "").replace(/!\[[^\]]*]\(([^)]+)\)/g, "").replace(/\[\[([^\]]+)]]/g, "$1").replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1").replace(/[#>*`~-]/g, " ").replace(/\s+/g, " ").trim();
  return collapsed.slice(0, 200);
}
function normalizeTitleLine(value) {
  return value.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "").replace(/\s+/g, " ").trim();
}
function pickTitle(markdown, fallback) {
  const lines = markdown.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("# ")) {
      continue;
    }
    const title = normalizeTitleLine(line);
    if (title) {
      return title;
    }
  }
  for (const rawLine of lines) {
    const title = normalizeTitleLine(rawLine);
    if (title) {
      return title;
    }
  }
  return fallback;
}
function isImagePath(value) {
  const normalized = value.split(/[?#]/)[0] ?? value;
  return IMAGE_EXTENSIONS.has((0, import_node_path.extname)(normalized).toLowerCase());
}
function resolveAsset(app, file, reference) {
  if (!isImagePath(reference.rawTarget)) {
    return {
      unresolved: {
        reference,
        reason: "unsupported-type"
      }
    };
  }
  const resolved = app.metadataCache.getFirstLinkpathDest(reference.rawTarget, file.path);
  if (!(resolved instanceof import_obsidian.TFile)) {
    return {
      unresolved: {
        reference,
        reason: "missing"
      }
    };
  }
  if (!isImagePath(resolved.path)) {
    return {
      unresolved: {
        reference,
        reason: "unsupported-type"
      }
    };
  }
  return {
    resolved: {
      reference,
      sourcePath: resolved.path,
      fileName: resolved.name
    }
  };
}
async function extractPublishableNote(app, file) {
  const rawMarkdown = await app.vault.cachedRead(file);
  const cache = app.metadataCache.getFileCache(file);
  const frontmatter = cache?.frontmatter ?? {};
  const markdown = stripFrontmatter(rawMarkdown);
  const references = extractAssetReferences(markdown);
  const attachments = [];
  const unresolvedAttachments = [];
  for (const reference of references) {
    const result = resolveAsset(app, file, reference);
    if (result.resolved) {
      attachments.push(result.resolved);
    }
    if (result.unresolved) {
      unresolvedAttachments.push(result.unresolved);
    }
  }
  const title = pickTitle(markdown, file.basename);
  const slug = typeof frontmatter.slug === "string" && frontmatter.slug || typeof frontmatter.permalink === "string" && frontmatter.permalink || slugify(file.basename);
  const tags = ensureArray(frontmatter.tags);
  const categories = ensureArray(frontmatter.categories ?? frontmatter.category);
  return {
    filePath: file.path,
    title,
    markdown,
    frontmatter,
    attachments,
    unresolvedAttachments,
    excerpt: pickExcerpt(markdown, frontmatter),
    slug,
    tags,
    categories,
    date: typeof frontmatter.date === "string" ? frontmatter.date : void 0
  };
}
function computeContentHash(note) {
  return (0, import_node_crypto.createHash)("sha256").update(
    JSON.stringify({
      markdown: note.markdown,
      frontmatter: note.frontmatter,
      attachments: note.attachments.map((asset) => asset.sourcePath)
    })
  ).digest("hex");
}
function sanitizeFileName(value, fallback = "note") {
  const ext = (0, import_node_path.extname)(value);
  const name = ext ? value.slice(0, -ext.length) : value;
  const sanitized = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").trim();
  return sanitized || fallback;
}

// src/core/mediaPipeline.ts
async function resolveReplacement(provider, note, target, sourcePath) {
  const asset = note.attachments.find((item) => item.sourcePath === sourcePath);
  if (!asset) {
    throw new Error(`Missing attachment for source path: ${sourcePath}`);
  }
  const support = provider.getMediaSupport(target);
  if (support.mode === "native-upload") {
    if (!provider.uploadAsset) {
      throw new Error(`${target.name} cannot upload local assets because uploadAsset() is not implemented.`);
    }
    return provider.uploadAsset(asset, note, target);
  }
  if (support.mode === "local-copy") {
    if (!provider.copyAsset) {
      throw new Error(`${target.name} cannot copy local assets because copyAsset() is not implemented.`);
    }
    return provider.copyAsset(asset, note, target);
  }
  const files = note.attachments.map((item) => item.sourcePath).join(", ");
  throw new Error(`${target.name} does not support local Obsidian images yet: ${files}`);
}
async function prepareNoteForPublish(note, target, provider) {
  const missingAttachment = note.unresolvedAttachments.find((asset) => asset.reason === "missing");
  if (missingAttachment) {
    throw new Error(`Missing local image asset: ${missingAttachment.reference.rawTarget}`);
  }
  if (note.attachments.length === 0) {
    return {
      ...note,
      mediaReplacements: []
    };
  }
  const support = provider.getMediaSupport(target);
  if (support.mode === "unsupported") {
    const files = note.attachments.map((asset) => asset.sourcePath).join(", ");
    throw new Error(`${target.name} does not support local Obsidian images yet: ${files}`);
  }
  const resolvedPaths = /* @__PURE__ */ new Map();
  const replacements = [];
  for (const asset of note.attachments) {
    let replacementPath = resolvedPaths.get(asset.sourcePath);
    if (!replacementPath) {
      const result = await resolveReplacement(provider, note, target, asset.sourcePath);
      replacementPath = result.url;
      resolvedPaths.set(asset.sourcePath, replacementPath);
    }
    replacements.push({
      reference: asset.reference,
      replacementPath
    });
  }
  return {
    ...note,
    markdown: replaceAssetReferences(note.markdown, replacements),
    mediaReplacements: [...resolvedPaths.entries()].map(([sourcePath, replacementPath]) => ({
      sourcePath,
      replacementPath
    }))
  };
}

// src/settings.ts
var import_node_crypto2 = require("node:crypto");
var DEFAULT_SETTINGS = {
  targets: [],
  records: []
};
function createWordpressTarget() {
  return {
    id: (0, import_node_crypto2.randomUUID)(),
    name: "WordPress",
    enabled: true,
    provider: "wordpress",
    endpoint: "",
    username: "",
    appPassword: "",
    defaultStatus: "draft",
    contentFormat: "html"
  };
}
function createYuqueTarget() {
  return {
    id: (0, import_node_crypto2.randomUUID)(),
    name: "Yuque",
    enabled: true,
    provider: "yuque",
    baseUrl: "https://www.yuque.com",
    repo: "",
    token: "",
    publicLevel: 0
  };
}
function createLocalExportTarget() {
  return {
    id: (0, import_node_crypto2.randomUUID)(),
    name: "Local Export",
    enabled: true,
    provider: "local-export",
    outputDir: "",
    yamlType: "default",
    assetDirName: "assets"
  };
}
function getRecord(records, notePath, targetId) {
  return records.find((record) => record.notePath === notePath && record.targetId === targetId);
}
function upsertRecord(records, nextRecord) {
  const existingIndex = records.findIndex(
    (record) => record.notePath === nextRecord.notePath && record.targetId === nextRecord.targetId
  );
  if (existingIndex === -1) {
    return [...records, nextRecord];
  }
  const next = records.slice();
  next[existingIndex] = nextRecord;
  return next;
}
function cloneTarget(target) {
  return JSON.parse(JSON.stringify(target));
}
function normalizeTarget(target) {
  if (target.provider === "wordpress") {
    return {
      ...target,
      defaultStatus: target.defaultStatus ?? "draft",
      contentFormat: target.contentFormat ?? "html"
    };
  }
  if (target.provider === "yuque") {
    return {
      ...target,
      baseUrl: target.baseUrl || "https://www.yuque.com",
      publicLevel: target.publicLevel ?? 0
    };
  }
  return {
    ...target,
    yamlType: target.yamlType ?? "default",
    assetDirName: target.assetDirName || "assets"
  };
}

// src/core/publishService.ts
var PublishService = class {
  constructor(app, providers, mediaPipeline = {
    prepare: prepareNoteForPublish
  }) {
    this.app = app;
    this.providers = providers;
    this.mediaPipeline = mediaPipeline;
  }
  async publishFile(file, target, settings) {
    const provider = this.providers.get(target);
    await provider.validateConfig(target);
    const note = await extractPublishableNote(this.app, file);
    const contentHash = computeContentHash(note);
    const preparedNote = await this.mediaPipeline.prepare(note, target, provider);
    const existing = getRecord(settings.records, file.path, target.id);
    const result = existing ? await provider.update(existing.remoteId, preparedNote, target) : await provider.publish(preparedNote, target);
    const previewUrl = result.remoteUrl ?? await provider.getPreviewUrl(result.remoteId, target);
    const record = {
      notePath: file.path,
      provider: target.provider,
      targetId: target.id,
      remoteId: result.remoteId,
      remoteUrl: previewUrl,
      lastPublishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      contentHash
    };
    return {
      record,
      created: !existing
    };
  }
  updateSettings(settings, record) {
    return {
      ...settings,
      records: upsertRecord(settings.records, record)
    };
  }
};

// src/core/publishWorkflow.ts
var PublishWorkflow = class {
  constructor(publishService) {
    this.publishService = publishService;
  }
  resolveAction(file, target, settings) {
    return getRecord(settings.records, file.path, target.id) ? "update" : "publish";
  }
  async runSingle(file, target, settings) {
    const action = this.resolveAction(file, target, settings);
    const serviceResult = await this.publishService.publishFile(file, target, settings);
    const nextSettings = this.publishService.updateSettings(settings, serviceResult.record);
    return {
      action,
      record: serviceResult.record,
      settings: nextSettings
    };
  }
  async runBatch(file, targets, settings) {
    let currentSettings = settings;
    const results = [];
    for (const target of targets) {
      const action = this.resolveAction(file, target, currentSettings);
      try {
        const singleResult = await this.runSingle(file, target, currentSettings);
        currentSettings = singleResult.settings;
        results.push({
          targetId: target.id,
          targetName: target.name,
          action: singleResult.action,
          status: "success",
          remoteUrl: singleResult.record.remoteUrl
        });
      } catch (error) {
        results.push({
          targetId: target.id,
          targetName: target.name,
          action,
          status: "failure",
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }
    const successCount = results.filter((item) => item.status === "success").length;
    const failureCount = results.length - successCount;
    return {
      results,
      totalCount: results.length,
      successCount,
      failureCount,
      settings: currentSettings
    };
  }
};

// src/providers/localExportProvider.ts
var import_promises = require("node:fs/promises");
var import_node_path2 = require("node:path");
var import_obsidian2 = require("obsidian");

// src/core/yaml.ts
function escapeScalar(value) {
  if (value.includes("\n")) {
    return `|-
${value.split("\n").map((line) => `  ${line}`).join("\n")}`;
  }
  if (/[:#[\]\{\},&*!?|<>=@`]/.test(value) || value.trim() !== value) {
    return JSON.stringify(value);
  }
  return value;
}
function serializeValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ["[]"];
    }
    return value.flatMap((item) => {
      if (typeof item === "string") {
        return [`- ${escapeScalar(item)}`];
      }
      return [`- ${JSON.stringify(item)}`];
    });
  }
  if (typeof value === "string") {
    return [escapeScalar(value)];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (value == null) {
    return ["null"];
  }
  return [JSON.stringify(value)];
}
function buildExportFrontmatter(metadata, yamlType) {
  if (yamlType === "hexo") {
    return {
      title: metadata.title,
      date: metadata.date ?? (/* @__PURE__ */ new Date()).toISOString(),
      tags: metadata.tags,
      categories: metadata.categories,
      slug: metadata.slug,
      excerpt: metadata.excerpt,
      ...metadata.extra
    };
  }
  return {
    title: metadata.title,
    slug: metadata.slug,
    description: metadata.excerpt,
    tags: metadata.tags,
    categories: metadata.categories,
    date: metadata.date ?? (/* @__PURE__ */ new Date()).toISOString(),
    ...metadata.extra
  };
}
function serializeFrontmatter(values) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(values)) {
    if (value === void 0 || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${typeof item === "string" ? escapeScalar(item) : JSON.stringify(item)}`);
        }
      }
      continue;
    }
    const serialized = serializeValue(value);
    if (serialized.length === 1) {
      lines.push(`${key}: ${serialized[0]}`);
      continue;
    }
    lines.push(`${key}:`);
    lines.push(...serialized.map((line) => `  ${line}`));
  }
  lines.push("---");
  return lines.join("\n");
}

// src/providers/localExportProvider.ts
var LocalExportProvider = class {
  constructor(app) {
    this.app = app;
    this.provider = "local-export";
  }
  getMediaSupport(_target) {
    return { mode: "local-copy" };
  }
  async validateConfig(target) {
    if (!target.outputDir) {
      throw new Error("Local export target is missing outputDir.");
    }
    await (0, import_promises.mkdir)(target.outputDir, { recursive: true });
  }
  async publish(note, target) {
    return this.writeExport(void 0, note, target);
  }
  async update(remoteId, note, target) {
    return this.writeExport(remoteId, note, target);
  }
  async delete(remoteId) {
    void remoteId;
  }
  async getPreviewUrl(remoteId) {
    return remoteId;
  }
  async writeExport(remoteId, note, target) {
    const slug = sanitizeFileName(note.slug || note.title, "note");
    const outputPath = remoteId || (0, import_node_path2.join)(target.outputDir, `${slug}.md`);
    await (0, import_promises.mkdir)(target.outputDir, { recursive: true });
    const frontmatter = buildExportFrontmatter(
      {
        title: note.title,
        slug: note.slug,
        excerpt: note.excerpt,
        tags: note.tags,
        categories: note.categories,
        date: note.date,
        extra: note.frontmatter
      },
      target.yamlType
    );
    const content = `${serializeFrontmatter(frontmatter)}

${note.markdown.trim()}
`;
    await (0, import_promises.writeFile)(outputPath, content, "utf8");
    return {
      remoteId: outputPath,
      remoteUrl: outputPath
    };
  }
  async copyAsset(asset, note, target) {
    const sourceData = await this.app.vault.adapter.readBinary((0, import_obsidian2.normalizePath)(asset.sourcePath));
    const slug = sanitizeFileName(note.slug || note.title, "note");
    const assetDir = (0, import_node_path2.join)(target.outputDir, target.assetDirName || "assets");
    await (0, import_promises.mkdir)(assetDir, { recursive: true });
    const extension = (0, import_node_path2.extname)(asset.fileName);
    const baseName = extension ? asset.fileName.slice(0, -extension.length) : asset.fileName;
    const assetName = `${slug}-${sanitizeFileName(baseName, "asset")}${extension}`;
    const destination = (0, import_node_path2.join)(assetDir, assetName);
    await (0, import_promises.writeFile)(destination, Buffer.from(sourceData));
    const relativeDir = target.assetDirName || "assets";
    return {
      url: `./${relativeDir}/${assetName}`
    };
  }
};

// src/providers/wordpressProvider.ts
var import_obsidian4 = require("obsidian");

// src/core/html.ts
var import_obsidian3 = require("obsidian");
async function renderMarkdownToHtml(app, markdown, sourcePath) {
  const container = document.createElement("div");
  const component = new import_obsidian3.Component();
  component.load();
  try {
    await import_obsidian3.MarkdownRenderer.render(app, markdown, container, sourcePath, component);
    container.querySelectorAll("button.copy-code-button").forEach((copyButton) => {
      copyButton.remove();
    });
    return container.innerHTML.trim();
  } finally {
    component.unload();
  }
}

// src/providers/wordpressProvider.ts
function tryParseJsonPayload(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const objectIndex = trimmed.indexOf("{");
    const arrayIndex = trimmed.indexOf("[");
    const startIndex = objectIndex === -1 ? arrayIndex : arrayIndex === -1 ? objectIndex : Math.min(objectIndex, arrayIndex);
    if (startIndex <= 0) {
      return null;
    }
    try {
      return JSON.parse(trimmed.slice(startIndex));
    } catch {
      return null;
    }
  }
}
function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
function makeAuthHeader(target) {
  return `Basic ${Buffer.from(`${target.username}:${target.appPassword}`).toString("base64")}`;
}
function normalizeEndpoint(target) {
  return `${trimTrailingSlash(target.endpoint)}/wp-json/wp/v2`;
}
async function requestJson(target, path, method = "GET", body) {
  const response = await (0, import_obsidian4.requestUrl)({
    url: `${normalizeEndpoint(target)}${path}`,
    method,
    headers: {
      Authorization: makeAuthHeader(target),
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : void 0,
    throw: false
  });
  if (response.status >= 400) {
    throw new Error(`WordPress request failed (${response.status}): ${response.text}`);
  }
  const parsed = tryParseJsonPayload(response.text);
  if (parsed !== null) {
    return parsed;
  }
  const snippet = response.text.replace(/\s+/g, " ").slice(0, 400);
  throw new Error(
    `WordPress returned a non-JSON response. This usually means PHP warnings or other output are leaking into the REST API response. Raw response: ${snippet}`
  );
}
function slugify2(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
async function ensureTermIds(target, taxonomy, names) {
  const ids = [];
  for (const name of names) {
    const slug = slugify2(name);
    const existing = await requestJson(target, `/${taxonomy}?search=${encodeURIComponent(name)}`);
    const found = existing.find((item) => item.slug === slug || item.name.toLowerCase() === name.toLowerCase());
    if (found) {
      ids.push(found.id);
      continue;
    }
    const created = await requestJson(target, `/${taxonomy}`, "POST", {
      name,
      slug
    });
    ids.push(created.id);
  }
  return ids;
}
async function buildPayload(note, target) {
  const content = target.contentFormat === "html" ? note.html ?? note.markdown : note.markdown;
  return {
    title: note.title,
    content,
    excerpt: note.excerpt,
    slug: note.slug,
    status: note.frontmatter.status ?? target.defaultStatus,
    categories: await ensureTermIds(target, "categories", note.categories),
    tags: await ensureTermIds(target, "tags", note.tags)
  };
}
var WordpressProvider = class {
  constructor(app) {
    this.app = app;
    this.provider = "wordpress";
  }
  getMediaSupport(_target) {
    return { mode: "native-upload" };
  }
  async validateConfig(target) {
    if (!target.endpoint || !target.username || !target.appPassword) {
      throw new Error("WordPress target is missing endpoint, username, or application password.");
    }
    await requestJson(target, "/users/me");
  }
  async publish(note, target) {
    const response = await requestJson(
      target,
      "/posts",
      "POST",
      await buildPayload(await this.prepareNote(note), target)
    );
    return {
      remoteId: String(response.id),
      remoteUrl: response.link
    };
  }
  async update(remoteId, note, target) {
    const preparedNote = await this.prepareNote(note);
    const response = await requestJson(
      target,
      `/posts/${encodeURIComponent(remoteId)}`,
      "POST",
      await buildPayload(preparedNote, target)
    );
    return {
      remoteId: String(response.id),
      remoteUrl: response.link
    };
  }
  async delete(remoteId, target) {
    await requestJson(target, `/posts/${encodeURIComponent(remoteId)}?force=true`, "DELETE");
  }
  async getPreviewUrl(remoteId, target) {
    const response = await requestJson(target, `/posts/${encodeURIComponent(remoteId)}`);
    return response.link;
  }
  async uploadAsset(asset, _note, target) {
    const bytes = await this.app.vault.adapter.readBinary((0, import_obsidian4.normalizePath)(asset.sourcePath));
    const body = bytes instanceof ArrayBuffer ? bytes : Uint8Array.from(bytes).buffer;
    const response = await (0, import_obsidian4.requestUrl)({
      url: `${normalizeEndpoint(target)}/media`,
      method: "POST",
      headers: {
        Authorization: makeAuthHeader(target),
        "Content-Disposition": `attachment; filename="${asset.fileName}"`,
        "Content-Type": "application/octet-stream"
      },
      body,
      throw: false
    });
    if (response.status >= 400) {
      throw new Error(`WordPress media upload failed for ${asset.fileName} (${response.status}): ${response.text}`);
    }
    const payload = tryParseJsonPayload(response.text);
    const url = payload?.source_url ?? payload?.guid?.rendered;
    if (!url) {
      throw new Error(`WordPress media upload failed for ${asset.fileName}: ${response.text}`);
    }
    return { url };
  }
  async prepareNote(note) {
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    return {
      ...note,
      html
    };
  }
};

// src/providers/yuqueProvider.ts
var import_obsidian6 = require("obsidian");

// src/core/providers.ts
var import_obsidian5 = require("obsidian");
function assertRemoteAssetsSupported(note, targetName) {
  if (note.attachments.length === 0) {
    return;
  }
  const files = note.attachments.map((asset) => asset.sourcePath).join(", ");
  throw new Error(`${targetName} does not support local Obsidian assets in the MVP. Remove or externalize these files first: ${files}`);
}

// src/providers/yuqueProvider.ts
function trimTrailingSlash2(value) {
  return value.replace(/\/+$/, "");
}
function normalizeBaseUrl(baseUrl) {
  return trimTrailingSlash2(baseUrl || "https://www.yuque.com");
}
async function requestYuque(target, path, method = "GET", body) {
  const response = await (0, import_obsidian6.requestUrl)({
    url: `${normalizeBaseUrl(target.baseUrl)}${path}`,
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": target.token
    },
    body: body ? JSON.stringify(body) : void 0,
    throw: false
  });
  if (response.status >= 400) {
    throw new Error(`Yuque request failed (${response.status}): ${response.text}`);
  }
  const payload = response.json;
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}
function buildPayload2(note, target) {
  return {
    title: note.title,
    slug: note.slug,
    public: target.publicLevel,
    format: "markdown",
    body: note.markdown
  };
}
function getDocUrl(doc) {
  return doc.public_url ?? doc.url;
}
var YuqueProvider = class {
  constructor() {
    this.provider = "yuque";
  }
  getMediaSupport(_target) {
    return { mode: "unsupported" };
  }
  async validateConfig(target) {
    if (!target.repo || !target.token) {
      throw new Error("Yuque target is missing repo or token.");
    }
    await requestYuque(target, `/api/v2/repos/${encodeURIComponent(target.repo)}`);
  }
  async publish(note, target) {
    assertRemoteAssetsSupported(note, target.name);
    const doc = await requestYuque(target, `/api/v2/repos/${encodeURIComponent(target.repo)}/docs`, "POST", buildPayload2(note, target));
    const remoteId = String(doc.id ?? doc.slug ?? note.slug);
    return {
      remoteId,
      remoteUrl: getDocUrl(doc)
    };
  }
  async update(remoteId, note, target) {
    assertRemoteAssetsSupported(note, target.name);
    const doc = await requestYuque(
      target,
      `/api/v2/repos/${encodeURIComponent(target.repo)}/docs/${encodeURIComponent(remoteId)}`,
      "PUT",
      buildPayload2(note, target)
    );
    return {
      remoteId: String(doc.id ?? remoteId),
      remoteUrl: getDocUrl(doc)
    };
  }
  async delete(remoteId, target) {
    await requestYuque(target, `/api/v2/repos/${encodeURIComponent(target.repo)}/docs/${encodeURIComponent(remoteId)}`, "DELETE");
  }
  async getPreviewUrl(remoteId, target) {
    const doc = await requestYuque(
      target,
      `/api/v2/repos/${encodeURIComponent(target.repo)}/docs/${encodeURIComponent(remoteId)}`
    );
    return getDocUrl(doc);
  }
};

// src/providers/registry.ts
var ProviderRegistry = class {
  constructor(app) {
    this.yuque = new YuqueProvider();
    this.wordpress = new WordpressProvider(app);
    this.localExport = new LocalExportProvider(app);
  }
  get(target) {
    switch (target.provider) {
      case "wordpress":
        return this.wordpress;
      case "yuque":
        return this.yuque;
      case "local-export":
        return this.localExport;
      default:
        throw new Error(`Unsupported provider: ${target.provider}`);
    }
  }
};

// src/ui/PublishTargetModal.ts
var import_obsidian7 = require("obsidian");
var PublishTargetModal = class extends import_obsidian7.SuggestModal {
  constructor(app, targets, onChooseTarget) {
    super(app);
    this.targets = targets;
    this.onChooseTarget = onChooseTarget;
    this.setPlaceholder("Select a publish target");
  }
  getSuggestions(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return this.targets;
    }
    return this.targets.filter(
      (target) => [target.name, target.provider].some((value) => value.toLowerCase().includes(normalized))
    );
  }
  renderSuggestion(target, el) {
    el.createEl("div", { text: target.name });
    el.createEl("small", { text: target.provider });
  }
  onChooseSuggestion(target) {
    this.onChooseTarget(target);
  }
};

// src/ui/UltimatePublisherSettingTab.ts
var import_obsidian8 = require("obsidian");
function providerLabel(target) {
  switch (target.provider) {
    case "wordpress":
      return "WordPress";
    case "yuque":
      return "Yuque";
    case "local-export":
      return "Local Export";
  }
}
var UltimatePublisherSettingTab = class extends import_obsidian8.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Ultimate Publisher" });
    containerEl.createEl("p", {
      cls: "ultimate-publisher-empty-state",
      text: "Configure one or more targets, then run the command to publish the active note."
    });
    new import_obsidian8.Setting(containerEl).setName("Add WordPress target").setDesc("REST API endpoint with application password auth.").addButton(
      (button) => button.setButtonText("Add").onClick(async () => {
        await this.plugin.addTarget(createWordpressTarget());
        this.display();
      })
    );
    new import_obsidian8.Setting(containerEl).setName("Add Yuque target").setDesc("Token-based publishing to a Yuque repository.").addButton(
      (button) => button.setButtonText("Add").onClick(async () => {
        await this.plugin.addTarget(createYuqueTarget());
        this.display();
      })
    );
    new import_obsidian8.Setting(containerEl).setName("Add Local Export target").setDesc("Write Markdown and copied assets to a local directory.").addButton(
      (button) => button.setButtonText("Add").onClick(async () => {
        await this.plugin.addTarget(createLocalExportTarget());
        this.display();
      })
    );
    if (this.plugin.settings.targets.length === 0) {
      containerEl.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: "No targets configured yet."
      });
      return;
    }
    for (const target of this.plugin.settings.targets) {
      const group = containerEl.createDiv({
        cls: `ultimate-publisher-setting-group ${target.enabled ? "" : "is-disabled"}`
      });
      group.createEl("h4", { text: `${target.name} (${providerLabel(target)})` });
      new import_obsidian8.Setting(group).setName("Enabled").addToggle(
        (toggle) => toggle.setValue(target.enabled).onChange(async (value) => {
          await this.plugin.updateTarget(target.id, (draft) => {
            draft.enabled = value;
          });
        })
      );
      new import_obsidian8.Setting(group).setName("Display name").addText(
        (text) => text.setPlaceholder("Target name").setValue(target.name).onChange(async (value) => {
          await this.plugin.updateTarget(target.id, (draft) => {
            draft.name = value || providerLabel(draft);
          });
        })
      );
      if (target.provider === "wordpress") {
        new import_obsidian8.Setting(group).setName("Endpoint").setDesc("Example: https://example.com").addText(
          (text) => text.setValue(target.endpoint).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "wordpress") {
                draft.endpoint = value.trim();
              }
            });
          })
        );
        new import_obsidian8.Setting(group).setName("Username").addText(
          (text) => text.setValue(target.username).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "wordpress") {
                draft.username = value.trim();
              }
            });
          })
        );
        new import_obsidian8.Setting(group).setName("Application password").addText((text) => {
          text.inputEl.type = "password";
          text.setValue(target.appPassword).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "wordpress") {
                draft.appPassword = value.trim();
              }
            });
          });
        });
        new import_obsidian8.Setting(group).setName("Default status").addDropdown(
          (dropdown) => dropdown.addOption("draft", "Draft").addOption("publish", "Publish").addOption("private", "Private").addOption("pending", "Pending").setValue(target.defaultStatus).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "wordpress") {
                draft.defaultStatus = value;
              }
            });
          })
        );
        new import_obsidian8.Setting(group).setName("Publish format").setDesc("Choose whether WordPress receives Markdown text or rendered HTML.").addDropdown(
          (dropdown) => dropdown.addOption("markdown", "Markdown").addOption("html", "HTML").setValue(target.contentFormat).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "wordpress") {
                draft.contentFormat = value;
              }
            });
          })
        );
      }
      if (target.provider === "yuque") {
        new import_obsidian8.Setting(group).setName("Base URL").addText(
          (text) => text.setValue(target.baseUrl).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "yuque") {
                draft.baseUrl = value.trim();
              }
            });
          })
        );
        new import_obsidian8.Setting(group).setName("Repo").setDesc("Example: namespace/repo").addText(
          (text) => text.setValue(target.repo).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "yuque") {
                draft.repo = value.trim();
              }
            });
          })
        );
        new import_obsidian8.Setting(group).setName("Token").addText((text) => {
          text.inputEl.type = "password";
          text.setValue(target.token).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "yuque") {
                draft.token = value.trim();
              }
            });
          });
        });
        new import_obsidian8.Setting(group).setName("Public level").setDesc("0 = private, 1 = public").addDropdown(
          (dropdown) => dropdown.addOption("0", "Private").addOption("1", "Public").setValue(String(target.publicLevel)).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "yuque") {
                draft.publicLevel = Number(value);
              }
            });
          })
        );
      }
      if (target.provider === "local-export") {
        new import_obsidian8.Setting(group).setName("Output directory").setDesc("Absolute directory path on the local machine.").addText(
          (text) => text.setValue(target.outputDir).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "local-export") {
                draft.outputDir = value.trim();
              }
            });
          })
        );
        new import_obsidian8.Setting(group).setName("YAML type").addDropdown(
          (dropdown) => dropdown.addOption("default", "Default").addOption("hexo", "Hexo").setValue(target.yamlType).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "local-export") {
                draft.yamlType = value;
              }
            });
          })
        );
        new import_obsidian8.Setting(group).setName("Asset directory name").addText(
          (text) => text.setValue(target.assetDirName).onChange(async (value) => {
            await this.plugin.updateTarget(target.id, (draft) => {
              if (draft.provider === "local-export") {
                draft.assetDirName = value.trim() || "assets";
              }
            });
          })
        );
      }
      new import_obsidian8.Setting(group).setName("Remove target").setDesc("Delete this target and any saved publish records for it.").addButton(
        (button) => button.setWarning().setButtonText("Remove").onClick(async () => {
          await this.plugin.removeTarget(target.id);
          this.display();
        })
      );
    }
  }
};

// src/ui/modals/BatchPublishModal.ts
var import_obsidian9 = require("obsidian");

// src/ui/publishSummary.ts
var DEFAULT_DASHBOARD_RECORD_LIMIT = 10;
function parseTimestamp(timestamp) {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}
function compareTimestampsDesc(a, b) {
  return parseTimestamp(b) - parseTimestamp(a);
}
function isAfter(candidate, reference) {
  return parseTimestamp(candidate) > parseTimestamp(reference);
}
function compareTargetsForModalDefaults(a, b) {
  if (a.enabled === b.enabled) {
    return a.name.localeCompare(b.name);
  }
  return a.enabled ? -1 : 1;
}
function mapLatestRecordByTarget(records) {
  return records.reduce((acc, record) => {
    const existing = acc.get(record.targetId);
    if (!existing || isAfter(record.lastPublishedAt, existing.lastPublishedAt)) {
      acc.set(record.targetId, record);
    }
    return acc;
  }, /* @__PURE__ */ new Map());
}
function deriveDashboardSummary(settings, recordLimit = DEFAULT_DASHBOARD_RECORD_LIMIT) {
  const configuredCount = settings.targets.length;
  const enabledCount = settings.targets.filter((target) => target.enabled).length;
  const limit = Math.max(0, recordLimit);
  const recentRecords = [...settings.records].sort((a, b) => compareTimestampsDesc(a.lastPublishedAt, b.lastPublishedAt)).slice(0, limit);
  const latestRecords = mapLatestRecordByTarget(settings.records);
  const targetSummaries = settings.targets.map((target) => ({
    targetId: target.id,
    name: target.name,
    provider: target.provider,
    enabled: target.enabled,
    lastPublishedAt: latestRecords.get(target.id)?.lastPublishedAt
  })).sort((a, b) => a.name.localeCompare(b.name));
  return {
    configuredCount,
    enabledCount,
    recentRecords,
    recordLimit: limit,
    targetSummaries
  };
}
function deriveNoteTargetSummaries(settings, notePath) {
  const recordsForNote = settings.records.filter((record) => record.notePath === notePath);
  const latestRecords = mapLatestRecordByTarget(recordsForNote);
  const summaries = settings.targets.map((target) => {
    const record = latestRecords.get(target.id);
    return {
      targetId: target.id,
      name: target.name,
      provider: target.provider,
      enabled: target.enabled,
      action: record ? "update" : "publish",
      lastPublishedAt: record?.lastPublishedAt
    };
  });
  return summaries.sort(compareTargetsForModalDefaults);
}
function summarizeBatchSelection(targets, selectedTargetIds) {
  const selectedSet = new Set(selectedTargetIds);
  const selectedTargets = targets.filter((target) => selectedSet.has(target.targetId));
  const publishCount = selectedTargets.filter((target) => target.action === "publish").length;
  const updateCount = selectedTargets.filter((target) => target.action === "update").length;
  return {
    selectedCount: selectedTargets.length,
    publishCount,
    updateCount
  };
}

// src/ui/modals/BatchPublishModal.ts
var BatchPublishModal = class extends import_obsidian9.Modal {
  constructor(plugin, file, workflow) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
    this.workflow = workflow;
    this.selectedTargetIds = /* @__PURE__ */ new Set();
    this.noteSnapshot = null;
    this.enabledSummaries = [];
    this.isPublishing = false;
    this.fatalErrorMessage = null;
    this.results = [];
    this.lastRunSummary = null;
  }
  async onOpen() {
    this.noteSnapshot = {
      basename: this.file.basename,
      path: this.file.path
    };
    this.enabledSummaries = deriveNoteTargetSummaries(this.plugin.settings, this.file.path).filter((item) => item.enabled);
    this.selectedTargetIds.clear();
    for (const summary of this.enabledSummaries) {
      this.selectedTargetIds.add(summary.targetId);
    }
    await this.render();
  }
  onClose() {
    this.contentEl.empty();
  }
  openPublishSettings() {
    const appWithSettings = this.app;
    appWithSettings.setting?.open();
    appWithSettings.setting?.openTabById(this.plugin.manifest.id);
  }
  getSelectedTargets() {
    return this.plugin.settings.targets.filter(
      (target) => target.enabled && this.selectedTargetIds.has(target.id)
    );
  }
  toggleTargetSelection(targetId, checked) {
    if (checked) {
      this.selectedTargetIds.add(targetId);
      return;
    }
    this.selectedTargetIds.delete(targetId);
  }
  renderResultSection(container) {
    if (this.results.length === 0) {
      return;
    }
    container.createEl("h3", { text: "Batch Results" });
    const summary = this.lastRunSummary ?? {
      totalCount: this.results.length,
      successCount: this.results.filter((item) => item.status === "success").length,
      failureCount: this.results.filter((item) => item.status === "failure").length
    };
    container.createEl("p", {
      text: `Completed ${summary.totalCount} targets: ${summary.successCount} succeeded, ${summary.failureCount} failed.`
    });
    const list = container.createEl("ul");
    for (const result of this.results) {
      const item = list.createEl("li");
      const actionLabel = result.action === "update" ? "update" : "publish";
      if (result.status === "success") {
        const remoteDetail = result.remoteUrl ? ` (${result.remoteUrl})` : "";
        item.setText(`${result.targetName}: success (${actionLabel})${remoteDetail}`);
        continue;
      }
      const failure = result.error?.message ?? "Unknown error";
      item.setText(`${result.targetName}: failed (${actionLabel}) - ${failure}`);
    }
  }
  async handleBatchPublish() {
    const selectedTargets = this.getSelectedTargets();
    if (selectedTargets.length === 0) {
      new import_obsidian9.Notice("Select at least one target before running batch publish.", 6e3);
      return;
    }
    this.isPublishing = true;
    this.fatalErrorMessage = null;
    this.results = [];
    this.lastRunSummary = null;
    await this.render();
    try {
      const result = await this.workflow.runBatch(this.file, selectedTargets, this.plugin.settings);
      this.plugin.settings = result.settings;
      await this.plugin.saveSettings();
      this.results = result.results;
      this.lastRunSummary = {
        totalCount: result.totalCount,
        successCount: result.successCount,
        failureCount: result.failureCount
      };
      new import_obsidian9.Notice(
        `Batch publish finished: ${result.successCount} succeeded, ${result.failureCount} failed.`,
        6e3
      );
    } catch (error) {
      this.fatalErrorMessage = error instanceof Error ? error.message : String(error);
      new import_obsidian9.Notice(`Batch publish failed: ${this.fatalErrorMessage}`, 8e3);
    } finally {
      this.isPublishing = false;
      await this.render();
    }
  }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Batch Publish" });
    if (this.noteSnapshot) {
      const noteInfo = contentEl.createDiv();
      noteInfo.createEl("strong", { text: "Note: " });
      noteInfo.createSpan({ text: this.noteSnapshot.basename });
      noteInfo.createEl("br");
      noteInfo.createEl("strong", { text: "Path: " });
      noteInfo.createSpan({ text: this.noteSnapshot.path });
    }
    if (this.enabledSummaries.length === 0) {
      contentEl.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: "No enabled publish targets. Open settings to enable at least one target."
      });
      const settingsButton2 = contentEl.createEl("button", { text: "Open Publish Settings" });
      settingsButton2.addEventListener("click", () => {
        this.openPublishSettings();
      });
      return;
    }
    const targetSection = contentEl.createDiv();
    targetSection.createEl("h3", { text: "Targets" });
    for (const summary of this.enabledSummaries) {
      const row = targetSection.createEl("label");
      row.style.display = "block";
      row.style.margin = "6px 0";
      const input = row.createEl("input", { type: "checkbox" });
      input.checked = this.selectedTargetIds.has(summary.targetId);
      input.disabled = this.isPublishing;
      input.addEventListener("change", () => {
        this.toggleTargetSelection(summary.targetId, input.checked);
        void this.render();
      });
      const actionLabel = summary.action === "update" ? "Update existing post" : "Publish new post";
      row.appendText(` ${summary.name} (${summary.provider}) - ${actionLabel}`);
    }
    const selectionSummary = summarizeBatchSelection(
      this.enabledSummaries.map((item) => ({
        targetId: item.targetId,
        action: item.action,
        enabled: item.enabled
      })),
      Array.from(this.selectedTargetIds)
    );
    contentEl.createEl("p", {
      text: `Selected ${selectionSummary.selectedCount} targets (${selectionSummary.publishCount} publish, ${selectionSummary.updateCount} update).`
    });
    if (this.isPublishing) {
      contentEl.createEl("p", {
        text: "Batch publish is running sequentially. Please wait..."
      });
    }
    if (this.fatalErrorMessage) {
      contentEl.createEl("p", {
        cls: "mod-warning",
        text: `Batch failed before completion: ${this.fatalErrorMessage}`
      });
    }
    this.renderResultSection(contentEl);
    const actions = contentEl.createDiv({ cls: "ultimate-publisher-setting-actions" });
    const runButton = actions.createEl("button", { text: "Run Batch Publish" });
    runButton.toggleClass("mod-cta", true);
    runButton.disabled = this.isPublishing || this.selectedTargetIds.size === 0;
    runButton.addEventListener("click", () => {
      void this.handleBatchPublish();
    });
    const settingsButton = actions.createEl("button", { text: "Open Publish Settings" });
    settingsButton.disabled = this.isPublishing;
    settingsButton.addEventListener("click", () => {
      this.openPublishSettings();
    });
  }
};

// src/ui/modals/NormalPublishModal.ts
var import_obsidian10 = require("obsidian");
var NormalPublishModal = class extends import_obsidian10.Modal {
  constructor(plugin, file, workflow) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
    this.workflow = workflow;
    this.selectedTargetId = null;
    this.isPublishing = false;
    this.errorMessage = null;
  }
  async onOpen() {
    await this.render();
  }
  onClose() {
    this.contentEl.empty();
  }
  openPublishSettings() {
    const appWithSettings = this.app;
    appWithSettings.setting?.open();
    appWithSettings.setting?.openTabById(this.plugin.manifest.id);
  }
  getTargetById(targetId) {
    return this.plugin.settings.targets.find((target) => target.id === targetId);
  }
  createInfoRow(container, label, value) {
    const row = container.createDiv();
    row.createEl("strong", { text: `${label}: ` });
    row.createSpan({ text: value });
  }
  async handlePublish(target) {
    this.isPublishing = true;
    this.errorMessage = null;
    await this.render();
    try {
      const result = await this.workflow.runSingle(this.file, target, this.plugin.settings);
      this.plugin.settings = result.settings;
      await this.plugin.saveSettings();
      new import_obsidian10.Notice(`Publish succeeded: ${target.name} ${result.action}.`);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
      new import_obsidian10.Notice(`Publish failed: ${this.errorMessage}`, 8e3);
    } finally {
      this.isPublishing = false;
      await this.render();
    }
  }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Normal Publish" });
    const noteInfo = contentEl.createDiv();
    this.createInfoRow(noteInfo, "Note", this.file.basename);
    this.createInfoRow(noteInfo, "Path", this.file.path);
    const summaries = deriveNoteTargetSummaries(this.plugin.settings, this.file.path);
    this.selectedTargetId ?? (this.selectedTargetId = summaries.find((item) => item.enabled)?.targetId ?? null);
    const enabledSummaries = summaries.filter((item) => item.enabled);
    if (enabledSummaries.length === 0) {
      contentEl.createEl("p", {
        cls: "ultimate-publisher-empty-state",
        text: "No enabled publish targets. Open settings to enable at least one target."
      });
      const settingsButton2 = contentEl.createEl("button", { text: "Open Publish Settings" });
      settingsButton2.addEventListener("click", () => {
        this.openPublishSettings();
      });
      return;
    }
    if (!this.selectedTargetId || !summaries.some((item) => item.targetId === this.selectedTargetId && item.enabled)) {
      this.selectedTargetId = enabledSummaries[0].targetId;
    }
    const targetList = contentEl.createDiv();
    targetList.createEl("h3", { text: "Target" });
    for (const summary of summaries) {
      const row = targetList.createEl("label");
      row.style.display = "block";
      row.style.margin = "6px 0";
      const input = row.createEl("input", { type: "radio" });
      input.name = "ultimate-publisher-normal-target";
      input.value = summary.targetId;
      input.checked = summary.targetId === this.selectedTargetId;
      input.disabled = !summary.enabled || this.isPublishing;
      input.addEventListener("change", () => {
        if (input.checked) {
          this.selectedTargetId = summary.targetId;
          void this.render();
        }
      });
      row.appendText(` ${summary.name} (${summary.provider})`);
      row.createEl("small", {
        text: ` - ${summary.action === "update" ? "Update existing post" : "Publish new post"}${summary.enabled ? "" : " (disabled)"}`
      });
    }
    const selectedSummary = summaries.find((item) => item.targetId === this.selectedTargetId) ?? null;
    const selectedAction = selectedSummary?.action ?? "publish";
    contentEl.createEl("p", {
      text: `Selected action: ${selectedAction === "update" ? "update" : "publish"}`
    });
    if (this.errorMessage) {
      contentEl.createEl("p", {
        cls: "mod-warning",
        text: `Last error: ${this.errorMessage}`
      });
    }
    const actions = contentEl.createDiv({ cls: "ultimate-publisher-setting-actions" });
    const publishButton = actions.createEl("button", {
      text: selectedAction === "update" ? "Update" : "Publish"
    });
    publishButton.toggleClass("mod-cta", true);
    publishButton.disabled = this.isPublishing || !this.selectedTargetId;
    publishButton.addEventListener("click", () => {
      if (!this.selectedTargetId) {
        return;
      }
      const target = this.getTargetById(this.selectedTargetId);
      if (!target || !target.enabled) {
        this.errorMessage = "Selected target is not available.";
        new import_obsidian10.Notice(this.errorMessage, 6e3);
        void this.render();
        return;
      }
      void this.handlePublish(target);
    });
    const settingsButton = actions.createEl("button", { text: "Open Publish Settings" });
    settingsButton.disabled = this.isPublishing;
    settingsButton.addEventListener("click", () => {
      this.openPublishSettings();
    });
  }
};

// src/ui/publisherMenu.ts
var ROOT_MENU_ITEMS = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: "layout-dashboard",
    section: "ultimate-publisher-dashboard"
  },
  {
    key: "quick-publish",
    title: "Quick Publish",
    icon: "zap",
    section: "ultimate-publisher-quick-publish"
  },
  {
    key: "normal-publish",
    title: "Normal Publish",
    icon: "send",
    section: "ultimate-publisher-normal-publish"
  },
  {
    key: "batch-publish",
    title: "Batch Publish",
    icon: "layers-3",
    section: "ultimate-publisher-batch-publish"
  },
  {
    key: "publish-settings",
    title: "Publish Settings",
    icon: "settings",
    section: "ultimate-publisher-settings"
  }
];
function buildPublisherMenuModel(context) {
  const noteDependentDisabled = !context.hasActiveMarkdown;
  const quickPublishChildren = buildQuickPublishChildren(context.enabledTargets);
  return [
    {
      ...ROOT_MENU_ITEMS[0],
      disabled: false
    },
    {
      ...ROOT_MENU_ITEMS[1],
      disabled: noteDependentDisabled,
      children: quickPublishChildren
    },
    {
      ...ROOT_MENU_ITEMS[2],
      disabled: noteDependentDisabled
    },
    {
      ...ROOT_MENU_ITEMS[3],
      disabled: noteDependentDisabled
    },
    {
      ...ROOT_MENU_ITEMS[4]
    }
  ];
}
function getProviderIcon(provider) {
  switch (provider) {
    case "wordpress":
      return "globe";
    case "yuque":
      return "book";
    case "local-export":
      return "folder";
    default:
      return "upload";
  }
}
function buildQuickPublishChildren(enabledTargets) {
  if (enabledTargets.length === 0) {
    return [
      {
        key: "quick-publish-empty",
        title: "Enable at least one publish target",
        icon: "circle-alert",
        section: "ultimate-publisher-quick-publish-empty",
        helpText: "No quick publish targets are enabled",
        disabled: true
      }
    ];
  }
  return [...enabledTargets].sort((a, b) => a.name.localeCompare(b.name)).map((target) => ({
    key: "quick-publish-target",
    title: target.name,
    icon: getProviderIcon(target.provider),
    section: "ultimate-publisher-quick-publish-targets",
    helpText: target.provider,
    targetId: target.id
  }));
}

// src/ui/views/PublisherDashboardView.ts
var import_obsidian11 = require("obsidian");
var PUBLISHER_DASHBOARD_VIEW_TYPE = "ultimate-publisher-dashboard";
function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Never";
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }
  return parsed.toLocaleString();
}
var PublisherDashboardView = class extends import_obsidian11.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return PUBLISHER_DASHBOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "Ultimate Publisher";
  }
  async onOpen() {
    await this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  async render() {
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
        text: "No publish targets configured yet."
      });
    } else {
      const statusList = statusSection.createDiv({
        cls: "ultimate-publisher-status-list ultimate-publisher-target-list"
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
        text: "No publish activity recorded yet."
      });
    } else {
      const targetNames = new Map(summary.targetSummaries.map((target) => [target.targetId, target.name]));
      const recordList = recordSection.createDiv({ cls: "ultimate-publisher-record-list" });
      for (const record of summary.recentRecords) {
        const row = recordList.createDiv({ cls: "ultimate-publisher-record-row" });
        row.createEl("strong", { text: record.notePath });
        const meta = row.createDiv({ cls: "ultimate-publisher-meta" });
        meta.createSpan({
          text: `${targetNames.get(record.targetId) ?? record.targetId} (${record.provider})`
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
  renderCard(container, label, value, helpText) {
    const card = container.createDiv({ cls: "ultimate-publisher-card" });
    card.createDiv({
      cls: "ultimate-publisher-card-label",
      text: label
    });
    card.createDiv({
      cls: "ultimate-publisher-card-value",
      text: value
    });
    card.createDiv({
      cls: "ultimate-publisher-card-help",
      text: helpText
    });
  }
  renderTargetStatus(container, target) {
    const row = container.createDiv({ cls: "ultimate-publisher-status-row" });
    const details = row.createDiv({ cls: "ultimate-publisher-status-row-main" });
    details.createEl("strong", { text: target.name });
    details.createDiv({
      cls: "ultimate-publisher-meta",
      text: `${target.provider} - ${target.lastPublishedAt ? formatTimestamp(target.lastPublishedAt) : "Never published"}`
    });
    const badge = row.createSpan({
      cls: "ultimate-publisher-status-badge",
      text: target.enabled ? "Enabled" : "Disabled"
    });
    badge.toggleClass("is-enabled", target.enabled);
    badge.toggleClass("is-disabled", !target.enabled);
  }
};

// src/plugin.ts
var UltimatePublisherPlugin = class extends import_obsidian12.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    const providers = new ProviderRegistry(this.app);
    this.publishService = new PublishService(this.app, providers);
    this.publishWorkflow = new PublishWorkflow(this.publishService);
    this.registerView(PUBLISHER_DASHBOARD_VIEW_TYPE, (leaf) => new PublisherDashboardView(leaf, this));
    this.addRibbonIcon("upload", "Ultimate Publisher", (event) => {
      const anchorEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
      this.openRibbonMenu(anchorEl);
    });
    this.addCommand({
      id: "publish-active-note",
      name: "Publish active note",
      callback: () => {
        void this.publishActiveNote();
      }
    });
    this.addSettingTab(new UltimatePublisherSettingTab(this));
  }
  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      targets: (loaded?.targets ?? []).map((target) => normalizeTarget(target)),
      records: loaded?.records ?? []
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async addTarget(target) {
    this.settings = {
      ...this.settings,
      targets: [...this.settings.targets, normalizeTarget(cloneTarget(target))]
    };
    await this.saveSettings();
  }
  async updateTarget(targetId, updater) {
    this.settings = {
      ...this.settings,
      targets: this.settings.targets.map((target) => {
        if (target.id !== targetId) {
          return target;
        }
        const draft = normalizeTarget(cloneTarget(target));
        updater(draft);
        return normalizeTarget(draft);
      })
    };
    await this.saveSettings();
  }
  async removeTarget(targetId) {
    this.settings = {
      ...this.settings,
      targets: this.settings.targets.filter((target) => target.id !== targetId),
      records: this.settings.records.filter((record) => record.targetId !== targetId)
    };
    await this.saveSettings();
  }
  openRibbonMenu(anchorEl) {
    const activeFile = this.getActiveMarkdownFile();
    const menuModel = buildPublisherMenuModel({
      hasActiveMarkdown: Boolean(activeFile),
      enabledTargets: this.getEnabledTargets().map(({ id, name, provider }) => ({
        id,
        name,
        provider
      }))
    });
    this.showPublisherMenu(menuModel, this.getRootMenuPosition(anchorEl));
  }
  async openDashboard() {
    const existingLeaf = this.app.workspace.getLeavesOfType(PUBLISHER_DASHBOARD_VIEW_TYPE)[0];
    const leaf = existingLeaf ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new import_obsidian12.Notice("Unable to open the publisher dashboard.");
      return;
    }
    await leaf.setViewState({
      type: PUBLISHER_DASHBOARD_VIEW_TYPE,
      active: true
    });
    await this.app.workspace.revealLeaf(leaf);
    if (leaf.view instanceof PublisherDashboardView) {
      await leaf.view.render();
    }
  }
  openNormalPublishForActiveNote() {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new import_obsidian12.Notice("Open a Markdown note before publishing.");
      return;
    }
    new NormalPublishModal(this, file, this.publishWorkflow).open();
  }
  openBatchPublishForActiveNote() {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new import_obsidian12.Notice("Open a Markdown note before publishing.");
      return;
    }
    new BatchPublishModal(this, file, this.publishWorkflow).open();
  }
  async runQuickPublishForTarget(targetId) {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new import_obsidian12.Notice("Open a Markdown note before publishing.");
      return;
    }
    const target = this.getEnabledTargets().find((item) => item.id === targetId);
    if (!target) {
      new import_obsidian12.Notice("Enable the selected publish target before using Quick Publish.", 6e3);
      return;
    }
    await this.publishToTarget(file, target);
  }
  openPublishSettings() {
    const appWithSettings = this.app;
    appWithSettings.setting?.open();
    appWithSettings.setting?.openTabById(this.manifest.id);
  }
  async publishActiveNote() {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new import_obsidian12.Notice("Open a Markdown note before publishing.");
      return;
    }
    const targets = this.getEnabledTargets();
    if (targets.length === 0) {
      new import_obsidian12.Notice("Configure at least one enabled publish target first.");
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
  getEnabledTargets() {
    return this.settings.targets.filter((target) => target.enabled);
  }
  getActiveMarkdownFile() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian12.MarkdownView);
    const file = view?.file ?? this.app.workspace.getActiveFile();
    if (!(file instanceof import_obsidian12.TFile) || file.extension !== "md") {
      return null;
    }
    return file;
  }
  showPublisherMenu(items, position) {
    const menu = new import_obsidian12.Menu();
    menu.setUseNativeMenu(false);
    for (const item of items) {
      menu.addItem((menuItem) => {
        menuItem.setTitle(item.title).setIcon(item.icon).setSection(item.section).setDisabled(Boolean(item.disabled));
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
  getRootMenuPosition(anchorEl) {
    if (!anchorEl) {
      return { x: 0, y: 0 };
    }
    const rect = anchorEl.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.bottom,
      width: rect.width
    };
  }
  getChildMenuPosition(event) {
    const anchor = this.resolveRectAnchor(event?.currentTarget);
    if (!anchor) {
      return { x: 0, y: 0 };
    }
    const rect = anchor.getBoundingClientRect();
    return {
      x: rect.right,
      y: rect.top,
      width: rect.width
    };
  }
  resolveRectAnchor(value) {
    if (!value || typeof value !== "object" || !("getBoundingClientRect" in value)) {
      return null;
    }
    const candidate = value;
    return typeof candidate.getBoundingClientRect === "function" ? candidate : null;
  }
  handleMenuItem(item) {
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
  async publishToTarget(file, target) {
    new import_obsidian12.Notice(`Publishing "${file.basename}" to ${target.name}...`);
    try {
      const result = await this.publishWorkflow.runSingle(file, target, this.settings);
      this.settings = result.settings;
      await this.saveSettings();
      const actionLabel = result.action === "update" ? "updated" : "published";
      new import_obsidian12.Notice(`Publish succeeded: ${target.name} ${actionLabel}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian12.Notice(`Publish failed: ${message}`, 8e3);
      throw error;
    }
  }
};

// main.ts
var main_default = UltimatePublisherPlugin;
