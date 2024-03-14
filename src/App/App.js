import { ethers } from "ethers";
import useScrollToTop from "lib/useScrollToTop";
import { useEffect, useRef, useState, useCallback } from "react";
import { SWRConfig } from "swr";
import "@wagmi/connectors";

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
import Dashboard from "pages/Dashboard/Dashboard";
import Ecosystem from "pages/Ecosystem/Ecosystem";
import { Exchange } from "pages/Exchange/Exchange";
import Home from "pages/Home/Home";
import NftWallet from "pages/NftWallet/NftWallet";
import OrdersOverview from "pages/OrdersOverview/OrdersOverview";
import PositionsOverview from "pages/PositionsOverview/PositionsOverview";
import Referrals from "pages/Referrals/Referrals";
import ReferralsTier from "pages/ReferralsTier/ReferralsTier";
import Stake from "pages/Stake/Stake";
import Stats from "pages/Stats/Stats";
import { PriceImpactRebatesStatsPage } from "pages/PriceImpactRebatesStats/PriceImpactRebatesStats";

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
import { REDIRECT_POPUP_TIMESTAMP_KEY, TRADE_LINK_KEY } from "config/localStorage";
import Jobs from "pages/Jobs/Jobs";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import ReferralTerms from "pages/ReferralTerms/ReferralTerms";
import TermsAndConditions from "pages/TermsAndConditions/TermsAndConditions";
import { useLocalStorage } from "react-use";

