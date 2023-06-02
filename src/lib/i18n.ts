import { i18n, Messages } from "@lingui/core";
import { en, es, zh, ko, ru, ja, fr, de } from "make-plural/plurals";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { isDevelopment } from "config/env";

// uses BCP-47 codes from https://unicode-org.github.io/cldr-staging/charts/latest/supplemental/language_plural_rules.html
export const locales = {
  en: "English",
  es: "Spanish",
  zh: "Chinese",
  ko: "Korean",
  ru: "Russian",
  ja: "Japanese",
  fr: "French",
  de: "German",
  ...(isDevelopment() && { pseudo: "Test" }),
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
  de: { plurals: de },
  ...(isDevelopment() && { pseudo: { plurals: en } }),
});

export function isTestLanguage(locale: string) {
  return locale === "pseudo";
}

// export async function dynamicActivate(locale: string) {
//   const { messages } = await import(`@lingui/loader!locales/${locale}/messages.po`);
// if (!isTestLanguage(locale)) {
//   localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, locale);
// }
// i18n.load(locale, messages);
// i18n.activate(locale);
// }

const catalogs: Record<string, () => Promise<Messages>> = {
  en: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/en/messages.po`
    );
    return messages;
  },
  es: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/es/messages.po`
    );
    return messages;
  },
  zh: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/zh/messages.po`
    );
    return messages;
  },
  ko: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/ko/messages.po`
    );
    return messages;
  },
  ru: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/ru/messages.po`
    );
    return messages;
  },
  ja: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/ja/messages.po`
    );
    return messages;
  },
  fr: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/fr/messages.po`
    );
    return messages;
  },
  de: async () => {
    const { messages } = await import(
      // @ts-ignore
      `./file.js!=!@lingui/loader!../locales/de/messages.po`
    );
    return messages;
  },
  ...(isDevelopment() && {
    pseudo: async () => {
      const { messages } = await import(
        // @ts-ignore
        `./file.js!=!@lingui/loader!../locales/pseudo/messages.po`
      );
      return messages;
    },
  }),
};

export async function dynamicActivate(locale: string) {
  const messages = await catalogs[locale as any]();
  if (!isTestLanguage(locale)) {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, locale);
  }
  i18n.load(locale, messages);
  i18n.activate(locale);
}
