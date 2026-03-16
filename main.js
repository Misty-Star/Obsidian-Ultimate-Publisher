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
var import_obsidian9 = require("obsidian");

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
  const title = typeof frontmatter.title === "string" && frontmatter.title ? frontmatter.title : file.basename;
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

// src/plugin.ts
var UltimatePublisherPlugin = class extends import_obsidian9.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    const providers = new ProviderRegistry(this.app);
    this.publishService = new PublishService(this.app, providers);
    this.addRibbonIcon("upload", "Publish active note", () => {
      void this.publishActiveNote();
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
  getEnabledTargets() {
    return this.settings.targets.filter((target) => target.enabled);
  }
  getActiveMarkdownFile() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
    const file = view?.file ?? this.app.workspace.getActiveFile();
    if (!(file instanceof import_obsidian9.TFile) || file.extension !== "md") {
      return null;
    }
    return file;
  }
  async publishActiveNote() {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new import_obsidian9.Notice("Open a Markdown note before publishing.");
      return;
    }
    const targets = this.getEnabledTargets();
    if (targets.length === 0) {
      new import_obsidian9.Notice("Configure at least one enabled publish target first.");
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
  async publishToTarget(file, target) {
    new import_obsidian9.Notice(`Publishing "${file.basename}" to ${target.name}...`);
    try {
      const result = await this.publishService.publishFile(file, target, this.settings);
      this.settings = this.publishService.updateSettings(this.settings, result.record);
      await this.saveSettings();
      const action = result.created ? "created" : "updated";
      new import_obsidian9.Notice(`Publish succeeded: ${target.name} ${action}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian9.Notice(`Publish failed: ${message}`, 8e3);
      throw error;
    }
  }
};

// main.ts
var main_default = UltimatePublisherPlugin;
