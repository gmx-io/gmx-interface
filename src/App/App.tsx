import "@wagmi/connectors";

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useEffect } from "react";
import { HashRouter as Router } from "react-router-dom";
import { SWRConfig } from "swr";

import "react-toastify/dist/ReactToastify.css";
import "styles/Font.css";
import "styles/Input.css";
import "styles/Shared.scss";
import "styles/recharts.css";
import "./App.scss";

import SEO from "components/Common/SEO";

import { LANGUAGE_LOCALSTORAGE_KEY, SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { GlobalStateProvider } from "context/GlobalContext/GlobalContextProvider";
import { useChainId } from "lib/chains";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { RainbowKitProviderWrapper } from "lib/wallets/WalletProvider";
import { AppRoutes } from "./AppRoutes";
import { SWRConfigProp } from "./swrConfig";

import { PendingTxnsContextProvider } from "context/PendingTxnsContext/PendingTxnsContext";
import { SettingsContextProvider } from "context/SettingsContext/SettingsContextProvider";
import { SorterContextProvider } from "context/SorterContext/SorterContextProvider";
import { SubaccountContextProvider } from "context/SubaccountContext/SubaccountContext";
import { GmxAccountContextProvider } from "context/GmxAccountContext/GmxAccountContext";
import { SyntheticsEventsProvider } from "context/SyntheticsEvents";
import { TokensBalancesContextProvider } from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { TokensFavoritesContextProvider } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { WebsocketContextProvider } from "context/WebsocketContext/WebsocketContextProvider";
import useWallet from "lib/wallets/useWallet";
import { ARBITRUM } from "config/chains";

// @ts-ignore
if (window?.ethereum?.autoRefreshOnNetworkChange) {
  // @ts-ignore
  window.ethereum.autoRefreshOnNetworkChange = false;
}

function KeydSwrConfig({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  return (
    <SWRConfig key={chainId} value={SWRConfigProp}>
      {children}
    </SWRConfig>
  );
}

function App() {
  // const { chainId } = useChainId();
  const { chainId } = useWallet();

  useEffect(() => {
    const defaultLanguage = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale;
    dynamicActivate(defaultLanguage);
  }, []);

  let app = <AppRoutes />;
  app = <SorterContextProvider>{app}</SorterContextProvider>;
  app = <TokensFavoritesContextProvider>{app}</TokensFavoritesContextProvider>;
  app = <SyntheticsEventsProvider>{app}</SyntheticsEventsProvider>;
  app = <SubaccountContextProvider>{app}</SubaccountContextProvider>;
  app = <TokensBalancesContextProvider>{app}</TokensBalancesContextProvider>;
  app = <WebsocketContextProvider>{app}</WebsocketContextProvider>;
  app = <SEO>{app}</SEO>;
  app = <RainbowKitProviderWrapper>{app}</RainbowKitProviderWrapper>;
  app = <I18nProvider i18n={i18n as any}>{app}</I18nProvider>;
  app = <PendingTxnsContextProvider>{app}</PendingTxnsContextProvider>;
  app = <SettingsContextProvider>{app}</SettingsContextProvider>;
  app = <KeydSwrConfig>{app}</KeydSwrConfig>;
  app = <GlobalStateProvider>{app}</GlobalStateProvider>;
  app = <GmxAccountContextProvider>{app}</GmxAccountContextProvider>;
  app = <Router>{app}</Router>;

  return app;
}

export default App;
