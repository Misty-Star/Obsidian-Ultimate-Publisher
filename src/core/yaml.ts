export interface YamlMetadata {
  title: string;
  slug?: string;
  excerpt?: string;
  tags: string[];
  categories: string[];
  date?: string;
  extra: Record<string, unknown>;
}

function escapeScalar(value: string): string {
  if (value.includes("\n")) {
    return `|-\n${value
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")}`;
  }
  if (/[:#[\]\{\},&*!?|<>=@`]/.test(value) || value.trim() !== value) {
    return JSON.stringify(value);
  }
  return value;
}

function serializeValue(value: unknown): string[] {
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

export function buildExportFrontmatter(metadata: YamlMetadata, yamlType: "default" | "hexo"): Record<string, unknown> {
  if (yamlType === "hexo") {
    return {
      title: metadata.title,
      date: metadata.date ?? new Date().toISOString(),
      tags: metadata.tags,
      categories: metadata.categories,
      slug: metadata.slug,
      excerpt: metadata.excerpt,
      ...metadata.extra,
    };
  }

  return {
    title: metadata.title,
    slug: metadata.slug,
    description: metadata.excerpt,
    tags: metadata.tags,
    categories: metadata.categories,
    date: metadata.date ?? new Date().toISOString(),
    ...metadata.extra,
  };
}

export function serializeFrontmatter(values: Record<string, unknown>): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "") {
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
