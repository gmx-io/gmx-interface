import "@wagmi/connectors";
import { ethers } from "ethers";
import useScrollToTop from "lib/useScrollToTop";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { SWRConfig } from "swr";

import { Redirect, Route, HashRouter as Router, Switch, useHistory, useLocation } from "react-router-dom";

import { getAppBaseUrl, isHomeSite, REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";

import { decodeReferralCode, encodeReferralCode } from "domain/referrals";
import Actions from "pages/Actions/Actions";
import BeginAccountTransfer from "pages/BeginAccountTransfer/BeginAccountTransfer";
import Buy from "pages/Buy/Buy";
import BuyGlp from "pages/BuyGlp/BuyGlp";
import BuyGMX from "pages/BuyGMX/BuyGMX";
import ClaimEsGmx from "pages/ClaimEsGmx/ClaimEsGmx";
import CompleteAccountTransfer from "pages/CompleteAccountTransfer/CompleteAccountTransfer";
import Ecosystem from "pages/Ecosystem/Ecosystem";
import { Exchange } from "pages/Exchange/Exchange";
import Home from "pages/Home/Home";
import NftWallet from "pages/NftWallet/NftWallet";
import OrdersOverview from "pages/OrdersOverview/OrdersOverview";
import PositionsOverview from "pages/PositionsOverview/PositionsOverview";
import { PriceImpactRebatesStatsPage } from "pages/PriceImpactRebatesStats/PriceImpactRebatesStats";
import Referrals from "pages/Referrals/Referrals";
import ReferralsTier from "pages/ReferralsTier/ReferralsTier";
import Stake from "pages/Stake/Stake";
import Stats from "pages/Stats/Stats";

import { cssTransition, ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "styles/Font.css";
import "styles/Input.css";
import "styles/Shared.scss";
import "./App.scss";

import SEO from "components/Common/SEO";
import EventToastContainer from "components/EventToast/EventToastContainer";
import useEventToast from "components/EventToast/useEventToast";
import useRouteQuery from "lib/useRouteQuery";

import PositionRouter from "abis/PositionRouter.json";
import VaultV2 from "abis/VaultV2.json";
import VaultV2b from "abis/VaultV2b.json";
import { RedirectPopupModal } from "components/ModalViews/RedirectModal";
import { getContract } from "config/contracts";
import Jobs from "pages/Jobs/Jobs";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import ReferralTerms from "pages/ReferralTerms/ReferralTerms";
import TermsAndConditions from "pages/TermsAndConditions/TermsAndConditions";

import { i18n } from "@lingui/core";
import { Trans } from "@lingui/macro";
import { I18nProvider } from "@lingui/react";
import { watchAccount } from "@wagmi/core";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Header } from "components/Header/Header";
import { SettingsModal } from "components/SettingsModal/SettingsModal";
import { SubaccountModal } from "components/Synthetics/SubaccountModal/SubaccountModal";
import { ARBITRUM, getExplorerUrl } from "config/chains";
import { isDevelopment } from "config/env";
import { getIsSyntheticsSupported } from "config/features";
import {
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  LANGUAGE_LOCALSTORAGE_KEY,
  REFERRAL_CODE_KEY,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
} from "config/localStorage";
import { TOAST_AUTO_CLOSE_TIME, WS_LOST_FOCUS_TIMEOUT } from "config/ui";
import { GlobalStateProvider } from "context/GlobalContext/GlobalContextProvider";
import { SettingsContextProvider } from "context/SettingsContext/SettingsContextProvider";
import { SubaccountContextProvider } from "context/SubaccountContext/SubaccountContext";
import { SyntheticsEventsProvider } from "context/SyntheticsEvents";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useWebsocketProvider, WebsocketContextProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { PendingTransaction } from "domain/legacy";
import { Provider } from "ethers";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { swrGCMiddleware } from "lib/swrMiddlewares";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import { rainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import useWallet from "lib/wallets/useWallet";
import { RainbowKitProviderWrapper } from "lib/wallets/WalletProvider";
import DashboardV2 from "pages/Dashboard/DashboardV2";
import { CompetitionRedirect, LeaderboardPage } from "pages/LeaderboardPage/LeaderboardPage";
import { MarketPoolsPage } from "pages/MarketPoolsPage/MarketPoolsPage";
import SyntheticsActions from "pages/SyntheticsActions/SyntheticsActions";
import { SyntheticsFallbackPage } from "pages/SyntheticsFallbackPage/SyntheticsFallbackPage";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";
import { SyntheticsStats } from "pages/SyntheticsStats/SyntheticsStats";
import { useDisconnect } from "wagmi";
import { NotifyModal } from "components/NotifyModal/NotifyModal";

// @ts-ignore
if (window?.ethereum?.autoRefreshOnNetworkChange) {
  // @ts-ignore
  window.ethereum.autoRefreshOnNetworkChange = false;
}

const LazyUiPage = lazy(() => import("pages/UiPage/UiPage"));
const UiPage = () => <Suspense fallback={<Trans>Loading...</Trans>}>{<LazyUiPage />}</Suspense>;

const Zoom = cssTransition({
  enter: "zoomIn",
  exit: "zoomOut",
  appendPosition: false,
  collapse: true,
  collapseDuration: 200,
});

function FullApp() {
  const { disconnect } = useDisconnect();
  const isHome = isHomeSite();
  const exchangeRef = useRef<any>();
  const { chainId } = useChainId();
  const location = useLocation();
  const history = useHistory();

  const hasV1LostFocus = useHasLostFocus({
    timeout: WS_LOST_FOCUS_TIMEOUT,
    whiteListedPages: ["/trade", "/v2"],
    debugId: "V1 Events",
  });

  useEventToast();
  const query = useRouteQuery();

  useEffect(() => {
    let referralCode = query.get(REFERRAL_CODE_QUERY_PARAM);
    if (!referralCode || referralCode.length === 0) {
      const params = new URLSearchParams(window.location.search);
      referralCode = params.get(REFERRAL_CODE_QUERY_PARAM);
    }

    if (referralCode && referralCode.length <= 20) {
      const encodedReferralCode = encodeReferralCode(referralCode);
      if (encodedReferralCode !== ethers.ZeroHash) {
        localStorage.setItem(REFERRAL_CODE_KEY, encodedReferralCode);
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.has(REFERRAL_CODE_QUERY_PARAM)) {
          queryParams.delete(REFERRAL_CODE_QUERY_PARAM);
          history.replace({
            search: queryParams.toString(),
          });
        }
      }
    }
  }, [query, history, location]);

  const disconnectAccountAndCloseSettings = () => {
    disconnect();
    localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);
    setIsSettingsVisible(false);
  };

  const [redirectModalVisible, setRedirectModalVisible] = useState(false);
  const [shouldHideRedirectModal, setShouldHideRedirectModal] = useState(false);

  const [selectedToPage, setSelectedToPage] = useState("");
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const openSettings = useCallback(() => {
    setIsSettingsVisible(true);
  }, []);

  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const baseUrl = getAppBaseUrl();
  let appRedirectUrl = baseUrl + selectedToPage;
  if (localStorageCode && localStorageCode.length > 0 && localStorageCode !== ethers.ZeroHash) {
    const decodedRefCode = decodeReferralCode(localStorageCode);
    if (decodedRefCode) {
      appRedirectUrl = `${appRedirectUrl}?ref=${decodedRefCode}`;
    }
  }

  const showRedirectModal = useCallback((to) => {
    setRedirectModalVisible(true);
    setSelectedToPage(to);
  }, []);

  const { wsProvider } = useWebsocketProvider();

  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  useEffect(() => {
    const wsVaultAbi = chainId === ARBITRUM ? VaultV2.abi : VaultV2b.abi;
    if (hasV1LostFocus || !wsProvider) {
      return;
    }

    const wsVault = new ethers.Contract(vaultAddress, wsVaultAbi, wsProvider as Provider);
    const wsPositionRouter = new ethers.Contract(positionRouterAddress, PositionRouter.abi, wsProvider as Provider);

    const callExchangeRef = (method, ...args) => {
      if (!exchangeRef || !exchangeRef.current) {
        return;
      }

      exchangeRef.current[method](...args);
    };

    // handle the subscriptions here instead of within the Exchange component to avoid unsubscribing and re-subscribing
    // each time the Exchange components re-renders, which happens on every data update
    const onUpdatePosition = (...args) => callExchangeRef("onUpdatePosition", ...args);
    const onClosePosition = (...args) => callExchangeRef("onClosePosition", ...args);
    const onIncreasePosition = (...args) => callExchangeRef("onIncreasePosition", ...args);
    const onDecreasePosition = (...args) => callExchangeRef("onDecreasePosition", ...args);
    const onCancelIncreasePosition = (...args) => callExchangeRef("onCancelIncreasePosition", ...args);
    const onCancelDecreasePosition = (...args) => callExchangeRef("onCancelDecreasePosition", ...args);

    wsVault.on("UpdatePosition", onUpdatePosition);
    wsVault.on("ClosePosition", onClosePosition);
    wsVault.on("IncreasePosition", onIncreasePosition);
    wsVault.on("DecreasePosition", onDecreasePosition);
    wsPositionRouter.on("CancelIncreasePosition", onCancelIncreasePosition);
    wsPositionRouter.on("CancelDecreasePosition", onCancelDecreasePosition);

    return function cleanup() {
      wsVault.off("UpdatePosition", onUpdatePosition);
      wsVault.off("ClosePosition", onClosePosition);
      wsVault.off("IncreasePosition", onIncreasePosition);
      wsVault.off("DecreasePosition", onDecreasePosition);
      wsPositionRouter.off("CancelIncreasePosition", onCancelIncreasePosition);
      wsPositionRouter.off("CancelDecreasePosition", onCancelDecreasePosition);
    };
  }, [chainId, vaultAddress, positionRouterAddress, wsProvider, hasV1LostFocus]);

  return (
    <>
      <div className="App">
        <div className="App-content">
          <Header
            disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
            openSettings={openSettings}
            showRedirectModal={showRedirectModal}
          />
          {isHome && (
            <Switch>
              <Route exact path="/">
                <Home showRedirectModal={showRedirectModal} />
              </Route>
              <Route exact path="/referral-terms">
                <ReferralTerms />
              </Route>
              <Route exact path="/terms-and-conditions">
                <TermsAndConditions />
              </Route>
              <Route path="*">
                <PageNotFound />
              </Route>
            </Switch>
          )}
          {!isHome && (
            <Switch>
              <Route exact path="/">
                <Redirect to="/trade" />
              </Route>
              <Route exact path="/price_impact_rebates_stats">
                <PriceImpactRebatesStatsPage />
              </Route>
              <Route exact path="/v1/:tradeType?">
                <Exchange ref={exchangeRef} openSettings={openSettings} />
              </Route>
              <Route exact path="/dashboard">
                <DashboardV2 />
              </Route>
              <Route exact path="/stats/v1">
                <Stats />
              </Route>
              <Redirect exact from="/stats/v2" to="/stats" />
              <Route exact path="/stats">
                {getIsSyntheticsSupported(chainId) ? <SyntheticsStats /> : <SyntheticsFallbackPage />}
              </Route>
              <Route exact path="/earn">
                <Stake />
              </Route>
              <Route exact path="/buy">
                <Buy />
              </Route>
              <Route exact path="/pools">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
                    <MarketPoolsPage />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>

              <Route exact path="/trade/:tradeType?">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="trade">
                    <SyntheticsPage openSettings={openSettings} />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Redirect from="/v2" to="/trade" />
              <Route exact path="/buy_glp">
                <BuyGlp />
              </Route>
              <Route exact path="/jobs">
                <Jobs />
              </Route>
              <Route exact path="/buy_gmx">
                <BuyGMX />
              </Route>
              <Route exact path="/ecosystem">
                <Ecosystem />
              </Route>
              <Route path="/leaderboard/">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider skipLocalReferralCode pageType="leaderboard">
                    <LeaderboardPage />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Route exact path="/competitions/">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider skipLocalReferralCode pageType="competitions">
                    <CompetitionRedirect />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Route path="/competitions/:leaderboardPageKey">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider skipLocalReferralCode pageType="competitions">
                    <LeaderboardPage />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Route exact path="/referrals">
                <Referrals />
              </Route>
              <Route exact path="/referrals/:account">
                <Referrals />
              </Route>
              <Route exact path="/nft_wallet">
                <NftWallet />
              </Route>
              <Route exact path="/claim_es_gmx">
                <ClaimEsGmx />
              </Route>

              <Route exact path="/actions/v1">
                <Actions />
              </Route>
              <Route exact path="/actions/v1/:account">
                <Actions />
              </Route>
              <Route exact path="/actions">
                <SyntheticsStateContextProvider pageType="actions" skipLocalReferralCode>
                  <SyntheticsActions />
                </SyntheticsStateContextProvider>
              </Route>
              <Redirect exact from="/actions/v2" to="/actions" />
              <Route exact path="/actions/:account">
                <SyntheticsStateContextProvider pageType="actions" skipLocalReferralCode={false}>
                  <SyntheticsActions />
                </SyntheticsStateContextProvider>
              </Route>
              <Route path="/actions/v2/:account">
                {({ match }) => <Redirect to={`/actions/${match?.params.account}`} />}
              </Route>
              <Route exact path="/referrals-tier">
                <ReferralsTier />
              </Route>
              <Route exact path="/stats">
                <Stats />
              </Route>
              <Route exact path="/orders_overview">
                <OrdersOverview />
              </Route>
              <Route exact path="/positions_overview">
                <PositionsOverview />
              </Route>
              <Route exact path="/begin_account_transfer">
                <BeginAccountTransfer />
              </Route>
              <Route exact path="/complete_account_transfer/:sender/:receiver">
                <CompleteAccountTransfer />
              </Route>
              {isDevelopment() && (
                <Route exact path="/ui">
                  <UiPage />
                </Route>
              )}

              <Route path="*">
                <PageNotFound />
              </Route>
            </Switch>
          )}
        </div>
      </div>
      <ToastContainer
        limit={1}
        transition={Zoom}
        position="bottom-right"
        autoClose={TOAST_AUTO_CLOSE_TIME}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick={false}
        draggable={false}
        pauseOnHover
        theme="dark"
        icon={false}
      />
      <EventToastContainer />
      <RedirectPopupModal
        redirectModalVisible={redirectModalVisible}
        setRedirectModalVisible={setRedirectModalVisible}
        appRedirectUrl={appRedirectUrl}
        setShouldHideRedirectModal={setShouldHideRedirectModal}
        shouldHideRedirectModal={shouldHideRedirectModal}
      />
      <SettingsModal isSettingsVisible={isSettingsVisible} setIsSettingsVisible={setIsSettingsVisible} />
      <SubaccountModal />
      <NotifyModal />
    </>
  );
}

