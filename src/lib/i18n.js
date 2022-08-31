import { i18n } from "@lingui/core";
import { en, es, zh, ko, ru, ja, fr } from "make-plural/plurals";
import { LANGUAGE_LOCALSTORAGE_KEY } from "./legacy";

export const locales = {
  en: "English",
  es: "Spanish",
  // zh: "Chinese",
  ko: "Korean",
  // ru: "Russian",
  ja: "Japanese",
  // fr: "French",
};

export const defaultLocale = "en";

i18n.loadLocaleData({
  en: { plurals: en },
  es: { plurals: es },
  zh: { plurals: zh },
  ko: { plurals: ko },
  ru: { plurals: ru },
  ja: { plurals: ja },
  fr: { plurals: fr },
});

export async function dynamicActivate(locale) {
  const { messages } = await import(`@lingui/loader!../config/locales/${locale}/messages.po`);
  localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, locale);
  i18n.load(locale, messages);
  i18n.activate(locale);
}
