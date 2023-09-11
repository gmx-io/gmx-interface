import { ethers } from "ethers";
import useScrollToTop from "lib/useScrollToTop";
import { useEffect, useRef, useState } from "react";
import { SWRConfig } from "swr";

import { Redirect, Route, HashRouter as Router, Switch, useHistory, useLocation } from "react-router-dom";

import { BASIS_POINTS_DIVISOR } from "config/factors";
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

import Checkbox from "components/Checkbox/Checkbox";
import Modal from "components/Modal/Modal";
import { cssTransition, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "styles/Font.css";
import "styles/Input.css";
import "styles/Shared.css";
import "./App.scss";

import SEO from "components/Common/SEO";
import EventToastContainer from "components/EventToast/EventToastContainer";
import useEventToast from "components/EventToast/useEventToast";
import Tooltip from "components/Tooltip/Tooltip";
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
import { t, Trans } from "@lingui/macro";
import { I18nProvider } from "@lingui/react";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Header } from "components/Header/Header";
import { ARBITRUM, EXECUTION_FEE_CONFIG_V2, getExplorerUrl } from "config/chains";
import { isDevelopment } from "config/env";
import { getIsSyntheticsSupported, getIsV1Supported } from "config/features";
import {
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  DISABLE_ORDER_VALIDATION_KEY,
  IS_PNL_IN_LEVERAGE_KEY,
  LANGUAGE_LOCALSTORAGE_KEY,
  REFERRAL_CODE_KEY,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
  SHOULD_SHOW_POSITION_LINES_KEY,
  SHOW_PNL_AFTER_FEES_KEY,
} from "config/localStorage";
import { TOAST_AUTO_CLOSE_TIME, WS_LOST_FOCUS_TIMEOUT } from "config/ui";
import { SettingsContextProvider, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { SyntheticsEventsProvider } from "context/SyntheticsEvents";
import { useWebsocketProvider, WebsocketContextProvider } from "context/WebsocketContext/WebsocketContextProvider";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { roundToTwoDecimals } from "lib/numbers";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import { MarketPoolsPage } from "pages/MarketPoolsPage/MarketPoolsPage";
import SyntheticsActions from "pages/SyntheticsActions/SyntheticsActions";
import { SyntheticsFallbackPage } from "pages/SyntheticsFallbackPage/SyntheticsFallbackPage";
import { SyntheticsPage } from "pages/SyntheticsPage/SyntheticsPage";
import { SyntheticsStats } from "pages/SyntheticsStats/SyntheticsStats";
import NumberInput from "components/NumberInput/NumberInput";
import { watchNetwork } from "@wagmi/core";
import { useDisconnect } from "wagmi";
import useWallet from "lib/wallets/useWallet";
import { swrGCMiddleware } from "lib/swrMiddlewares";

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

function FullApp() {
  const { signer } = useWallet();
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
    getIsV1Supported(chainId) ? 1 : 2
  );
  const [redirectModalVisible, setRedirectModalVisible] = useState(false);
  const [shouldHideRedirectModal, setShouldHideRedirectModal] = useState(false);
  const [redirectPopupTimestamp, setRedirectPopupTimestamp] = useLocalStorage(REDIRECT_POPUP_TIMESTAMP_KEY);
  const [selectedToPage, setSelectedToPage] = useState("");

  const settings = useSettings();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const [slippageAmount, setSlippageAmount] = useState(0);
  const [executionFeeBufferBps, setExecutionFeeBufferBps] = useState(0);
  const [isPnlInLeverage, setIsPnlInLeverage] = useState(false);
  const [shouldDisableValidationForTesting, setShouldDisableValidationForTesting] = useState(false);

  const [showPnlAfterFees, setShowPnlAfterFees] = useState(true);
  const [showDebugValues, setShowDebugValues] = useState(false);

  const [savedIsPnlInLeverage, setSavedIsPnlInLeverage] = useLocalStorageSerializeKey(
    [chainId, IS_PNL_IN_LEVERAGE_KEY],
    false
  );

  const [savedShowPnlAfterFees, setSavedShowPnlAfterFees] = useLocalStorageSerializeKey(
    [chainId, SHOW_PNL_AFTER_FEES_KEY],
    true
  );

  let [savedShouldDisableValidationForTesting, setSavedShouldDisableValidationForTesting] = useLocalStorageSerializeKey(
    [chainId, DISABLE_ORDER_VALIDATION_KEY],
    false
  );
  if (!isDevelopment()) {
    savedShouldDisableValidationForTesting = false;
  }

  const [savedShouldShowPositionLines, setSavedShouldShowPositionLines] = useLocalStorageSerializeKey(
    [chainId, SHOULD_SHOW_POSITION_LINES_KEY],
    false
  );

  const openSettings = () => {
    const slippage = parseInt(settings.savedAllowedSlippage);
    setSlippageAmount(roundToTwoDecimals((slippage / BASIS_POINTS_DIVISOR) * 100));
    if (settings.executionFeeBufferBps !== undefined) {
      const bps = settings.executionFeeBufferBps;
      setExecutionFeeBufferBps(roundToTwoDecimals((bps / BASIS_POINTS_DIVISOR) * 100));
    }
    setIsPnlInLeverage(savedIsPnlInLeverage);
    setShowPnlAfterFees(savedShowPnlAfterFees);
    setShowDebugValues(settings.showDebugValues);
    setShouldDisableValidationForTesting(savedShouldDisableValidationForTesting);
    setIsSettingsVisible(true);
  };

  const saveAndCloseSettings = () => {
    const slippage = parseFloat(slippageAmount);
    if (isNaN(slippage)) {
      helperToast.error(t`Invalid slippage value`);
      return;
    }
    if (slippage > 5) {
      helperToast.error(t`Slippage should be less than 5%`);
      return;
    }
    const basisPoints = roundToTwoDecimals((slippage * BASIS_POINTS_DIVISOR) / 100);
    if (parseInt(basisPoints) !== parseFloat(basisPoints)) {
      helperToast.error(t`Max slippage precision is 0.01%`);
      return;
    }

    settings.setSavedAllowedSlippage(basisPoints);

    if (settings.shouldUseExecutionFeeBuffer) {
      const executionFeeBuffer = parseFloat(executionFeeBufferBps);
      if (isNaN(executionFeeBuffer) || executionFeeBuffer < 0) {
        helperToast.error(t`Invalid execution fee buffer value`);
        return;
      }
      const nextExecutionBufferFeeBps = roundToTwoDecimals((executionFeeBuffer * BASIS_POINTS_DIVISOR) / 100);

      if (parseInt(nextExecutionBufferFeeBps) !== parseFloat(nextExecutionBufferFeeBps)) {
        helperToast.error(t`Max execution fee buffer precision is 0.01%`);
        return;
      }

      settings.setExecutionFeeBufferBps(nextExecutionBufferFeeBps);
    }

    setSavedIsPnlInLeverage(isPnlInLeverage);
    setSavedShowPnlAfterFees(showPnlAfterFees);
    setSavedShouldDisableValidationForTesting(shouldDisableValidationForTesting);
    setIsSettingsVisible(false);
    settings.setShowDebugValues(showDebugValues);
  };

  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const baseUrl = getAppBaseUrl();
  let appRedirectUrl = baseUrl + selectedToPage;
  if (localStorageCode && localStorageCode.length > 0 && localStorageCode !== ethers.constants.HashZero) {
    const decodedRefCode = decodeReferralCode(localStorageCode);
    if (decodedRefCode) {
      appRedirectUrl = `${appRedirectUrl}?ref=${decodedRefCode}`;
    }
  }

  const [pendingTxns, setPendingTxns] = useState([]);

  const showRedirectModal = (to) => {
    setRedirectModalVisible(true);
    setSelectedToPage(to);
  };

  useEffect(
    function redirectTradePage() {
      if (location.pathname === "/v2" && query.has("no_redirect")) {
        if (tradePageVersion !== 2) {
          setTradePageVersion(2);
        }
        if (history.location.search) {
          history.replace({ search: "" });
        }
        return;
      }
      if (
        location.pathname === "/trade" &&
        (tradePageVersion === 2 || !getIsV1Supported(chainId)) &&
        getIsSyntheticsSupported(chainId)
      ) {
        history.replace("/v2");
      }

      if (
        location.pathname === "/v2" &&
        (tradePageVersion === 1 || !getIsSyntheticsSupported(chainId)) &&
        getIsV1Supported(chainId)
      ) {
        history.replace("/trade");
      }
    },
    [chainId, history, location, tradePageVersion, query, setTradePageVersion]
  );

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
                <Redirect to="/dashboard" />
              </Route>
              <Route exact path="/trade">
                <Exchange
                  ref={exchangeRef}
                  savedShowPnlAfterFees={savedShowPnlAfterFees}
                  savedIsPnlInLeverage={savedIsPnlInLeverage}
                  setSavedIsPnlInLeverage={setSavedIsPnlInLeverage}
                  savedSlippageAmount={settings.savedAllowedSlippage}
                  setPendingTxns={setPendingTxns}
                  pendingTxns={pendingTxns}
                  savedShouldShowPositionLines={savedShouldShowPositionLines}
                  setSavedShouldShowPositionLines={setSavedShouldShowPositionLines}
                  savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
                  tradePageVersion={tradePageVersion}
                  setTradePageVersion={setTradePageVersion}
                  openSettings={openSettings}
                />
              </Route>
              <Route exact path="/dashboard">
                <Dashboard />
              </Route>
              <Route exact path="/stats">
                <Stats />
              </Route>
              <Route exact path="/stats/v2">
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
                  <MarketPoolsPage
                    shouldDisableValidation={savedShouldDisableValidationForTesting}
                    setPendingTxns={setPendingTxns}
                  />
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>

              <Route exact path="/v2">
                {getIsSyntheticsSupported(chainId) ? (
                  <SyntheticsPage
                    savedIsPnlInLeverage={savedIsPnlInLeverage}
                    shouldDisableValidation={savedShouldDisableValidationForTesting}
                    savedShouldShowPositionLines={savedShouldShowPositionLines}
                    setSavedShouldShowPositionLines={setSavedShouldShowPositionLines}
                    setPendingTxns={setPendingTxns}
                    showPnlAfterFees={showPnlAfterFees}
                    savedShowPnlAfterFees={savedShowPnlAfterFees}
                    tradePageVersion={tradePageVersion}
                    setTradePageVersion={setTradePageVersion}
                    savedSlippageAmount={settings.savedAllowedSlippage}
                    openSettings={openSettings}
                  />
                ) : (
                  <SyntheticsFallbackPage />
                )}
              </Route>
              <Route exact path="/buy_glp">
                <BuyGlp
                  savedSlippageAmount={settings.savedAllowedSlippage}
                  setPendingTxns={setPendingTxns}
                  savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
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
              <Route exact path="/actions/v2">
                <SyntheticsActions
                  savedIsPnlInLeverage={savedIsPnlInLeverage}
                  savedShowPnlAfterFees={savedShowPnlAfterFees}
                />
              </Route>
              <Route exact path="/actions/v2/:account">
                <SyntheticsActions
                  savedIsPnlInLeverage={savedIsPnlInLeverage}
                  savedShowPnlAfterFees={savedShowPnlAfterFees}
                />
              </Route>
              <Route exact path="/actions">
                <Actions />
              </Route>
              <Route exact path="/actions/:account">
                <Actions savedIsPnlInLeverage={savedIsPnlInLeverage} savedShowPnlAfterFees={savedShowPnlAfterFees} />
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
      <Modal
        className="App-settings"
        isVisible={isSettingsVisible}
        setIsVisible={setIsSettingsVisible}
        label={t`Settings`}
      >
        <div className="App-settings-row">
          <div>
            <Trans>Allowed Slippage</Trans>
          </div>
          <div className="App-slippage-tolerance-input-container">
            <NumberInput
              className="App-slippage-tolerance-input"
              value={slippageAmount}
              onValueChange={(e) => setSlippageAmount(e.target.value)}
              placeholder="0.3"
            />
            <div className="App-slippage-tolerance-input-percent">%</div>
          </div>
        </div>
        {settings.shouldUseExecutionFeeBuffer && (
          <div className="App-settings-row">
            <div>
              <Tooltip
                handle={<Trans>Max Execution Fee Buffer</Trans>}
                renderContent={() => (
                  <div>
                    <Trans>
                      The Max Execution Fee is set to a higher value to handle potential increases in gas price during
                      order execution. Any excess execution fee will be refunded to your account when the order is
                      executed. Only applicable to GMX V2.
                    </Trans>
                    <br />
                    <br />
                    <ExternalLink href="https://docs.gmx.io/docs/trading/v2#execution-fee">Read more</ExternalLink>
                  </div>
                )}
              />
            </div>
            <div className="App-slippage-tolerance-input-container">
              <NumberInput
                className="App-slippage-tolerance-input"
                value={executionFeeBufferBps}
                onValueChange={(e) => setExecutionFeeBufferBps(e.target.value)}
                placeholder="10"
              />
              <div className="App-slippage-tolerance-input-percent">%</div>
            </div>
            {parseFloat(executionFeeBufferBps) <
              (EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps / BASIS_POINTS_DIVISOR) * 100 && (
              <div className="warning">
                <Trans>
                  Max Execution Fee buffer below{" "}
                  {(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps / BASIS_POINTS_DIVISOR) * 100}% may result in
                  failed orders.
                </Trans>
              </div>
            )}
          </div>
        )}
        <div className="Exchange-settings-row">
          <Checkbox isChecked={showPnlAfterFees} setIsChecked={setShowPnlAfterFees}>
            <Trans>Display PnL after fees</Trans>
          </Checkbox>
        </div>
        <div className="Exchange-settings-row">
          <Checkbox isChecked={isPnlInLeverage} setIsChecked={setIsPnlInLeverage}>
            <Trans>Include PnL in leverage display</Trans>
          </Checkbox>
        </div>
        <div className="Exchange-settings-row chart-positions-settings">
          <Checkbox isChecked={savedShouldShowPositionLines} setIsChecked={setSavedShouldShowPositionLines}>
            <span>
              <Trans>Chart positions</Trans>
            </span>
          </Checkbox>
        </div>
        {isDevelopment() && (
          <div className="Exchange-settings-row">
            <Checkbox isChecked={shouldDisableValidationForTesting} setIsChecked={setShouldDisableValidationForTesting}>
              <Trans>Disable order validations</Trans>
            </Checkbox>
          </div>
        )}

        {isDevelopment() && (
          <div className="Exchange-settings-row">
            <Checkbox isChecked={showDebugValues} setIsChecked={setShowDebugValues}>
              <Trans>Show debug values</Trans>
            </Checkbox>
          </div>
        )}

        <Button variant="primary-action" className="w-full mt-md" onClick={saveAndCloseSettings}>
          <Trans>Save</Trans>
        </Button>
      </Modal>
    </>
  );
}

function App() {
  const { disconnect } = useDisconnect();

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

  return (
    <SWRConfig
      value={{ refreshInterval: 5000, refreshWhenHidden: false, refreshWhenOffline: false, use: [swrGCMiddleware] }}
    >
      <SettingsContextProvider>
        <SEO>
          <Router>
            <WebsocketContextProvider>
              <SyntheticsEventsProvider>
                <I18nProvider i18n={i18n}>
                  <FullApp />
                </I18nProvider>
              </SyntheticsEventsProvider>
            </WebsocketContextProvider>
          </Router>
        </SEO>
      </SettingsContextProvider>
    </SWRConfig>
  );
}

export default App;
