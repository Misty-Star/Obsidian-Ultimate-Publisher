import { PublishableNote } from "../note";
import { PublishTargetConfig, WordpressStatus } from "../../types";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

export interface CommonPublishDraft {
  title: string;
}

export interface WordpressPublishDraft {
  provider: "wordpress";
  slug: string;
  excerpt: string;
  tags: string[];
  categories: string[];
  status: WordpressStatus;
  password: string;
}

export interface YuquePublishDraft {
  provider: "yuque";
  slug: string;
  publicLevel: 0 | 1;
}

export interface LocalExportPublishDraft {
  provider: "local-export";
  slug: string;
  excerpt: string;
  tags: string[];
  categories: string[];
}

export interface ZhihuPublishDraft {
  provider: "zhihu";
  columnId: string;
  columnTitle: string;
}

export interface CsdnPublishDraft {
  provider: "csdn";
  excerpt: string;
  tags: string[];
  categories: string[];
}

export interface JuejinPublishDraft {
  provider: "juejin";
  categoryId: string;
  categoryName: string;
  tagIds: string[];
  tagNames: string[];
  briefContent: string;
}

export type ProviderPublishDraft =
  | WordpressPublishDraft
  | YuquePublishDraft
  | LocalExportPublishDraft
  | ZhihuPublishDraft
  | CsdnPublishDraft
  | JuejinPublishDraft;

export interface ProviderRemoteOptionsState {
  status: LoadStatus;
  data: Record<string, unknown>;
  errorMessage?: string;
  manualFallbackFields: string[];
}

export interface NormalPublishSessionState {
  selectedTargetId: string | null;
  commonDraft: CommonPublishDraft;
  targetDrafts: Record<string, ProviderPublishDraft>;
  remoteOptions: Record<string, ProviderRemoteOptionsState>;
  lastErrorByTargetId: Record<string, string | null>;
}

export interface NormalPublishDraftBuildInput {
  note: PublishableNote;
  target: PublishTargetConfig;
}
