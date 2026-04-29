import { requestUrl } from "obsidian";
import { PublishableNote } from "../core/note";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import { MediaSupport, ProviderRuntimeOptions, PublisherProvider, PublishResult, assertRemoteAssetsSupported } from "../core/providers";
import { buildPreviewUrl, buildStaticSiteContentPath, buildStaticSiteMarkdown, renderCommitMessage } from "../core/staticSite/content";
import { GitlabTargetConfig } from "../types";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseJson(text: string): unknown {
  if (!text.trim()) return undefined;
  try { return JSON.parse(text); } catch { return undefined; }
}

function apiBase(target: GitlabTargetConfig): string {
  return `${trimTrailingSlash(target.baseUrl || "https://gitlab.com")}/api/v4`;
}

function encodeFilePath(path: string): string {
  return encodeURIComponent(path);
}

async function requestGitlab<T>(target: GitlabTargetConfig, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await requestUrl({
    url: `${apiBase(target)}${path}`,
    method,
    headers: {
      "PRIVATE-TOKEN": target.token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    throw: false,
  });
  const payload = response.json ?? parseJson(response.text ?? "");
  if (response.status >= 400) {
    const message = typeof payload === "object" && payload && "message" in payload ? String((payload as { message: unknown }).message) : response.text;
    throw new Error(`GitLab request failed (${response.status}): ${message}`);
  }
  return payload as T;
}

function projectPath(target: GitlabTargetConfig): string {
  return `/projects/${encodeURIComponent(target.projectIdOrPath)}`;
}

function buildPayload(note: PublishableNote, target: GitlabTargetConfig, path: string): Record<string, unknown> {
  return {
    branch: target.branch,
    commit_message: renderCommitMessage(target.commitMessageTemplate, note, path),
    content: buildStaticSiteMarkdown(note),
  };
}

export class GitlabProvider implements PublisherProvider<GitlabTargetConfig> {
  readonly provider = "gitlab" as const;

  getMediaSupport(_target: GitlabTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: GitlabTargetConfig): Promise<void> {
    if (!target.baseUrl || !target.projectIdOrPath || !target.branch || !target.token) {
      throw new Error("GitLab target is missing baseUrl, projectIdOrPath, branch, or token.");
    }
    await requestGitlab(target, projectPath(target));
  }

  async publish(note: PublishableNote, target: GitlabTargetConfig, _context?: NormalPublishExecutionContext, _runtime?: ProviderRuntimeOptions<GitlabTargetConfig>): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const path = buildStaticSiteContentPath(note, { generator: target.siteGenerator, contentRoot: target.contentRoot });
    await requestGitlab(target, `${projectPath(target)}/repository/files/${encodeFilePath(path)}`, "POST", buildPayload(note, target, path));
    return { remoteId: path, remoteUrl: buildPreviewUrl(target.previewBaseUrl, path) };
  }

  async update(remoteId: string, note: PublishableNote, target: GitlabTargetConfig, _context?: NormalPublishExecutionContext, _runtime?: ProviderRuntimeOptions<GitlabTargetConfig>): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const path = remoteId || buildStaticSiteContentPath(note, { generator: target.siteGenerator, contentRoot: target.contentRoot });
    await requestGitlab(target, `${projectPath(target)}/repository/files/${encodeFilePath(path)}`, "PUT", buildPayload(note, target, path));
    return { remoteId: path, remoteUrl: buildPreviewUrl(target.previewBaseUrl, path) };
  }

  async delete(_remoteId: string, _target: GitlabTargetConfig): Promise<void> {
    throw new Error("GitLab static-site delete is not supported yet.");
  }

  async getPreviewUrl(remoteId: string, target: GitlabTargetConfig): Promise<string | undefined> {
    return buildPreviewUrl(target.previewBaseUrl, remoteId);
  }
}
