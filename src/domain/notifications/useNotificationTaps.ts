import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useAccount } from "wagmi";

import {
  NOTIFICATION_CLICK_MESSAGE_TYPE,
  NOTIFICATION_ROUTE_SEARCH_PARAM,
  NOTIFICATION_TYPE_SEARCH_PARAM,
} from "config/notifications";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { SMART_WALLET_CHAIN_UNAVAILABLE_ERROR } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import useSearchParams from "lib/useSearchParams";
import { switchNetwork } from "lib/wallets";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import { isSettlementChain } from "sdk/configs/multichain";

import { getSmartWalletChainUnavailableToastContent } from "components/Errors/errorToasts";

import { type NotificationTap, parseNotificationRoute } from "./notificationRoute";
import { sendNotificationTapEvent } from "./notificationsAnalytics";

/**
 * Opens the trade page a tapped notification names. The service worker sends the route to an open app, or opens a new
 * one with the route in its URL. The app gets onto the notification's chain first; a refused switch changes nothing.
 */
export function useNotificationTaps() {
  const history = useHistory();
  const { networkId, srcChainId } = useChainId();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const { isConnected } = useAccount();
  const isWalletInitializing = useIsWalletInitializing();
  const { [NOTIFICATION_ROUTE_SEARCH_PARAM]: routeParam } = useSearchParams<{ notification?: string }>();
  const [tap, setTap] = useState<NotificationTap & { isSwitching?: boolean }>();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== NOTIFICATION_CLICK_MESSAGE_TYPE || typeof event.data.route !== "string") {
        return;
      }

      sendNotificationTapEvent(event.data.notificationType, false);

      const nextTap = parseNotificationRoute(event.data.route);
      if (nextTap) {
        setTap(nextTap);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!routeParam) {
      return;
    }

    const searchParams = new URLSearchParams(history.location.search);
    if (searchParams.has(NOTIFICATION_TYPE_SEARCH_PARAM)) {
      sendNotificationTapEvent(searchParams.get(NOTIFICATION_TYPE_SEARCH_PARAM), true);
    }
    searchParams.delete(NOTIFICATION_ROUTE_SEARCH_PARAM);
    searchParams.delete(NOTIFICATION_TYPE_SEARCH_PARAM);
    history.replace({ pathname: history.location.pathname, search: searchParams.toString() });

    const nextTap = parseNotificationRoute(routeParam);
    if (nextTap) {
      setTap(nextTap);
    }
  }, [routeParam, history]);

  useEffect(() => {
    if (!tap || isWalletInitializing) {
      return;
    }

    if (tap.chainId === undefined || tap.chainId === networkId) {
      setTap(undefined);
      history.push(tap.path);
      return;
    }

    if (tap.isSwitching) {
      return;
    }

    const { chainId } = tap;
    setTap({ ...tap, isSwitching: true });

    // A GMX Account trades on its settlement chain whatever chain the wallet is on, so it needs no wallet prompt.
    if (srcChainId !== undefined && isSettlementChain(chainId)) {
      setSettlementChainId(chainId);
      return;
    }

    if (!isConnected) {
      // Without a wallet the switch reloads the app, so the tap waits in the URL. The router must not see it before
      // the reload, or this hook would take the tap a second time. With no type in the URL, the reload is no new tap.
      const searchParams = new URLSearchParams({ [NOTIFICATION_ROUTE_SEARCH_PARAM]: tap.route });
      window.history.replaceState(window.history.state, "", `/trade?${searchParams}`);
    }

    switchNetwork(chainId, isConnected).catch((error) => {
      setTap(undefined);

      if (error?.message === SMART_WALLET_CHAIN_UNAVAILABLE_ERROR) {
        helperToast.error(getSmartWalletChainUnavailableToastContent(chainId));
      }
    });
  }, [tap, networkId, srcChainId, isConnected, isWalletInitializing, history, setSettlementChainId]);
}
