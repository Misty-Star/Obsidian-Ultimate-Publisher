export type SupportedLocale = "en" | "zh-CN";

export function normalizeLocale(input: string | null | undefined): SupportedLocale {
  if (!input) {
    return "en";
  }
  const value = input.toLowerCase();
  if (value.startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}
