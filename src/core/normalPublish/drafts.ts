import { PublishableNote } from "../note";
import { PublishTargetConfig } from "../../types";
import {
  JuejinPublishDraft,
  NormalPublishSessionState,
  ProviderPublishDraft,
  ProviderRemoteOptionsState,
  WordpressPublishDraft,
  YuquePublishDraft,
  ZhihuPublishDraft,
} from "./types";

function createIdleRemoteOptionsState(): ProviderRemoteOptionsState {
  return {
    status: "idle",
    data: {},
    manualFallbackFields: [],
  };
}

function cloneStringList(values: string[]): string[] {
  return values.slice();
}

function buildWordpressDraft(note: PublishableNote, target: Extract<PublishTargetConfig, { provider: "wordpress" }>): WordpressPublishDraft {
  return {
    provider: "wordpress",
    slug: note.slug,
    excerpt: note.excerpt,
    tags: cloneStringList(note.tags),
    categories: cloneStringList(note.categories),
    status: target.defaultStatus,
    password: "",
  };
}

function buildYuqueDraft(note: PublishableNote, target: Extract<PublishTargetConfig, { provider: "yuque" }>): YuquePublishDraft {
  return {
    provider: "yuque",
    slug: note.slug,
    publicLevel: target.publicLevel,
  };
}

function buildZhihuDraft(note: PublishableNote, target: Extract<PublishTargetConfig, { provider: "zhihu" }>): ZhihuPublishDraft {
  const frontmatterConfig = (note.frontmatter.ultimatePublisher as Record<string, unknown> | undefined)?.zhihu as
    | Record<string, unknown>
    | undefined;
  return {
    provider: "zhihu",
    columnId:
      (typeof frontmatterConfig?.columnId === "string" ? frontmatterConfig.columnId.trim() : "") ||
      target.defaultColumnId,
    columnTitle: target.defaultColumnTitle ?? "",
  };
}

function buildCsdnDraft(note: PublishableNote, target: Extract<PublishTargetConfig, { provider: "csdn" }>): ProviderPublishDraft {
  return {
    provider: "csdn",
    excerpt: note.excerpt,
    tags: note.tags.length > 0 ? cloneStringList(note.tags) : cloneStringList(target.defaultTags),
    categories:
      note.categories.length > 0 ? cloneStringList(note.categories) : cloneStringList(target.defaultCategories),
  };
}

function buildJuejinDraft(note: PublishableNote, target: Extract<PublishTargetConfig, { provider: "juejin" }>): JuejinPublishDraft {
  return {
    provider: "juejin",
    categoryId: target.defaultCategoryId,
    categoryName: target.defaultCategoryName ?? "",
    tagIds: cloneStringList(target.defaultTagIds),
    tagNames: cloneStringList(target.defaultTagNames ?? []),
    briefContent: target.defaultBriefContent || note.excerpt,
  };
}

export function buildInitialTargetDraft(target: PublishTargetConfig, note: PublishableNote): ProviderPublishDraft {
  switch (target.provider) {
    case "wordpress":
      return buildWordpressDraft(note, target);
    case "yuque":
      return buildYuqueDraft(note, target);
    case "zhihu":
      return buildZhihuDraft(note, target);
    case "csdn":
      return buildCsdnDraft(note, target);
    case "juejin":
      return buildJuejinDraft(note, target);
    default:
      throw new Error(`Unsupported provider: ${(target as PublishTargetConfig).provider}`);
  }
}

export function buildNormalPublishSessionState(
  note: PublishableNote,
  targets: PublishTargetConfig[]
): NormalPublishSessionState {
  const enabledTargets = targets.filter((target) => target.enabled);
  const targetDrafts: Record<string, ProviderPublishDraft> = {};
  const remoteOptions: Record<string, ProviderRemoteOptionsState> = {};
  const lastErrorByTargetId: Record<string, string | null> = {};

  for (const target of enabledTargets) {
    targetDrafts[target.id] = buildInitialTargetDraft(target, note);
    remoteOptions[target.id] = createIdleRemoteOptionsState();
    lastErrorByTargetId[target.id] = null;
  }

  return {
    selectedTargetId: enabledTargets[0]?.id ?? null,
    commonDraft: {
      title: note.title,
    },
    targetDrafts,
    remoteOptions,
    lastErrorByTargetId,
  };
}
