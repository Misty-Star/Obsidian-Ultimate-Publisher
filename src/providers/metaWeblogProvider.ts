import { App, requestUrl } from "obsidian";
import { PreparedHtmlNote } from "../core/content";
import { renderMarkdownToHtml } from "../core/html";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import {
  MediaSupport,
  ProviderRuntimeOptions,
  PublisherProvider,
  PublishResult,
} from "../core/providers";
import { PublishableNote } from "../core/note";
import { MetaWeblogProviderId, MetaWeblogTargetConfig } from "../types";

interface XmlRpcValue {
  string?: string;
  int?: number;
  boolean?: boolean;
  dateTime?: string;
  struct?: Record<string, XmlRpcValue>;
  array?: XmlRpcValue[];
}

type XmlRpcScalar = string | number | boolean | Date | Record<string, unknown> | unknown[];

interface XmlRpcResponse {
  fault?: string;
  value?: unknown;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderXmlRpcValue(value: XmlRpcScalar): string {
  if (value instanceof Date) {
    return `<value><dateTime.iso8601>${value.toISOString()}</dateTime.iso8601></value>`;
  }
  if (typeof value === "number") {
    return `<value><int>${value}</int></value>`;
  }
  if (typeof value === "boolean") {
    return `<value><boolean>${value ? 1 : 0}</boolean></value>`;
  }
  if (Array.isArray(value)) {
    return `<value><array><data>${value.map((item) => renderXmlRpcValue(item as XmlRpcScalar)).join("")}</data></array></value>`;
  }
  if (value && typeof value === "object") {
    const members = Object.entries(value)
      .filter(([, memberValue]) => memberValue !== undefined)
      .map(([key, memberValue]) => `<member><name>${escapeXml(key)}</name>${renderXmlRpcValue(memberValue as XmlRpcScalar)}</member>`)
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${escapeXml(String(value ?? ""))}</string></value>`;
}

function buildXmlRpcRequest(methodName: string, params: XmlRpcScalar[]): string {
  const renderedParams = params.map((param) => `<param>${renderXmlRpcValue(param)}</param>`).join("");
  return `<?xml version="1.0"?><methodCall><methodName>${escapeXml(methodName)}</methodName><params>${renderedParams}</params></methodCall>`;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readTag(body: string, tag: string): string | undefined {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = body.match(pattern);
  return match ? decodeXmlEntities(match[1].trim()) : undefined;
}

function parseXmlRpcResponse(xml: string): XmlRpcResponse {
  const faultBody = readTag(xml, "fault");
  if (faultBody) {
    return { fault: readTag(faultBody, "string") ?? faultBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() };
  }

  const paramBody = readTag(xml, "param") ?? xml;
  const stringValue = readTag(paramBody, "string");
  if (stringValue !== undefined) {
    return { value: stringValue };
  }
  const intValue = readTag(paramBody, "int") ?? readTag(paramBody, "i4");
  if (intValue !== undefined) {
    return { value: Number(intValue) };
  }
  const booleanValue = readTag(paramBody, "boolean");
  if (booleanValue !== undefined) {
    return { value: booleanValue === "1" || booleanValue.toLowerCase() === "true" };
  }
  return { value: paramBody };
}

async function callMetaWeblog(target: MetaWeblogTargetConfig, methodName: string, params: XmlRpcScalar[]): Promise<unknown> {
  const response = await requestUrl({
    url: target.endpoint,
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
    },
    body: buildXmlRpcRequest(methodName, params),
    throw: false,
  });

  if (response.status >= 400) {
    throw new Error(`MetaWeblog request failed (${response.status}): ${response.text}`);
  }

  const parsed = parseXmlRpcResponse(response.text);
  if (parsed.fault) {
    throw new Error(`MetaWeblog fault: ${parsed.fault}`);
  }
  return parsed.value;
}

function splitFrontmatterList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function buildPostPayload(note: PublishableNote & PreparedHtmlNote, target: MetaWeblogTargetConfig, context?: NormalPublishExecutionContext): Record<string, unknown> {
  const providerContext = context?.provider.provider === "wordpress" ? context.provider : undefined;
  const content = target.contentFormat === "html" ? note.html ?? note.markdown : note.markdown;
  const categories = providerContext?.categories ?? note.categories;
  const tags = providerContext?.tags ?? note.tags;

  return {
    title: context?.common.title || note.title,
    description: content,
    mt_excerpt: providerContext?.excerpt ?? note.excerpt,
    mt_keywords: tags.join(","),
    categories,
    post_status: providerContext?.status ?? note.frontmatter.status ?? target.defaultStatus,
    wp_slug: providerContext?.slug ?? note.slug,
    wp_password: providerContext?.password || undefined,
    dateCreated: note.frontmatter.date ? new Date(String(note.frontmatter.date)) : undefined,
  };
}

function remoteIdFrom(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error("MetaWeblog response did not include a post id.");
  }
  return text;
}

function previewUrlFromEndpoint(remoteId: string, target: MetaWeblogTargetConfig): string | undefined {
  const base = target.endpoint.replace(/\/?(?:xmlrpc\.php|xmlrpc|api)?\/?$/i, "");
  return base && base !== target.endpoint ? `${base.replace(/\/+$/, "")}/?p=${encodeURIComponent(remoteId)}` : undefined;
}

export class MetaWeblogProvider<TProvider extends MetaWeblogProviderId = MetaWeblogProviderId> implements PublisherProvider<MetaWeblogTargetConfig & { provider: TProvider }> {
  readonly provider: TProvider;

  constructor(private readonly app: App, provider: TProvider) {
    this.provider = provider;
  }

  getMediaSupport(_target: MetaWeblogTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: MetaWeblogTargetConfig): Promise<void> {
    if (!target.endpoint || !target.username || !target.appPassword) {
      throw new Error("MetaWeblog target is missing endpoint, username, or password/token.");
    }
    await callMetaWeblog(target, "blogger.getUsersBlogs", [target.appPassword, target.username, target.appPassword]);
  }

  async publish(
    note: PublishableNote,
    target: MetaWeblogTargetConfig & { provider: TProvider },
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<MetaWeblogTargetConfig & { provider: TProvider }>
  ): Promise<PublishResult> {
    const preparedNote = await this.prepareNote(note);
    const remoteId = remoteIdFrom(
      await callMetaWeblog(target, "metaWeblog.newPost", [
        target.blogId || "default",
        target.username,
        target.appPassword,
        buildPostPayload(preparedNote, target, context),
        target.defaultStatus === "publish",
      ])
    );
    return { remoteId, remoteUrl: previewUrlFromEndpoint(remoteId, target) };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: MetaWeblogTargetConfig & { provider: TProvider },
    context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<MetaWeblogTargetConfig & { provider: TProvider }>
  ): Promise<PublishResult> {
    const preparedNote = await this.prepareNote(note);
    await callMetaWeblog(target, "metaWeblog.editPost", [
      remoteId,
      target.username,
      target.appPassword,
      buildPostPayload(preparedNote, target, context),
      target.defaultStatus === "publish",
    ]);
    return { remoteId, remoteUrl: previewUrlFromEndpoint(remoteId, target) };
  }

  async delete(remoteId: string, target: MetaWeblogTargetConfig & { provider: TProvider }): Promise<void> {
    await callMetaWeblog(target, "blogger.deletePost", [target.appPassword, remoteId, target.username, target.appPassword, true]);
  }

  async getPreviewUrl(remoteId: string, target: MetaWeblogTargetConfig & { provider: TProvider }): Promise<string | undefined> {
    return previewUrlFromEndpoint(remoteId, target);
  }

  private async prepareNote(note: PublishableNote): Promise<PublishableNote & PreparedHtmlNote> {
    const html = await renderMarkdownToHtml(this.app, note.markdown, note.filePath);
    return {
      ...note,
      categories: note.categories.length > 0 ? note.categories : splitFrontmatterList(note.frontmatter.categories),
      tags: note.tags.length > 0 ? note.tags : splitFrontmatterList(note.frontmatter.tags),
      html,
    };
  }
}
