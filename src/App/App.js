import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useSWR, { SWRConfig } from "swr";
import { ethers } from "ethers";
import { Web3ReactProvider, useWeb3React } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";
import useScrollToTop from "lib/useScrollToTop";

import { Switch, Route, HashRouter as Router, useLocation, useHistory } from "react-router-dom";

import {
  DEFAULT_SLIPPAGE_AMOUNT,
  BASIS_POINTS_DIVISOR,
  getAppBaseUrl,
  isHomeSite,
  isMobileDevice,
  REFERRAL_CODE_QUERY_PARAM,
} from "lib/legacy";

import Home from "pages/Home/Home";
import AppHome from "pages/AppHome/AppHome";
import Dashboard from "pages/Dashboard/Dashboard";
import Stats from "pages/Stats/Stats";
import Stake from "pages/Stake/Stake";
import { Exchange } from "pages/Exchange/Exchange";
import Actions from "pages/Actions/Actions";
import OrdersOverview from "pages/OrdersOverview/OrdersOverview";
import PositionsOverview from "pages/PositionsOverview/PositionsOverview";
import Referrals from "pages/Referrals/Referrals";
import BuyGlp from "pages/BuyGlp/BuyGlp";
import BuyGMX from "pages/BuyGMX/BuyGMX";
import Buy from "pages/Buy/Buy";
import NftWallet from "pages/NftWallet/NftWallet";
import ClaimEsGmx from "pages/ClaimEsGmx/ClaimEsGmx";
import BeginAccountTransfer from "pages/BeginAccountTransfer/BeginAccountTransfer";
import CompleteAccountTransfer from "pages/CompleteAccountTransfer/CompleteAccountTransfer";

import { cssTransition, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Modal from "components/Modal/Modal";
import Checkbox from "components/Checkbox/Checkbox";

import "styles/Shared.css";
import "styles/Font.css";
import "./App.scss";
import "styles/Input.css";

import metamaskImg from "img/metamask.png";
import coinbaseImg from "img/coinbaseWallet.png";
import walletConnectImg from "img/walletconnect-circle-blue.svg";
import emailIcn from "img/icn_email.svg";
import useEventToast from "components/EventToast/useEventToast";
import EventToastContainer from "components/EventToast/EventToastContainer";
import SEO from "components/Common/SEO";
import useRouteQuery from "lib/useRouteQuery";
import { encodeReferralCode, decodeReferralCode } from "domain/referrals";

import { getContract } from "config/contracts";
import VaultV2 from "abis/VaultV2.json";
import VaultV2b from "abis/VaultV2b.json";
import Reader from "abis/ReaderV2.json";
import PositionRouter from "abis/PositionRouter.json";
import PageNotFound from "pages/PageNotFound/PageNotFound";
import ReferralTerms from "pages/ReferralTerms/ReferralTerms";
import TermsAndConditions from "pages/TermsAndConditions/TermsAndConditions";
import { useLocalStorage } from "react-use";
import { RedirectPopupModal } from "components/ModalViews/RedirectModal";
import { REDIRECT_POPUP_TIMESTAMP_KEY } from "config/localStorage";

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Trans, t } from "@lingui/macro";
import { AnimatePresence, motion } from "framer-motion";
import { defaultLocale, dynamicActivate } from "lib/i18n";
import { Header } from "components/Header/Header";
import { ARBITRUM, AVALANCHE, getAlchemyWsUrl, getExplorerUrl } from "config/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { helperToast } from "lib/helperToast";
import {
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  DISABLE_ORDER_VALIDATION_KEY,
  IS_PNL_IN_LEVERAGE_KEY,
  LANGUAGE_LOCALSTORAGE_KEY,
  REFERRAL_CODE_KEY,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
  SHOULD_SHOW_POSITION_LINES_KEY,
  SHOW_PNL_AFTER_FEES_KEY,
  SLIPPAGE_BPS_KEY,
} from "config/localStorage";
import {
  activateInjectedProvider,
  clearWalletConnectData,
  clearWalletLinkData,
  getInjectedHandler,
  getWalletConnectHandler,
  hasCoinBaseWalletExtension,
  hasMetaMaskWalletExtension,
  useEagerConnect,
  useHandleUnsupportedNetwork,
  useInactiveListener,
} from "lib/wallets";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { isDevelopment } from "config/env";
import Button from "components/Button/Button";
import ApproveTokens from "components/ApproveTokens/ApproveTokens";
import { useInfoTokens } from "domain/tokens";
import { contractFetcher } from "lib/contracts";
import { getTokens } from "config/tokens";
import { SwapBox } from "pages/Swap/Swap";
import UserOnboardSection from "components/UserOnboardSection/UserOnboardSection";
import OtpInput from "components/OtpInput/OtpInput";
import { createOtp } from "config/tool";
import sendOtp from "external/sendOtp";
import { updateUserEmail } from "external/supabase/supabaseFns";

