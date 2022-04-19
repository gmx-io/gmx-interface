import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import Backend from 'i18next-locize-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
// don't want to use this?
// have a look at the Quick start guide 
// for passing in lng and translations on init

const locizeOptions = {
  projectId: 'd8477d16-f4c0-46a9-bbe3-a2e0f2635194',
  apiKey: 'fe1ba9f3-0fc2-4483-a4ab-a8b6b855bd10', // The API key should only be used in development, not in production. You should not expose your apps API key to production!!!
  referenceLng: 'en',
};

i18n
  // load translation using http -> see /public/locales (i.e. https://github.com/i18next/react-i18next/tree/master/example/react/public/locales)
  // learn more: https://github.com/i18next/i18next-http-backend
  // want your translations to be loaded from a professional CDN? => https://github.com/locize/react-tutorial#step-2---use-the-locize-cdn
  .use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    fallbackLng: 'en',
    debug: true,
    saveMissing: true,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    backend: locizeOptions
  });


export default i18n;
