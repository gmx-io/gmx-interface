import { MessageDescriptor, i18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import mapValues from "lodash/mapValues";
import { useMemo } from "react";

import { isDevelopment } from "config/env";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { getSharedLanguagePreference, LanguagePreference, saveSharedLanguagePreference } from "lib/languagePreference";
import { reportStartupError } from "lib/metrics/startupErrors";
import { messages as englishMessages } from "locales/en/messages.po";

// uses BCP-47 codes from https://unicode-org.github.io/cldr-staging/charts/latest/supplemental/language_plural_rules.html
export const locales = {
  en: "English",
  es: "Español",
  zh: "简体中文",
  "zh-tw": "繁體中文",
  ko: "한국어",
  ru: "Русский",
  ja: "日本語",
  fr: "Français",
  de: "Deutsch",
  ...(isDevelopment() && { pseudo: "Test" }),
};

export type Locale = keyof typeof locales;

export const defaultLocale = "en";

export function isTestLanguage(locale: string) {
  return locale === "pseudo";
}

export function getBrowserLocale(): Locale {
  const [language, ...subtags] = (navigator.languages?.[0] || navigator.language || "").toLowerCase().split("-");

  if (language === "zh") {
    if (subtags.includes("hant")) {
      return "zh-tw";
    }
    if (subtags.includes("hans")) {
      return "zh";
    }
    return subtags.some((subtag) => ["tw", "hk", "mo"].includes(subtag)) ? "zh-tw" : "zh";
  }

  return Object.prototype.hasOwnProperty.call(locales, language) && !isTestLanguage(language)
    ? (language as Locale)
    : defaultLocale;
}

function getInitialLanguagePreference(): LanguagePreference {
  const queryLocale = new URLSearchParams(window.location.search).get("lang");
  if (queryLocale && Object.prototype.hasOwnProperty.call(locales, queryLocale)) {
    return { locale: queryLocale, source: "user" };
  }

  const sharedPreference = getSharedLanguagePreference();
  const savedPreference =
    sharedPreference &&
    Object.prototype.hasOwnProperty.call(locales, sharedPreference.locale) &&
    !isTestLanguage(sharedPreference.locale)
      ? sharedPreference
      : undefined;

  if (savedPreference?.source === "user") {
    return savedPreference;
  }

  try {
    const savedLocale = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY);
    if (savedLocale && Object.prototype.hasOwnProperty.call(locales, savedLocale)) {
      // A newly detected landing-page language must not replace an existing app choice.
      return savedPreference?.locale === savedLocale ? savedPreference : { locale: savedLocale, source: "user" };
    }
  } catch {
    // Continue with browser detection when storage is unavailable.
  }

  return savedPreference ?? { locale: getBrowserLocale(), source: "browser" };
}

export async function dynamicActivate(locale: string, source: LanguagePreference["source"] = "user") {
  const { messages } =
    locale === defaultLocale ? { messages: englishMessages } : await import(`../locales/${locale}/messages.po`);

  i18n.load(locale, messages);
  i18n.activate(locale);
  if (!isTestLanguage(locale)) {
    try {
      localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, locale);
    } catch {
      // Saving the preference must not prevent language activation.
    }
    saveSharedLanguagePreference({ locale, source });
  }
}

export async function initializeI18n() {
  const { locale, source } = getInitialLanguagePreference();

  try {
    await dynamicActivate(locale, source);
  } catch (error) {
    reportStartupError(error, "app.i18n");
    i18n.load(defaultLocale, englishMessages);
    i18n.activate(defaultLocale);
  }
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
