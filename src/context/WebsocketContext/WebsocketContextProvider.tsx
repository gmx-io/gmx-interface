import { isDevelopment } from "config/env";
import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { useChainId } from "lib/chains";
import { closeWsConnection, getWsProvider, isProviderInClosedState, isWebsocketProvider } from "lib/rpc";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getTotalSubscribersEventsCount } from "./subscribeToEvents";

const WS_HEALTH_CHECK_INTERVAL = 1000 * 30;
const WS_RECONNECT_INTERVAL = 1000 * 5;

export type WebsocketContextType = {
  wsProvider?: WebSocketProvider | JsonRpcProvider;
};

export const WsContext = createContext({} as WebsocketContextType);

export function useWebsocketProvider() {
  return useContext(WsContext) as WebsocketContextType;
}

export function WebsocketContextProvider({ children }: { children: ReactNode }) {
  const { active } = useWallet();
  const { chainId } = useChainId();
  const [wsProvider, setWsProvider] = useState<WebSocketProvider | JsonRpcProvider>();
  const { hasPageLostFocus, hasV1LostFocus, hasV2LostFocus } = useHasLostFocus();
  const initializedTime = useRef<number>();
  const healthCheckTimerId = useRef<any>();
  const lostFocusRef = useRef({ hasV1LostFocus, hasV2LostFocus });

  lostFocusRef.current.hasV1LostFocus = hasV1LostFocus;
  lostFocusRef.current.hasV2LostFocus = hasV2LostFocus;

  useEffect(
    function updateProviderEffect() {
      if (!active || hasPageLostFocus) {
        return;
      }

      const newProvider = getWsProvider(chainId);
      setWsProvider(newProvider);

      if (newProvider) {
        initializedTime.current = Date.now();
        // eslint-disable-next-line no-console
        console.log(`ws provider for chain ${chainId} initialized at ${initializedTime.current}`);
      }

      return function cleanup() {
        initializedTime.current = undefined;
        clearTimeout(healthCheckTimerId.current);

        if (isWebsocketProvider(newProvider)) {
          closeWsConnection(newProvider);
        }

        // eslint-disable-next-line no-console
        console.log(`ws provider for chain ${chainId} disconnected at ${Date.now()}`);
      };
    },
    [active, chainId, hasPageLostFocus]
  );

  useEffect(
    function healthCheckEff() {
      if (!active || hasPageLostFocus || !isWebsocketProvider(wsProvider)) {
        return;
      }

      async function nextHealthCheck() {
        if (!isWebsocketProvider(wsProvider)) {
          return;
        }

        // wait ws provider to be connected and avoid too often reconnects
        const isReconnectingIntervalPassed =
          initializedTime.current && Date.now() - initializedTime.current > WS_RECONNECT_INTERVAL;
        const listenerCount = await wsProvider.listenerCount();
        const requiredListenerCount = getTotalSubscribersEventsCount(chainId, wsProvider, {
          v1: !lostFocusRef.current.hasV1LostFocus,
          v2: !lostFocusRef.current.hasV2LostFocus,
        });

        if (isDevelopment() && isReconnectingIntervalPassed) {
          // eslint-disable-next-line no-console
          console.log(
            `ws provider health check, state: ${wsProvider.websocket.readyState}, subs: ${listenerCount} / ${requiredListenerCount}`
          );
        }

        if (
          (isProviderInClosedState(wsProvider) && isReconnectingIntervalPassed) ||
          (listenerCount < requiredListenerCount && isReconnectingIntervalPassed)
        ) {
          closeWsConnection(wsProvider);
          const nextProvider = getWsProvider(chainId);
          setWsProvider(nextProvider);
          initializedTime.current = Date.now();
          // eslint-disable-next-line no-console
          console.log("ws provider health check failed, reconnecting", initializedTime.current, {
            requiredListenerCount,
            listenerCount,
          });
        } else {
          healthCheckTimerId.current = setTimeout(nextHealthCheck, WS_HEALTH_CHECK_INTERVAL);
        }
      }

      nextHealthCheck();

      return function cleanup() {
        clearTimeout(healthCheckTimerId.current);
      };
    },
    [active, chainId, hasPageLostFocus, wsProvider]
  );

  const state: WebsocketContextType = useMemo(() => {
    return {
      wsProvider,
    };
  }, [wsProvider]);

  return <WsContext.Provider value={state}>{children}</WsContext.Provider>;
}
