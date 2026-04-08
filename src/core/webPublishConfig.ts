import { PublishableNote } from "./note";
import { loadJuejinOptionSnapshot } from "./providerOptionCache";
import { CsdnTargetConfig, JuejinTargetConfig, ZhihuTargetConfig } from "../types";
import { CsdnPublishDraft, JuejinPublishDraft, ZhihuPublishDraft } from "./normalPublish/types";
import { ProviderRuntimeOptions, withPublishFailureDetails } from "./providers";

interface ZhihuPublishInput {
  columnId?: string;
}

interface CsdnPublishInput {
  categories: string[];
  tags: string[];
}

interface JuejinPublishInput {
  categoryId: string;
  tagIds: string[];
  briefContent: string;
}

interface ResolveJuejinPublishInputResult {
  input: JuejinPublishInput;
  providerOptionCache?: ProviderRuntimeOptions<JuejinTargetConfig>["providerOptionCache"];
}

type ZhihuPublishOverrides = Pick<ZhihuPublishDraft, "columnId">;
type CsdnPublishOverrides = Pick<CsdnPublishDraft, "categories" | "tags">;
type JuejinPublishOverrides = Pick<JuejinPublishDraft, "categoryId" | "tagIds" | "briefContent">;

function getNestedValue(source: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function pickFirstNonEmptyArray(...values: unknown[]): string[] {
  for (const value of values) {
    const items = readStringArray(value);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

export function resolveZhihuPublishInput(
  note: PublishableNote,
  target: ZhihuTargetConfig,
  overrides?: Partial<ZhihuPublishOverrides>
): ZhihuPublishInput {
  const columnId =
    readString(overrides?.columnId) ||
    readString(getNestedValue(note.frontmatter, ["ultimatePublisher", "zhihu", "columnId"])) ||
    target.defaultColumnId;

  return {
    columnId: columnId || undefined,
  };
}

export function resolveCsdnPublishInput(
  note: PublishableNote,
  target: CsdnTargetConfig,
  overrides?: Partial<CsdnPublishOverrides>
): CsdnPublishInput {
  const categories = pickFirstNonEmptyArray(
    overrides?.categories,
    getNestedValue(note.frontmatter, ["ultimatePublisher", "csdn", "categories"]),
    note.categories,
    target.defaultCategories
  );
  const tags = pickFirstNonEmptyArray(
    overrides?.tags,
    getNestedValue(note.frontmatter, ["ultimatePublisher", "csdn", "tags"]),
    note.tags,
    target.defaultTags
  );

  return {
    categories,
    tags,
  };
}

function normalizeOptionLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function resolveNamedJuejinOptionId(
  kind: "category" | "tag",
  name: string,
  options: Array<{ id: string; label: string }>
): string {
  const normalizedName = normalizeOptionLabel(name);
  const matches = options.filter((option) => normalizeOptionLabel(option.label) === normalizedName);

  if (matches.length === 0) {
    throw new Error(`Juejin ${kind} "${name}" did not match any available option.`);
  }

  if (matches.length > 1) {
    throw new Error(`Juejin ${kind} "${name}" matched multiple available options.`);
  }

  return matches[0].id;
}

export async function resolveJuejinPublishInput(
  note: PublishableNote,
  target: JuejinTargetConfig,
  overrides?: Partial<JuejinPublishOverrides>,
  runtime?: ProviderRuntimeOptions<JuejinTargetConfig>
): Promise<ResolveJuejinPublishInputResult> {
  const frontmatterCategoryName = readString(getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "category"]));
  const frontmatterTagNames = readStringArray(getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "tags"]));
  const legacyCategoryId = readString(getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "categoryId"]));
  const legacyTagIds = readStringArray(getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "tagIds"]));
  const briefContent =
    readString(overrides?.briefContent) ||
    readString(getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "briefContent"])) ||
    target.defaultBriefContent ||
    note.excerpt;
  const overrideCategoryId = readString(overrides?.categoryId);
  const overrideTagIds = readStringArray(overrides?.tagIds);
  const shouldResolveCategoryName = !overrideCategoryId && Boolean(frontmatterCategoryName);
  const shouldResolveTagNames = overrideTagIds.length === 0 && frontmatterTagNames.length > 0;

  let categoryId = overrideCategoryId;
  let tagIds = overrideTagIds;
  let providerOptionCache: ResolveJuejinPublishInputResult["providerOptionCache"];

  if (shouldResolveCategoryName || shouldResolveTagNames) {
    const snapshot = await loadJuejinOptionSnapshot({
      targetId: target.id,
      target,
      providerOptionCache: runtime?.providerOptionCache,
      loadNormalPublishOptions:
        runtime?.loadNormalPublishOptions ??
        (async () => {
          throw new Error("Juejin options are unavailable.");
        }),
      nowMs: runtime?.nowMs,
    });

    if (snapshot.source === "unavailable") {
      if (shouldResolveCategoryName) {
        throw new Error(`Juejin options are unavailable, so category "${frontmatterCategoryName}" could not be resolved.`);
      }
      throw new Error(`Juejin options are unavailable, so tag "${frontmatterTagNames[0]}" could not be resolved.`);
    }

    try {
      if (shouldResolveCategoryName) {
        categoryId = resolveNamedJuejinOptionId("category", frontmatterCategoryName, snapshot.categories);
      }

      if (shouldResolveTagNames) {
        tagIds = frontmatterTagNames.map((name) => resolveNamedJuejinOptionId("tag", name, snapshot.tags));
      }
    } catch (error) {
      if (snapshot.source === "network") {
        throw withPublishFailureDetails(error, { providerOptionCache: snapshot.nextCache });
      }
      throw error;
    }

    if (snapshot.source === "network") {
      providerOptionCache = snapshot.nextCache;
    }
  }

  categoryId = categoryId || legacyCategoryId || target.defaultCategoryId;
  tagIds = tagIds.length > 0 ? tagIds : legacyTagIds.length > 0 ? legacyTagIds : target.defaultTagIds;

  if (!categoryId) {
    throw new Error("Juejin publish requires a categoryId.");
  }

  if (tagIds.length === 0) {
    throw new Error("Juejin publish requires at least one tagId.");
  }

  return {
    input: {
      categoryId,
      tagIds,
      briefContent,
    },
    providerOptionCache,
  };
}
