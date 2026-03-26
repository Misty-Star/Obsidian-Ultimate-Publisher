import { requestUrl } from "obsidian";
import { NormalPublishExecutionContext } from "../core/normalPublish/types";
import { MediaSupport, PublisherProvider, PublishResult, assertRemoteAssetsSupported } from "../core/providers";
import { PublishableNote } from "../core/note";
import { YuqueTargetConfig } from "../types";

interface YuqueEnvelope<T> {
  data?: T;
}

interface YuqueDoc {
  id?: number | string;
  slug?: string;
  url?: string;
  public_url?: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeBaseUrl(baseUrl: string): string {
  return trimTrailingSlash(baseUrl || "https://www.yuque.com");
}

async function requestYuque<T>(target: YuqueTargetConfig, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await requestUrl({
    url: `${normalizeBaseUrl(target.baseUrl)}${path}`,
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": target.token,
    },
    body: body ? JSON.stringify(body) : undefined,
    throw: false,
  });

  if (response.status >= 400) {
    throw new Error(`Yuque request failed (${response.status}): ${response.text}`);
  }

  const payload = response.json as YuqueEnvelope<T> | T;
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as YuqueEnvelope<T>).data as T;
  }
  return payload as T;
}

function buildPayload(
  note: PublishableNote,
  target: YuqueTargetConfig,
  context?: NormalPublishExecutionContext
): Record<string, unknown> {
  const providerContext = context?.provider.provider === "yuque" ? context.provider : undefined;
  return {
    title: context?.common.title || note.title,
    slug: providerContext?.slug ?? note.slug,
    public: providerContext?.publicLevel ?? target.publicLevel,
    format: "markdown",
    body: note.markdown,
  };
}

function getDocUrl(doc: YuqueDoc): string | undefined {
  return doc.public_url ?? doc.url;
}

export class YuqueProvider implements PublisherProvider<YuqueTargetConfig> {
  readonly provider = "yuque" as const;

  getMediaSupport(_target: YuqueTargetConfig): MediaSupport {
    return { mode: "unsupported" };
  }

  async validateConfig(target: YuqueTargetConfig): Promise<void> {
    if (!target.repo || !target.token) {
      throw new Error("Yuque target is missing repo or token.");
    }
    await requestYuque(target, `/api/v2/repos/${encodeURIComponent(target.repo)}`);
  }

  async publish(
    note: PublishableNote,
    target: YuqueTargetConfig,
    context?: NormalPublishExecutionContext
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const doc = await requestYuque<YuqueDoc>(
      target,
      `/api/v2/repos/${encodeURIComponent(target.repo)}/docs`,
      "POST",
      buildPayload(note, target, context)
    );
    const remoteId = String(doc.id ?? doc.slug ?? note.slug);
    return {
      remoteId,
      remoteUrl: getDocUrl(doc),
    };
  }

  async update(
    remoteId: string,
    note: PublishableNote,
    target: YuqueTargetConfig,
    context?: NormalPublishExecutionContext
  ): Promise<PublishResult> {
    assertRemoteAssetsSupported(note, target.name);
    const doc = await requestYuque<YuqueDoc>(
      target,
      `/api/v2/repos/${encodeURIComponent(target.repo)}/docs/${encodeURIComponent(remoteId)}`,
      "PUT",
      buildPayload(note, target, context)
    );
    return {
      remoteId: String(doc.id ?? remoteId),
      remoteUrl: getDocUrl(doc),
    };
  }

  async delete(remoteId: string, target: YuqueTargetConfig): Promise<void> {
    await requestYuque(target, `/api/v2/repos/${encodeURIComponent(target.repo)}/docs/${encodeURIComponent(remoteId)}`, "DELETE");
  }

  async getPreviewUrl(remoteId: string, target: YuqueTargetConfig): Promise<string | undefined> {
    const doc = await requestYuque<YuqueDoc>(
      target,
      `/api/v2/repos/${encodeURIComponent(target.repo)}/docs/${encodeURIComponent(remoteId)}`
    );
    return getDocUrl(doc);
  }
}
