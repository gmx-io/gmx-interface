import { MessageDescriptor, i18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import mapValues from "lodash/mapValues";
import { useMemo } from "react";

import { isDevelopment } from "config/env";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";

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

export function isTestLanguage(locale: string) {
  return locale === "pseudo";
}

export async function dynamicActivate(locale: string) {
  const { messages } = await import(`../locales/${locale}/messages.po`);

  if (!isTestLanguage(locale)) {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, locale);
  }
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export function useLocalizedMap<T extends Record<string, MessageDescriptor>>(map: T): Record<keyof T, string> {
  const { _ } = useLingui();

  return useMemo(() => mapValues(map, (value) => _(value)), [_, map]);
}

const LIST_FORMATTER_CACHE: Record<string, Intl.ListFormat["format"]> = {};

export function useLocalizedList(items: string[]) {
  const { i18n } = useLingui();

  let formatList: Intl.ListFormat["format"];
  if (LIST_FORMATTER_CACHE[i18n.locale]) {
    formatList = LIST_FORMATTER_CACHE[i18n.locale];
  } else {
    const intl = new Intl.ListFormat(i18n.locale, {
      style: "long",
      type: "disjunction",
    });
    formatList = intl.format.bind(intl);
    LIST_FORMATTER_CACHE[i18n.locale] = formatList;
  }

  return formatList(items);
}
