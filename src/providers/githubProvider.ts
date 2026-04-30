import { requestUrl } from "obsidian";
import { PublishableNote } from "../core/note";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import {
  MediaSupport,
  ProviderRuntimeOptions,
  PublisherProvider,
  PublishResult,
  assertRemoteAssetsSupported,
} from "../core/providers";
import {
  buildPreviewUrl,
  buildStaticSiteContentPath,
  buildStaticSiteMarkdown,
  renderCommitMessage,
} from "../core/staticSite/content";
import { GithubStaticSiteProviderId, GithubTargetConfig } from "../types";

interface GithubContentResponse {
  content?: {
    path?: string;
    sha?: string;
    html_url?: string;
  };
  path?: string;
  sha?: string;
  html_url?: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseJson(text: string): unknown {
  if (!text.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function encodeBase64(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(value)));
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function githubApiUrl(target: GithubTargetConfig, path: string): string {
  return `${trimTrailingSlash("https://api.github.com")}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}${path}`;
}

function getContentInfo(payload: GithubContentResponse): { path?: string; sha?: string; htmlUrl?: string } {
  return {
    path: payload.content?.path ?? payload.path,
    sha: payload.content?.sha ?? payload.sha,
    htmlUrl: payload.content?.html_url ?? payload.html_url,
  };
}

async function requestGithub<T>(target: GithubTargetConfig, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await requestUrl({
    url: githubApiUrl(target, path),
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${target.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
    throw: false,
  });

  const payload = response.json ?? parseJson(response.text ?? "");
  if (response.status >= 400) {
    const message = typeof payload === "object" && payload && "message" in payload ? String((payload as { message: unknown }).message) : response.text;
    throw new Error(`GitHub request failed (${response.status}): ${message}`);
  }
  return payload as T;
}

async function getExistingSha(target: GithubTargetConfig, path: string): Promise<string | undefined> {
  const response = await requestGithub<GithubContentResponse>(
    target,
    `/contents/${encodePath(path)}?ref=${encodeURIComponent(target.branch)}`
  );
  return getContentInfo(response).sha;
}

function buildPayload(note: PublishableNote, target: GithubTargetConfig, path: string, sha?: string): Record<string, unknown> {
  return {
    message: renderCommitMessage(target.commitMessageTemplate, note, path),
    content: encodeBase64(buildStaticSiteMarkdown(note)),
    branch: target.branch,
    ...(sha ? { sha } : {}),
  };
}

export class GithubProvider<TProvider extends GithubStaticSiteProviderId = GithubStaticSiteProviderId> implements PublisherProvider<GithubTargetConfig<TProvider>> {
  readonly provider: TProvider;

  constructor(provider: TProvider = "github" as TProvider) {
    this.provider = provider;
  }

  getMediaSupport(_target: GithubTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: GithubTargetConfig): Promise<void> {
    if (!target.owner || !target.repo || !target.branch || !target.token) {
      throw new Error("GitHub target is missing owner, repo, branch, or token.");
    }
    await requestGithub(target, "");
  }

  async publish(
    note: PublishableNote,
    target: GithubTargetConfig,
    _context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<GithubTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const path = buildStaticSiteContentPath(note, {
      generator: target.siteGenerator,
      contentRoot: target.contentRoot,
    });
    const result = await requestGithub<GithubContentResponse>(
      target,
      `/contents/${encodePath(path)}`,
      "PUT",
      buildPayload(note, target, path)
    );
    const info = getContentInfo(result);
    return {
      remoteId: info.path ?? path,
      remoteUrl: buildPreviewUrl(target.previewBaseUrl, info.path ?? path) ?? info.htmlUrl,
    };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: GithubTargetConfig,
    _context?: NormalPublishExecutionContext,
    _runtime?: ProviderRuntimeOptions<GithubTargetConfig>
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const path = remoteId || buildStaticSiteContentPath(note, { generator: target.siteGenerator, contentRoot: target.contentRoot });
    const sha = await getExistingSha(target, path);
    if (!sha) {
      throw new Error(`GitHub update could not find existing file sha for ${path}.`);
    }
    const result = await requestGithub<GithubContentResponse>(
      target,
      `/contents/${encodePath(path)}`,
      "PUT",
      buildPayload(note, target, path, sha)
    );
    const info = getContentInfo(result);
    return {
      remoteId: info.path ?? path,
      remoteUrl: buildPreviewUrl(target.previewBaseUrl, info.path ?? path) ?? info.htmlUrl,
    };
  }

  async delete(_remoteId: string, _target: GithubTargetConfig): Promise<void> {
    throw new Error("GitHub static-site delete is not supported yet.");
  }

  async getPreviewUrl(remoteId: string, target: GithubTargetConfig): Promise<string | undefined> {
    return buildPreviewUrl(target.previewBaseUrl, remoteId);
  }
}