const SWRConfigProp = {
  refreshInterval: 5000,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  use: [swrGCMiddleware],
};

function App() {
  const { disconnect } = useDisconnect();
  const { signer } = useWallet();
  const { chainId } = useChainId();

  const [pendingTxns, setPendingTxns] = useState<PendingTransaction[]>([]);

  useEffect(() => {
    const checkPendingTxns = async () => {
      const updatedPendingTxns: any[] = [];
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i];
        const receipt = await signer!.provider!.getTransactionReceipt(pendingTxn.hash);
        if (receipt) {
          if (receipt.status === 0) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash;
            helperToast.error(
              <div>
                <Trans>
                  Txn failed. <ExternalLink href={txUrl}>View</ExternalLink>
                </Trans>
                <br />
              </div>
            );
          }

          if (receipt.status === 1 && pendingTxn.message) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash;
            helperToast.success(
              <div>
                {pendingTxn.message}{" "}
                <ExternalLink href={txUrl}>
                  <Trans>View</Trans>
                </ExternalLink>
                <br />
                {pendingTxn.messageDetails && <br />}
                {pendingTxn.messageDetails}
              </div>
            );
          }
          continue;
        }
        updatedPendingTxns.push(pendingTxn);
      }

      if (updatedPendingTxns.length !== pendingTxns.length) {
        setPendingTxns(updatedPendingTxns);
      }
    };

    const interval = setInterval(() => {
      checkPendingTxns();
    }, 2 * 1000);
    return () => clearInterval(interval);
  }, [signer, pendingTxns, chainId]);

  useScrollToTop();

  useEffect(() => {
    const defaultLanguage = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale;
    dynamicActivate(defaultLanguage);
  }, []);

  useEffect(() => {
    const unwatch = watchAccount(rainbowKitConfig, {
      onChange: ({ chainId }) => {
        const chains = rainbowKitConfig.chains;
        const chain = chains.find((c) => c.id === chainId);
        if (!chain || !chains) return;
        const isValidChain = chains.some((c) => c.id === chain.id);
        if (!isValidChain) {
          disconnect();
        }
      },
    } as any);
    return () => unwatch();
  }, [disconnect]);

  let app = <FullApp />;
  app = <SubaccountContextProvider>{app}</SubaccountContextProvider>;
  app = <SyntheticsEventsProvider>{app}</SyntheticsEventsProvider>;
  app = <WebsocketContextProvider>{app}</WebsocketContextProvider>;
  app = <SEO>{app}</SEO>;
  app = <RainbowKitProviderWrapper>{app}</RainbowKitProviderWrapper>;
  app = <I18nProvider i18n={i18n as any}>{app}</I18nProvider>;
  app = <SettingsContextProvider>{app}</SettingsContextProvider>;
  app = (
    <SWRConfig key={chainId} value={SWRConfigProp as any}>
      {app}
    </SWRConfig>
  );
  app = (
    <GlobalStateProvider pendingTxns={pendingTxns} setPendingTxns={setPendingTxns}>
      {app}
    </GlobalStateProvider>
  );
  app = <Router>{app}</Router>;

  return app;
}

export default App;