if (window?.ethereum?.autoRefreshOnNetworkChange) {
  window.ethereum.autoRefreshOnNetworkChange = false;
}

function getLibrary(provider) {
  const library = new Web3Provider(provider);
  return library;
}

const Zoom = cssTransition({
  enter: "zoomIn",
  exit: "zoomOut",
  appendPosition: false,
  collapse: true,
  collapseDuration: 200,
  duration: 200,
});

const arbWsProvider = new ethers.providers.WebSocketProvider(getAlchemyWsUrl());

const avaxWsProvider = new ethers.providers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
avaxWsProvider.pollingInterval = 2000;

function getWsProvider(active, chainId) {
  if (!active) {
    return;
  }
  if (chainId === ARBITRUM) {
    return arbWsProvider;
  }

  if (chainId === AVALANCHE) {
    return avaxWsProvider;
  }
}

function FullApp() {
  const isHome = isHomeSite();
  const exchangeRef = useRef();
  const { connector, library, deactivate, activate, active, account } = useWeb3React();
  const { chainId } = useChainId();
  const location = useLocation();
  const history = useHistory();
  useEventToast();
  const [activatingConnector, setActivatingConnector] = useState();
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector, chainId]);
  const triedEager = useEagerConnect(setActivatingConnector);
  useInactiveListener(!triedEager || !!activatingConnector);

  useHandleUnsupportedNetwork();

  const query = useRouteQuery();

  useEffect(() => {
    let referralCode = query.get(REFERRAL_CODE_QUERY_PARAM);
    if (!referralCode || referralCode.length === 0) {
      const params = new URLSearchParams(window.location.search);
      referralCode = params.get(REFERRAL_CODE_QUERY_PARAM);
    }

    if (referralCode && referralCode.length <= 20) {
      const encodedReferralCode = encodeReferralCode(referralCode);
      if (encodeReferralCode !== ethers.constants.HashZero) {
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

  const disconnectAccount = useCallback(() => {
    // only works with WalletConnect
    clearWalletConnectData();
    // force clear localStorage connection for MM/CB Wallet (Brave legacy)
    clearWalletLinkData();
    deactivate();
  }, [deactivate]);

  const disconnectAccountAndCloseSettings = () => {
    disconnectAccount();
    localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);
    setIsSettingsVisible(false);
  };

  const connectInjectedWallet = getInjectedHandler(activate, deactivate);
  const activateWalletConnect = () => {
    getWalletConnectHandler(activate, deactivate, setActivatingConnector)();
    setActiveStep(2);
  };

  const handleApproveTokens = () => {
    setApprovalsModalVisible(true);
    setWalletModalVisible(false);
  };

  const handleConnectWallet = () => {
    setShowConnectOptions(!showConnectOptions);
  };

  const handleEmailVerifyClick = () => {
    setShowEmailVerification(true);
  };

  const userOnMobileDevice = "navigator" in window && isMobileDevice(window.navigator);

  const activateMetaMask = () => {
    if (!hasMetaMaskWalletExtension()) {
      helperToast.error(
        <div>
          <Trans>MetaMask not detected.</Trans>
          <br />
          <br />
          {userOnMobileDevice ? (
            <Trans>
              <ExternalLink href="https://metamask.io">Install MetaMask</ExternalLink>, and use GMX with its built-in
              browser.
            </Trans>
          ) : (
            <Trans>
              <ExternalLink href="https://metamask.io">Install MetaMask</ExternalLink> to start using GMX.
            </Trans>
          )}
        </div>
      );
      return false;
    }
    attemptActivateWallet("MetaMask");
  };
  const activateCoinBase = () => {
    if (!hasCoinBaseWalletExtension()) {
      helperToast.error(
        <div>
          <Trans>Coinbase Wallet not detected.</Trans>
          <br />
          <br />
          {userOnMobileDevice ? (
            <Trans>
              <ExternalLink href="https://www.coinbase.com/wallet">Install Coinbase Wallet</ExternalLink>, and use GMX
              with its built-in browser.
            </Trans>
          ) : (
            <Trans>
              <ExternalLink href="https://www.coinbase.com/wallet">Install Coinbase Wallet</ExternalLink> to start using
              GMX.
            </Trans>
          )}
        </div>
      );
      return false;
    }
    attemptActivateWallet("CoinBase");
  };

  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [redirectModalVisible, setRedirectModalVisible] = useState(false);
  const [shouldHideRedirectModal, setShouldHideRedirectModal] = useState(false);
  const [redirectPopupTimestamp, setRedirectPopupTimestamp] = useLocalStorage(REDIRECT_POPUP_TIMESTAMP_KEY);
  const [selectedToPage, setSelectedToPage] = useState("");
  const [approvalsModalVisible, setApprovalsModalVisible] = useState(false);
  const [showConnectOptions, setShowConnectOptions] = useState(false);
  const [hasTokens, setHasTokens] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(0);
  const [userEnteredOtp, setUserEnteredOtp] = useState("");
  const [doesUserHaveEmail, setDoesUserHaveEmail] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const connectWallet = () => setWalletModalVisible(true);

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [savedSlippageAmount, setSavedSlippageAmount] = useLocalStorageSerializeKey(
    [chainId, SLIPPAGE_BPS_KEY],
    DEFAULT_SLIPPAGE_AMOUNT
  );
  const [slippageAmount, setSlippageAmount] = useState(0);
  const [isPnlInLeverage, setIsPnlInLeverage] = useState(false);
  const [shouldDisableValidationForTesting, setShouldDisableValidationForTesting] = useState(false);
  const [showPnlAfterFees, setShowPnlAfterFees] = useState(true);
  const [emailText, setEmailText] = useState("");

  const [savedIsPnlInLeverage, setSavedIsPnlInLeverage] = useLocalStorageSerializeKey(
    [chainId, IS_PNL_IN_LEVERAGE_KEY],
    false
  );

  const [savedShowPnlAfterFees, setSavedShowPnlAfterFees] = useLocalStorageSerializeKey(
    [chainId, SHOW_PNL_AFTER_FEES_KEY],
    true
  );
  const [savedShouldDisableValidationForTesting, setSavedShouldDisableValidationForTesting] =
    useLocalStorageSerializeKey([chainId, DISABLE_ORDER_VALIDATION_KEY], false);

  const [savedShouldShowPositionLines, setSavedShouldShowPositionLines] = useLocalStorageSerializeKey(
    [chainId, SHOULD_SHOW_POSITION_LINES_KEY],
    false
  );

  const attemptActivateWallet = (providerName) => {
    localStorage.setItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY, true);
    localStorage.setItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY, providerName);
    activateInjectedProvider(providerName);
    connectInjectedWallet();
    setActiveStep(2);
    setShowConnectOptions(false);
  };

  const openSettings = () => {
    const slippage = parseInt(savedSlippageAmount);
    setSlippageAmount((slippage / BASIS_POINTS_DIVISOR) * 100);
    setIsPnlInLeverage(savedIsPnlInLeverage);
    setShowPnlAfterFees(savedShowPnlAfterFees);
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

    const basisPoints = (slippage * BASIS_POINTS_DIVISOR) / 100;
    if (parseInt(basisPoints) !== parseFloat(basisPoints)) {
      helperToast.error(t`Max slippage precision is 0.01%`);
      return;
    }

    setSavedIsPnlInLeverage(isPnlInLeverage);
    setSavedShowPnlAfterFees(showPnlAfterFees);
    setSavedShouldDisableValidationForTesting(shouldDisableValidationForTesting);
    setSavedSlippageAmount(basisPoints);
    setIsSettingsVisible(false);
  };

  const handleEmailEntered = (email) => {
    // Regular expression for email validation
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    return Boolean(emailRegex.test(email));
  };

  const handleEmailSubmit = async (email) => {
    if (handleEmailEntered(emailText)) {
      // generate new otp
      const otp = createOtp();
      setGeneratedOtp(otp);

      // check if email has been sent with otp
      const otpSentSuccessfully = await sendOtp(email, otp);
      if (otpSentSuccessfully) {
        setShowOtp(true);
      }
    } else {
      helperToast.error("Invalid Email Address.");
    }
  };

  const handleOtpEntered = (userEnteredOtp) => {
    setUserEnteredOtp(userEnteredOtp);
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

  const readerAddress = getContract(chainId, "Reader");
  const tokens = getTokens(chainId);
  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(active && [active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(library, Reader, [tokenAddresses]),
  });
  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances);
  const nonZeroBalanceTokens = useMemo(() => {
    return [];
  }, []);

  const optionalSectionVisibilityVariants = {
    hidden: { opacity: 0, scaleY: 0 },
    visible: { opacity: 1, scaleY: 1, transition: { type: "ease", duration: 1 } },
    exit: { opacity: 0, scaleY: 0, transition: { type: "ease", duration: 1 } },
  };

  useEffect(() => {
    for (let key in infoTokens) {
      let tokenInfo = infoTokens[key];
      if (tokenInfo.balance && tokenInfo.balance.gt(0) && tokenInfo.symbol !== "ETH") {
        if (!nonZeroBalanceTokens.some((token) => token.address === tokenInfo.address)) {
          nonZeroBalanceTokens.push(tokenInfo);
        }
      }
    }

    if (nonZeroBalanceTokens.length > 0) {
      setHasTokens(true);
    }
  }, [infoTokens, nonZeroBalanceTokens]);

  useEffect(() => {
    const checkPendingTxns = async () => {
      const updatedPendingTxns = [];
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i];
        const receipt = await library.getTransactionReceipt(pendingTxn.hash);
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
  }, [library, pendingTxns, chainId]);

  useEffect(() => {
    if (userEnteredOtp.match(/^\d{4}$/)) {
      if (userEnteredOtp === generatedOtp) {
        const updateEmail = async () => {
          const updateEmail = await updateUserEmail(account, emailText);

          if (updateEmail) {
            helperToast.success("Email verified successfully!");

            // reset state vars
            setWalletModalVisible(false);
            setShowOtp(false);
          } else {
            helperToast.error("Error updating email.");
          }
        };

        updateEmail();

        // reset email vars
        setShowEmailVerification(false);
        setEmailText("");
        setUserEnteredOtp("");
        setActiveStep(1);
      } else {
        helperToast.error("OTP entered is incorrect.");
      }
    } else {
      return;
    }
  }, [userEnteredOtp, generatedOtp, account, emailText]);

  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  useEffect(() => {
    const wsVaultAbi = chainId === ARBITRUM ? VaultV2.abi : VaultV2b.abi;
    const wsProvider = getWsProvider(active, chainId);
    if (!wsProvider) {
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
  }, [active, chainId, vaultAddress, positionRouterAddress]);

  return (
    <>
      <div className="App">
        <div className="App-content">
          <Header
            disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
            openSettings={openSettings}
            setWalletModalVisible={setWalletModalVisible}
            setApprovalsModalVisible={setApprovalsModalVisible}
            setDoesUserHaveEmail={setDoesUserHaveEmail}
            redirectPopupTimestamp={redirectPopupTimestamp}
            showRedirectModal={showRedirectModal}
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
                <AppHome showRedirectModal={showRedirectModal} redirectPopupTimestamp={redirectPopupTimestamp} />
              </Route>
              <Route exact path="/trade">
                <Exchange
                  ref={exchangeRef}
                  savedShowPnlAfterFees={savedShowPnlAfterFees}
                  savedIsPnlInLeverage={savedIsPnlInLeverage}
                  setSavedIsPnlInLeverage={setSavedIsPnlInLeverage}
                  savedSlippageAmount={savedSlippageAmount}
                  setPendingTxns={setPendingTxns}
                  pendingTxns={pendingTxns}
                  savedShouldShowPositionLines={savedShouldShowPositionLines}
                  setSavedShouldShowPositionLines={setSavedShouldShowPositionLines}
                  connectWallet={connectWallet}
                  savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
                />
              </Route>
              <Route exact path="/dashboard">
                <Dashboard />
              </Route>
              <Route exact path="/stats">
                <Stats />
              </Route>
              <Route exact path="/earn">
                <Stake setPendingTxns={setPendingTxns} connectWallet={connectWallet} />
              </Route>
              <Route exact path="/swap">
                <SwapBox
                  ref={exchangeRef}
                  savedShowPnlAfterFees={savedShowPnlAfterFees}
                  savedIsPnlInLeverage={savedIsPnlInLeverage}
                  setSavedIsPnlInLeverage={setSavedIsPnlInLeverage}
                  savedSlippageAmount={savedSlippageAmount}
                  setPendingTxns={setPendingTxns}
                  pendingTxns={pendingTxns}
                  savedShouldShowPositionLines={savedShouldShowPositionLines}
                  setSavedShouldShowPositionLines={setSavedShouldShowPositionLines}
                  connectWallet={connectWallet}
                  savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
                />
              </Route>
              <Route exact path="/buy">
                <Buy
                  savedSlippageAmount={savedSlippageAmount}
                  setPendingTxns={setPendingTxns}
                  connectWallet={connectWallet}
                />
              </Route>
              <Route exact path="/buy_glp">
                <BuyGlp
                  savedSlippageAmount={savedSlippageAmount}
                  setPendingTxns={setPendingTxns}
                  connectWallet={connectWallet}
                  savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
                />
              </Route>
              <Route exact path="/buy_gmx">
                <BuyGMX />
              </Route>
              <Route exact path="/referrals">
                <Referrals pendingTxns={pendingTxns} connectWallet={connectWallet} setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/referrals/:account">
                <Referrals pendingTxns={pendingTxns} connectWallet={connectWallet} setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/nft_wallet">
                <NftWallet />
              </Route>
              <Route exact path="/claim_es_gmx">
                <ClaimEsGmx setPendingTxns={setPendingTxns} />
              </Route>
              <Route exact path="/actions">
                <Actions />
              </Route>
              <Route exact path="/actions/:account">
                <Actions savedIsPnlInLeverage={savedIsPnlInLeverage} savedShowPnlAfterFees={savedShowPnlAfterFees} />
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
        autoClose={7000}
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
        className="Connect-wallet-modal"
        isVisible={walletModalVisible}
        setIsVisible={setWalletModalVisible}
        label={`Get Started`}
      >
        <div className="Page-description">
          <Trans>{`Connect your wallet and agree to terms.`}</Trans>
        </div>
        <div className="Modal-content-wrapper">
          <UserOnboardSection
            step={1}
            text={`Connect Wallet`}
            handleClick={handleConnectWallet}
            disabled={false}
            showArrow={true}
            isActive={activeStep === 2}
          />

          <AnimatePresence>
            {showConnectOptions && (
              <motion.div
                className="Wallets-container"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={optionalSectionVisibilityVariants}
                style={{ originY: 0 }}
              >
                <button className="Wallet-btn MetaMask-btn" onClick={activateMetaMask}>
                  <img src={metamaskImg} alt="MetaMask" />
                  <div>
                    <Trans>MetaMask</Trans>
                  </div>
                </button>
                <button className="Wallet-btn CoinbaseWallet-btn" onClick={activateCoinBase}>
                  <img src={coinbaseImg} alt="Coinbase Wallet" />
                  <div>
                    <Trans>Coinbase Wallet</Trans>
                  </div>
                </button>
                <button className="Wallet-btn WalletConnect-btn" onClick={activateWalletConnect}>
                  <img src={walletConnectImg} alt="WalletConnect" />
                  <div>
                    <Trans>WalletConnect</Trans>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <UserOnboardSection
            step={2}
            text={`Enable One-Click Trading`}
            handleClick={handleApproveTokens}
            disabled={!(active && hasTokens)}
            showArrow={true}
            isActive={activeStep === 3}
          />

          {!doesUserHaveEmail && (
            <UserOnboardSection
              step={3}
              text={`Enable Email Notifications`}
              handleClick={handleEmailVerifyClick}
              disabled={!active}
              showArrow={true}
              isActive={activeStep === 4}
            />
          )}

          <AnimatePresence>
            {showEmailVerification && (
              <motion.div
                className="Wallets-container"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={optionalSectionVisibilityVariants}
                style={{ originY: 0 }}
              >
                <div className="Email-input-section">
                  <img src={emailIcn} alt="Email icon" />
                  <input
                    type="text"
                    placeholder="Enter email here"
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                  />
                </div>

                <Button variant="approve-done" className="w-20 h-full" onClick={() => handleEmailSubmit(emailText)}>
                  {`Done`}
                </Button>
                {showOtp && (
                  <motion.div
                    className="Wallets-container"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={optionalSectionVisibilityVariants}
                    style={{ originY: 0 }}
                  >
                    <OtpInput
                      onOtpEntered={handleOtpEntered}
                      generatedOtp={generatedOtp}
                      resendHandler={() => handleEmailSubmit(emailText)}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>

      <Modal
        className="Approve-tokens-modal"
        isVisible={approvalsModalVisible}
        setIsVisible={setApprovalsModalVisible}
        label={`Enable 1-Click Trading`}
      >
        <ApproveTokens
          chainId={chainId}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
          nonZeroBalanceTokens={nonZeroBalanceTokens}
          closeApprovalsModal={() => {
            setApprovalsModalVisible(false);
            setWalletModalVisible(true);
            setActiveStep(3);
          }}
        />
      </Modal>
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
            <input
              type="number"
              className="App-slippage-tolerance-input"
              min="0"
              value={slippageAmount}
              onChange={(e) => setSlippageAmount(e.target.value)}
            />
            <div className="App-slippage-tolerance-input-percent">%</div>
          </div>
        </div>
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

        <Button variant="primary-action" className="w-100 mt-md" onClick={saveAndCloseSettings}>
          <Trans>Save</Trans>
        </Button>
      </Modal>
    </>
  );
}

function App() {
  useScrollToTop();
  useEffect(() => {
    const defaultLanguage = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale;
    dynamicActivate(defaultLanguage);
  }, []);
  return (
    <SWRConfig value={{ refreshInterval: 5000 }}>
      <Web3ReactProvider getLibrary={getLibrary}>
        <SEO>
          <Router>
            <I18nProvider i18n={i18n}>
              <FullApp />
            </I18nProvider>
          </Router>
        </SEO>
      </Web3ReactProvider>
    </SWRConfig>
  );
}

export default App;