import { i18n } from "@lingui/core";
import { Trans } from "@lingui/macro";
import { I18nProvider } from "@lingui/react";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Header } from "components/Header/Header";
import { ARBITRUM, getExplorerUrl } from "config/chains";
import { getIsSyntheticsSupported } from "config/features";
import {
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  LANGUAGE_LOCALSTORAGE_KEY,
  REFERRAL_CODE_KEY,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
} from "config/localStorage";
import { TOAST_AUTO_CLOSE_TIME, WS_LOST_FOCUS_TIMEOUT } from "config/ui";
import { SettingsContextProvider, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { SyntheticsEventsProvider } from "context/SyntheticsEvents";
import { useWebsocketProvider, WebsocketContextProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import { MarketPoolsPage } from "pages/MarketPoolsPage/MarketPoolsPage";
import SyntheticsActions from "pages/SyntheticsActions/SyntheticsActions";
import { SyntheticsFallbackPage } from "pages/SyntheticsFallbackPage/SyntheticsFallbackPage";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";
import { SyntheticsStats } from "pages/SyntheticsStats/SyntheticsStats";
import { watchNetwork } from "@wagmi/core";
import { useDisconnect } from "wagmi";
import useWallet from "lib/wallets/useWallet";
import { swrGCMiddleware } from "lib/swrMiddlewares";
import useTradeRedirect from "lib/useTradeRedirect";
import { SubaccountContextProvider } from "context/SubaccountContext/SubaccountContext";
import { SubaccountModal } from "components/Synthetics/SubaccountModal/SubaccountModal";
import { SettingsModal } from "components/SettingsModal/SettingsModal";
import { LeaderboardPage, CompetitionRedirect } from "pages/LeaderboardPage/LeaderboardPage";

if (window?.ethereum?.autoRefreshOnNetworkChange) {
  window.ethereum.autoRefreshOnNetworkChange = false;
}

const Zoom = cssTransition({
  enter: "zoomIn",
  exit: "zoomOut",
  appendPosition: false,
  collapse: true,
  collapseDuration: 200,
  duration: 200,
});

function FullApp({ pendingTxns, setPendingTxns }) {
  const { disconnect } = useDisconnect();
  const isHome = isHomeSite();
  const exchangeRef = useRef();
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
      if (encodedReferralCode !== ethers.constants.HashZero) {
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

  const [tradePageVersion, setTradePageVersion] = useLocalStorageSerializeKey(
    [chainId, TRADE_LINK_KEY],
    getIsSyntheticsSupported(chainId) ? 2 : 1
  );
  const [redirectModalVisible, setRedirectModalVisible] = useState(false);
  const [shouldHideRedirectModal, setShouldHideRedirectModal] = useState(false);
  const [redirectPopupTimestamp, setRedirectPopupTimestamp] = useLocalStorage(REDIRECT_POPUP_TIMESTAMP_KEY, undefined, {
    deserializer: (val) => {
      if (!val) {
        return undefined;
      }
      const num = parseInt(val);

      if (Number.isNaN(num)) {
        return undefined;
      }

      return num;
    },
    serializer: (val) => (val ? val.toString() : undefined),
  });
  const [selectedToPage, setSelectedToPage] = useState("");

  const settings = useSettings();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const openSettings = useCallback(() => {
    setIsSettingsVisible(true);
  }, []);

  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const baseUrl = getAppBaseUrl();
  let appRedirectUrl = baseUrl + selectedToPage;
  if (localStorageCode && localStorageCode.length > 0 && localStorageCode !== ethers.constants.HashZero) {
    const decodedRefCode = decodeReferralCode(localStorageCode);
    if (decodedRefCode) {
      appRedirectUrl = `${appRedirectUrl}?ref=${decodedRefCode}`;
    }
  }

  const showRedirectModal = (to) => {
    setRedirectModalVisible(true);
    setSelectedToPage(to);
  };

  useTradeRedirect({ chainId, tradePageVersion, setTradePageVersion });

  const { wsProvider } = useWebsocketProvider();

  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  useEffect(() => {
    const wsVaultAbi = chainId === ARBITRUM ? VaultV2.abi : VaultV2b.abi;
    if (hasV1LostFocus || !wsProvider) {
      return;
    }

    const wsVault = new ethers.Contract(vaultAddress, wsVaultAbi, wsProvider);
    const wsPositionRouter = new ethers.Contract(positionRouterAddress, PositionRouter.abi, wsProvider);

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
            redirectPopupTimestamp={redirectPopupTimestamp}
            showRedirectModal={showRedirectModal}
            tradePageVersion={tradePageVersion}
          />
          {isHome && (
            <Switch>
              <Route exact path="/">
                <Home showRedirectModal={showRedirectModal} redirectPopupTimestamp={redirectPopupTimestamp} />
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
              <Route exact path="/v1">
                <Exchange
                  ref={exchangeRef}
                  savedShowPnlAfterFees={settings.showPnlAfterFees}
                  savedIsPnlInLeverage={settings.isPnlInLeverage}
                  setSavedIsPnlInLeverage={settings.setIsPnlInLeverage}
                  savedSlippageAmount={settings.savedAllowedSlippage}
                  setPendingTxns={setPendingTxns}
                  pendingTxns={pendingTxns}
                  savedShouldShowPositionLines={settings.shouldShowPositionLines}
                  setSavedShouldShowPositionLines={settings.setShouldShowPositionLines}
                  savedShouldDisableValidationForTesting={settings.shouldDisableValidationForTesting}
                  tradePageVersion={tradePageVersion}
                  setTradePageVersion={setTradePageVersion}
                  openSettings={openSettings}
                />
              </Route>
              <Route exact path="/dashboard">
                <Dashboard />
              </Route>
              <Route exact path="/stats/v1">
                <Stats />
              </Route>
              <Redirect exact from="/stats/v2" to="/stats" />
              <Route exact path="/stats">
                {getIsSyntheticsSupported(chainId) ? <SyntheticsStats /> : <SyntheticsFallbackPage />}
              </Route>
              <Route exact path="/earn">
                <Stake setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/buy">
                <Buy savedSlippageAmount={settings.savedAllowedSlippage} setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/pools">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider
                    savedIsPnlInLeverage={settings.isPnlInLeverage}
                    savedShowPnlAfterFees={settings.showPnlAfterFees}
                    skipLocalReferralCode={false}
                    pageType="pools"
                  >
                    <MarketPoolsPage
                      shouldDisableValidation={settings.shouldDisableValidationForTesting}
                      setPendingTxns={setPendingTxns}
                    />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>

              <Route exact path="/trade">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider
                    savedIsPnlInLeverage={settings.isPnlInLeverage}
                    savedShowPnlAfterFees={settings.showPnlAfterFees}
                    skipLocalReferralCode={false}
                    pageType="trade"
                  >
                    <SyntheticsPage
                      shouldDisableValidation={settings.shouldDisableValidationForTesting}
                      savedShouldShowPositionLines={settings.shouldShowPositionLines}
                      setSavedShouldShowPositionLines={settings.setShouldShowPositionLines}
                      setPendingTxns={setPendingTxns}
                      showPnlAfterFees={settings.showPnlAfterFees}
                      tradePageVersion={tradePageVersion}
                      setTradePageVersion={setTradePageVersion}
                      savedSlippageAmount={settings.savedAllowedSlippage}
                      openSettings={openSettings}
                    />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Redirect from="/v2" to="/trade" />
              <Route exact path="/buy_glp">
                <BuyGlp
                  savedSlippageAmount={settings.savedAllowedSlippage}
                  setPendingTxns={setPendingTxns}
                  savedShouldDisableValidationForTesting={settings.shouldDisableValidationForTesting}
                />
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
                  <SyntheticsStateContextProvider
                    savedIsPnlInLeverage={settings.isPnlInLeverage}
                    savedShowPnlAfterFees={settings.showPnlAfterFees}
                    skipLocalReferralCode
                    pageType="leaderboard"
                  >
                    <LeaderboardPage />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Route exact path="/competitions/">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider
                    savedIsPnlInLeverage={settings.isPnlInLeverage}
                    savedShowPnlAfterFees={settings.showPnlAfterFees}
                    skipLocalReferralCode
                    pageType="competitions"
                  >
                    <CompetitionRedirect />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Route path="/competitions/:leaderboardPageKey">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsStateContextProvider
                    savedIsPnlInLeverage={settings.isPnlInLeverage}
                    savedShowPnlAfterFees={settings.showPnlAfterFees}
                    skipLocalReferralCode
                    pageType="competitions"
                  >
                    <LeaderboardPage isCompetitions />
                  </SyntheticsStateContextProvider>
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Route exact path="/referrals">
                <Referrals pendingTxns={pendingTxns} setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/referrals/:account">
                <Referrals pendingTxns={pendingTxns} setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/nft_wallet">
                <NftWallet />
              </Route>
              <Route exact path="/claim_es_gmx">
                <ClaimEsGmx setPendingTxns={setPendingTxns} />
              </Route>

              <Route exact path="/actions/v1">
                <Actions />
              </Route>
              <Route exact path="/actions/v1/:account">
                <Actions
                  savedIsPnlInLeverage={settings.isPnlInLeverage}
                  savedShowPnlAfterFees={settings.showPnlAfterFees}
                />
              </Route>
              <Route exact path="/actions">
                <SyntheticsStateContextProvider
                  pageType="actions"
                  skipLocalReferralCode
                  savedIsPnlInLeverage={settings.isPnlInLeverage}
                  savedShowPnlAfterFees={settings.showPnlAfterFees}
                >
                  <SyntheticsActions />
                </SyntheticsStateContextProvider>
              </Route>
              <Redirect exact from="/actions/v2" to="/actions" />
              <Route exact path="/actions/:account">
                <SyntheticsStateContextProvider
                  pageType="actions"
                  skipLocalReferralCode={false}
                  savedIsPnlInLeverage={settings.isPnlInLeverage}
                  savedShowPnlAfterFees={settings.showPnlAfterFees}
                >
                  <SyntheticsActions />
                </SyntheticsStateContextProvider>
              </Route>
              <Route path="/actions/v2/:account">
                {({ match }) => <Redirect to={`/actions/${match.params.account}`} />}
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
                <BeginAccountTransfer setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/complete_account_transfer/:sender/:receiver">
                <CompleteAccountTransfer setPendingTxns={setPendingTxns} />
              </Route>

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
      />
      <EventToastContainer />
      <RedirectPopupModal
        redirectModalVisible={redirectModalVisible}
        setRedirectModalVisible={setRedirectModalVisible}
        appRedirectUrl={appRedirectUrl}
        setRedirectPopupTimestamp={setRedirectPopupTimestamp}
        setShouldHideRedirectModal={setShouldHideRedirectModal}
        shouldHideRedirectModal={shouldHideRedirectModal}
      />
      <SettingsModal isSettingsVisible={isSettingsVisible} setIsSettingsVisible={setIsSettingsVisible} />
      <SubaccountModal setPendingTxns={setPendingTxns} />
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
  const [pendingTxns, setPendingTxns] = useState([]);

  useEffect(() => {
    const checkPendingTxns = async () => {
      const updatedPendingTxns = [];
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i];
        const receipt = await signer.provider.getTransactionReceipt(pendingTxn.hash);
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
    const unwatch = watchNetwork(({ chain, chains }) => {
      if (!chain || !chains) return;
      const isValidChain = chains.some((c) => c.id === chain.id);
      if (!isValidChain) {
        disconnect();
      }
    });
    return () => unwatch();
  }, [disconnect]);

  let app = <FullApp pendingTxn={pendingTxns} setPendingTxns={setPendingTxns} />;
  app = <SubaccountContextProvider>{app}</SubaccountContextProvider>;
  app = <I18nProvider i18n={i18n}>{app}</I18nProvider>;
  app = <SyntheticsEventsProvider setPendingTxns={setPendingTxns}>{app}</SyntheticsEventsProvider>;
  app = <WebsocketContextProvider>{app}</WebsocketContextProvider>;
  app = <Router>{app}</Router>;
  app = <SEO>{app}</SEO>;
  app = <SettingsContextProvider>{app}</SettingsContextProvider>;
  app = <SWRConfig value={SWRConfigProp}>{app}</SWRConfig>;

  return app;
}

export default App;
