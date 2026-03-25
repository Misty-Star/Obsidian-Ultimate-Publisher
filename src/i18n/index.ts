import { getLanguage } from "obsidian";
import { normalizeLocale, SupportedLocale } from "./locales";
import { messages } from "./messages";

export interface Translator {
  locale: SupportedLocale;
  t(key: string, params?: Record<string, string | number>): string;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (name in params) {
      return String(params[name]);
    }
    return `{${name}}`;
  });
}

export function createI18n(localeInput: string | null | undefined): Translator {
  const locale = normalizeLocale(localeInput);

  return {
    locale,
    t(key: string, params?: Record<string, string | number>): string {
      const template = messages[locale][key] ?? messages.en[key] ?? key;
      return interpolate(template, params);
    },
  };
}

export function createI18nFromObsidianLanguage(): Translator {
  return createI18n(getLanguage());
}

export { normalizeLocale };
export type { SupportedLocale };
