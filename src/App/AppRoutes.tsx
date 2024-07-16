import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { ToastContainer, cssTransition } from "react-toastify";
import { useDisconnect } from "wagmi";

import {
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  REFERRAL_CODE_KEY,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
} from "config/localStorage";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { decodeReferralCode, encodeReferralCode } from "domain/referrals";
import { useChainId } from "lib/chains";
import { useRealChainIdWarning } from "lib/chains/useRealChainIdWarning";
import { useErrorReporting } from "lib/errorReporting";
import { REFERRAL_CODE_QUERY_PARAM, getAppBaseUrl, isHomeSite } from "lib/legacy";
import useRouteQuery from "lib/useRouteQuery";

import EventToastContainer from "components/EventToast/EventToastContainer";
import useEventToast from "components/EventToast/useEventToast";
import { Header } from "components/Header/Header";
import { RedirectPopupModal } from "components/ModalViews/RedirectModal";
import { NotifyModal } from "components/NotifyModal/NotifyModal";
import { SettingsModal } from "components/SettingsModal/SettingsModal";
import { SubaccountModal } from "components/Synthetics/SubaccountModal/SubaccountModal";

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
  const { disconnect } = useDisconnect();
  const isHome = isHomeSite();
  const location = useLocation();
  const history = useHistory();
  const { chainId } = useChainId();
  useErrorReporting(chainId);

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

  const showRedirectModal = useCallback((to: string) => {
    setRedirectModalVisible(true);
    setSelectedToPage(to);
  }, []);

  useRealChainIdWarning();

  return (
    <>
      <div className="App">
        <div className="App-content">
          <Header
            disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
            openSettings={openSettings}
            showRedirectModal={showRedirectModal}
          />
          {isHome && <HomeRoutes showRedirectModal={showRedirectModal} />}
          {!isHome && <MainRoutes openSettings={openSettings} />}
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
