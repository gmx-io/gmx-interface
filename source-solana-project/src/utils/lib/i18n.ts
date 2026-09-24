import { MessageDescriptor, Messages, i18n } from '@lingui/core';
import { IS_DEVELOPMENT } from '@/config/env';
import { LANGUAGE_LOCALSTORAGE_KEY } from '@/config/localStorage';
import { useLingui } from '@lingui/react';
import mapValues from 'lodash/mapValues';
import { useEffect, useMemo } from 'react';

export const defaultLocale = 'en';

export const locales = {
  en: 'English',
  es: 'Spanish',
  zh: 'Simplified Chinese',
  zh_TW: 'Traditional Chinese',
  ko: 'Korean',
  ru: 'Russian',
  ja: 'Japanese',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ...(IS_DEVELOPMENT && { pseudo: 'Test' }),
};

export function isTestLanguage(locale: string) {
  return locale === 'pseudo';
}

export async function dynamicActivate(locale: string) {
  const { messages } = (await import(`@/locales/${locale}/messages.po`)) as {
    messages: Messages;
  };
  if (!isTestLanguage(locale)) {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, locale);
  }
  i18n.loadAndActivate({ locale, messages: messages });
}

export function useLocalizedMap<T extends Record<string, MessageDescriptor>>(
  map: T
): Record<keyof T, string> {
  const { _ } = useLingui();

  return useMemo(() => mapValues(map, (value) => _(value)), [_, map]);
}

/** Subscribe layout shells to locale changes (for `t` macro copy outside keyed outlets). */
export function useSubscribeLinguiLocale(): string {
  const { i18n } = useLingui();
  useEffect(() => {}, [i18n.locale]);
  return i18n.locale;
}
