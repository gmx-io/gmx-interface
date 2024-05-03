import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { isDevelopment } from "config/env";
import { WS_LOST_FOCUS_TIMEOUT } from "config/ui";
import { useChainId } from "lib/chains";
import { closeWsConnection, getWsProvider, isProviderInClosedState, isWebsocketProvider } from "lib/rpc";
import { useHasLostFocus } from "lib/useHasPageLostFocus";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  const hasLostFocus = useHasLostFocus({ timeout: WS_LOST_FOCUS_TIMEOUT, checkIsTabFocused: true, debugId: "Tab" });
  const initializedTime = useRef<number>();
  const healthCheckTimerId = useRef<any>();

  useEffect(
    function updateProviderEffect() {
      if (!active || hasLostFocus) {
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
    [active, chainId, hasLostFocus]
  );

  useEffect(
    function healthCheckEff() {
      if (!active || hasLostFocus || !isWebsocketProvider(wsProvider)) {
        return;
      }

      function nextHealthCheck() {
        if (!isWebsocketProvider(wsProvider)) {
          return;
        }

        // wait ws provider to be connected and avoid too often reconnects
        const isReconnectingIntervalPassed =
          initializedTime.current && Date.now() - initializedTime.current > WS_RECONNECT_INTERVAL;

        if (isDevelopment() && isReconnectingIntervalPassed) {
          // eslint-disable-next-line no-console
          console.log(
            `ws provider health check, state: ${wsProvider.websocket.readyState}, subs: ${
              // FIXME
              // Object.keys(wsProvider._subs).length
              "FIXME"
            }`
          );
        }

        if (isProviderInClosedState(wsProvider) && isReconnectingIntervalPassed) {
          closeWsConnection(wsProvider);
          const nextProvider = getWsProvider(chainId);
          setWsProvider(nextProvider);
          initializedTime.current = Date.now();
          // eslint-disable-next-line no-console
          console.log("ws provider health check failed, reconnecting", initializedTime.current);
        } else {
          healthCheckTimerId.current = setTimeout(nextHealthCheck, WS_HEALTH_CHECK_INTERVAL);
        }
      }

      nextHealthCheck();

      return function cleanup() {
        clearTimeout(healthCheckTimerId.current);
      };
    },
    [active, chainId, hasLostFocus, wsProvider]
  );

  const state: WebsocketContextType = useMemo(() => {
    return {
      wsProvider,
    };
  }, [wsProvider]);

  return <WsContext.Provider value={state}>{children}</WsContext.Provider>;
}
