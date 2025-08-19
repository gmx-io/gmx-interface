import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useEffect } from "react";
import { HashRouter as Router } from "react-router-dom";
import { SWRConfig } from "swr";

import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import WalletProvider from "lib/wallets/WalletProvider";
import { ARBITRUM } from "sdk/configs/chainIds";

import SEO from "components/Common/SEO";

import { LandingRoutes } from "./LandingRoutes";

export default function App() {
  const fetcher = useOracleKeeperFetcher(ARBITRUM);
  useEffect(() => {
    const defaultLanguage = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale;
    dynamicActivate(defaultLanguage);
  }, []);

  useEffect(() => {
    const metrics = import("lib/metrics/Metrics");
    metrics.then((m) => {
      m.metrics.setFetcher(fetcher);
    });
  }, [fetcher]);

  return (
    <Router>
      <SWRConfig>
        <I18nProvider i18n={i18n as any}>
          <WalletProvider>
            <SEO>
              <div className="overflow-hidden proportional-nums text-white">
                <LandingRoutes />
              </div>
            </SEO>
          </WalletProvider>
        </I18nProvider>
      </SWRConfig>
    </Router>
  );
}
