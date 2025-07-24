import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useEffect } from "react";

import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { defaultLocale, dynamicActivate } from "lib/i18n";

import SEO from "components/Common/SEO";

import Home from "./Home";

export default function App() {
  useEffect(() => {
    const defaultLanguage = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale;
    dynamicActivate(defaultLanguage);
  }, []);

  return (
    <I18nProvider i18n={i18n as any}>
      <SEO>
        <Home />
      </SEO>
    </I18nProvider>
  );
}
