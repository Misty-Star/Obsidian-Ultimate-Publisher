import { PublishableNote } from "./note";
import { CsdnTargetConfig, JuejinTargetConfig, ZhihuTargetConfig } from "../types";

interface ZhihuPublishInput {
  columnId: string;
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

export function resolveZhihuPublishInput(note: PublishableNote, target: ZhihuTargetConfig): ZhihuPublishInput {
  const columnId =
    readString(getNestedValue(note.frontmatter, ["ultimatePublisher", "zhihu", "columnId"])) ||
    target.defaultColumnId;

  if (!columnId) {
    throw new Error("Zhihu publish requires a columnId.");
  }

  return { columnId };
}

export function resolveCsdnPublishInput(note: PublishableNote, target: CsdnTargetConfig): CsdnPublishInput {
  const categories = pickFirstNonEmptyArray(
    getNestedValue(note.frontmatter, ["ultimatePublisher", "csdn", "categories"]),
    note.categories,
    target.defaultCategories
  );
  const tags = pickFirstNonEmptyArray(
    getNestedValue(note.frontmatter, ["ultimatePublisher", "csdn", "tags"]),
    note.tags,
    target.defaultTags
  );

  return {
    categories,
    tags,
  };
}

export function resolveJuejinPublishInput(note: PublishableNote, target: JuejinTargetConfig): JuejinPublishInput {
  const categoryId =
    readString(getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "categoryId"])) ||
    target.defaultCategoryId;
  const tagIds = pickFirstNonEmptyArray(
    getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "tagIds"]),
    target.defaultTagIds
  );
  const briefContent =
    readString(getNestedValue(note.frontmatter, ["ultimatePublisher", "juejin", "briefContent"])) ||
    target.defaultBriefContent ||
    note.excerpt;

  if (!categoryId) {
    throw new Error("Juejin publish requires a categoryId.");
  }

  if (tagIds.length === 0) {
    throw new Error("Juejin publish requires at least one tagId.");
  }

  return {
    categoryId,
    tagIds,
    briefContent,
  };
}
