import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useAccount } from "wagmi";

import {
  NOTIFICATION_CLICK_MESSAGE_TYPE,
  NOTIFICATION_ROUTE_SEARCH_PARAM,
  NOTIFICATION_TYPE_SEARCH_PARAM,
  NOTIFICATION_WARM_TAP_SEARCH_PARAM,
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

/** What the tap event reports; absent once it is sent, or for a URL that only the app wrote. */
type TapTracking = { notificationType: string | undefined; isColdStart: boolean };

function sendTapEvent(tracking: TapTracking | undefined) {
  if (tracking) {
    sendNotificationTapEvent(tracking.notificationType, tracking.isColdStart);
  }
}

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
  const [tap, setTap] = useState<NotificationTap & { isSwitching?: boolean; tracking?: TapTracking }>();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== NOTIFICATION_CLICK_MESSAGE_TYPE || typeof event.data.route !== "string") {
        return;
      }

      const tracking: TapTracking = {
        notificationType: typeof event.data.notificationType === "string" ? event.data.notificationType : undefined,
        isColdStart: false,
      };
      const nextTap = parseNotificationRoute(event.data.route);
      if (nextTap) {
        setTap({ ...nextTap, tracking });
      } else {
        sendTapEvent(tracking);
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
    const tracking: TapTracking | undefined = searchParams.has(NOTIFICATION_TYPE_SEARCH_PARAM)
      ? {
          notificationType: searchParams.get(NOTIFICATION_TYPE_SEARCH_PARAM) ?? undefined,
          isColdStart: !searchParams.has(NOTIFICATION_WARM_TAP_SEARCH_PARAM),
        }
      : undefined;
    searchParams.delete(NOTIFICATION_ROUTE_SEARCH_PARAM);
    searchParams.delete(NOTIFICATION_TYPE_SEARCH_PARAM);
    searchParams.delete(NOTIFICATION_WARM_TAP_SEARCH_PARAM);
    history.replace({ pathname: history.location.pathname, search: searchParams.toString() });

    const nextTap = parseNotificationRoute(routeParam);
    if (nextTap) {
      setTap({ ...nextTap, tracking });
    } else {
      sendTapEvent(tracking);
    }
  }, [routeParam, history]);

  useEffect(() => {
    if (!tap || isWalletInitializing) {
      return;
    }

    if (tap.chainId === undefined || tap.chainId === networkId) {
      sendTapEvent(tap.tracking);
      setTap(undefined);
      history.push(tap.path);
      return;
    }

    if (tap.isSwitching) {
      return;
    }

    const { chainId, tracking } = tap;
    setTap({ ...tap, isSwitching: true, tracking: undefined });

    // A GMX Account trades on its settlement chain whatever chain the wallet is on, so it needs no wallet prompt.
    if (srcChainId !== undefined && isSettlementChain(chainId)) {
      sendTapEvent(tracking);
      setSettlementChainId(chainId);
      return;
    }

    if (isConnected) {
      sendTapEvent(tracking);
    } else {
      // Without a wallet the switch reloads the app, so the tap waits in the URL. The router must not see it before
      // the reload, or this hook would take the tap a second time. The reload would drop an event sent now, so the
      // reloaded app sends it.
      const searchParams = new URLSearchParams({ [NOTIFICATION_ROUTE_SEARCH_PARAM]: tap.route });
      if (tracking) {
        searchParams.set(NOTIFICATION_TYPE_SEARCH_PARAM, tracking.notificationType ?? "");
        if (!tracking.isColdStart) {
          searchParams.set(NOTIFICATION_WARM_TAP_SEARCH_PARAM, "1");
        }
      }
      window.history.replaceState(window.history.state, "", `/trade?${searchParams}`);
      // The reload takes the tap from the URL. Kept here, it would also open on the page that is about to reload.
      setTap(undefined);
    }

    switchNetwork(chainId, isConnected).catch((error) => {
      setTap(undefined);

      if (error?.message === SMART_WALLET_CHAIN_UNAVAILABLE_ERROR) {
        helperToast.error(getSmartWalletChainUnavailableToastContent(chainId));
      }
    });
  }, [tap, networkId, srcChainId, isConnected, isWalletInitializing, history, setSettlementChainId]);
}
