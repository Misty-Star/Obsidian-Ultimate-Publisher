import { SupportedLocale } from "./locales";

export const messages: Record<SupportedLocale, Record<string, string>> = {
  en: {
    "menu.publish": "Publish",
    "notice.publish.started": "Publishing \"{note}\" to {target}...",
    "i18n.only-en.demo": "English only message",
  },
  "zh-CN": {
    "menu.publish": "发布",
    "notice.publish.started": "正在发布“{note}”到 {target}...",
  },
};
