import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { cssTransition, ToastContainer } from "react-toastify";
import { Hash } from "viem";

import { ContractsChainId, CONTRACTS_CHAIN_IDS } from "config/chains";
import { REFERRAL_CODE_KEY } from "config/localStorage";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { useMultichainFundingToast } from "domain/multichain/useMultichainFundingToast";
import { useRealChainIdWarning } from "lib/chains/useRealChainIdWarning";
import { getAppBaseUrl, isHomeSite, REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import { useAccountInitedMetric, useOpenAppMetric } from "lib/metrics";
import { useConfigureMetrics } from "lib/metrics/useConfigureMetrics";
import { useHashQueryParams } from "lib/useHashQueryParams";
import { LandingPageAgreementConfirmationEvent } from "lib/userAnalytics/types";
import { useConfigureUserAnalyticsProfile } from "lib/userAnalytics/useConfigureUserAnalyticsProfile";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";
import { useWalletConnectedUserAnalyticsEvent } from "lib/userAnalytics/useWalletConnectedEvent";
import useRouteQuery from "lib/useRouteQuery";
import useSearchParams from "lib/useSearchParams";
import { switchNetwork } from "lib/wallets";
import HomeFooter from "pages/Home/HomeFooter";
import { decodeReferralCode, encodeReferralCode } from "sdk/utils/referrals";

import { CloseToastButton } from "components/CloseToastButton/CloseToastButton";
import EventToastContainer from "components/EventToast/EventToastContainer";
import useEventToast from "components/EventToast/useEventToast";
import { Header } from "components/Header/Header";
import { RedirectPopupModal } from "components/ModalViews/RedirectModal";
import { NotifyModal } from "components/NotifyModal/NotifyModal";
import { SettingsModal } from "components/SettingsModal/SettingsModal";
import { GmxAccountModal } from "components/Synthetics/GmxAccountModal/GmxAccountModal";

import { HomeRoutes } from "./HomeRoutes";
import { MainRoutes } from "./MainRoutes";

const Zoom = cssTransition({
  enter: "zoomIn",
  exit: "zoomOut",
  appendPosition: false,
  collapse: true,
  collapseDuration: 200,
});

export function AppRoutes() {
  const { theme } = useTheme();
  const isHome = isHomeSite();
  const location = useLocation();
  const history = useHistory();

  useEventToast();
  useConfigureMetrics();
  useConfigureUserAnalyticsProfile();
  useOpenAppMetric();
  useAccountInitedMetric();
  useWalletConnectedUserAnalyticsEvent();
  useMultichainFundingToast();
  useHashQueryParams();

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

  const [redirectModalVisible, setRedirectModalVisible] = useState(false);
  const [shouldHideRedirectModal, setShouldHideRedirectModal] = useState(false);

  const [selectedToPage, setSelectedToPage] = useState("");
  const { isSettingsVisible, setIsSettingsVisible } = useSettings();

  const openSettings = useCallback(() => {
    setIsSettingsVisible(true);
  }, [setIsSettingsVisible]);

  const localStorageCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
  const baseUrl = getAppBaseUrl();
  let appRedirectUrl = baseUrl + selectedToPage;
  if (localStorageCode && localStorageCode.length > 0 && localStorageCode !== ethers.ZeroHash) {
    const decodedRefCode = decodeReferralCode(localStorageCode as Hash);
    if (decodedRefCode) {
      appRedirectUrl = `${appRedirectUrl}?ref=${decodedRefCode}`;
    }
  }

  const showRedirectModal = useCallback((to: string) => {
    userAnalytics.pushEvent<LandingPageAgreementConfirmationEvent>({
      event: "LandingPageAction",
      data: {
        action: "AgreementConfirmationDialogShown",
      },
    });
    setRedirectModalVisible(true);
    setSelectedToPage(to);
  }, []);

  const urlParams = useSearchParams<{ chainId: string }>();

  useEffect(() => {
    const chainId = urlParams.chainId;
    if (chainId && CONTRACTS_CHAIN_IDS.includes(Number(chainId) as ContractsChainId)) {
      switchNetwork(Number(chainId), true).then(() => {
        const searchParams = new URLSearchParams(history.location.search);
        searchParams.delete("chainId");
        history.replace({
          pathname: history.location.pathname,
          search: searchParams.toString(),
        });
      });
    }
  }, [urlParams, history]);

  useRealChainIdWarning();

  return (
    <>
      <div className="App w-full">
        {isHome ? (
          <div className="bg-[#08091b]">
            <Header openSettings={openSettings} showRedirectModal={showRedirectModal} />
            <HomeRoutes showRedirectModal={showRedirectModal} />
            <HomeFooter />
          </div>
        ) : (
          <MainRoutes openSettings={openSettings} />
        )}
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
        theme={theme}
        icon={false}
        closeButton={CloseToastButton}
      />
      <EventToastContainer />
      <RedirectPopupModal
        redirectModalVisible={redirectModalVisible}
        setRedirectModalVisible={setRedirectModalVisible}
        appRedirectUrl={appRedirectUrl}
        setShouldHideRedirectModal={setShouldHideRedirectModal}
        shouldHideRedirectModal={shouldHideRedirectModal}
      />
      <GmxAccountModal />
      <SettingsModal isSettingsVisible={isSettingsVisible} setIsSettingsVisible={setIsSettingsVisible} />
      <NotifyModal />
    </>
  );
}
