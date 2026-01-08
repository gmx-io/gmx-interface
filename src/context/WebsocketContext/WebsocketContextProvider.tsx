import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import { isDevelopment } from "config/env";
import { useChainId } from "lib/chains";
import { metrics, WsProviderConnected, WsProviderDisconnected, WsProviderHealthCheckFailed } from "lib/metrics";
import { closeWsConnection, getWsProvider, isProviderInClosedState, isWebsocketProvider } from "lib/rpc";
import { useHasLostFocus } from "lib/useHasPageLostFocus";

const WS_HEALTH_CHECK_INTERVAL = 1000 * 30;
const WS_RECONNECT_INTERVAL = 1000 * 5;

export type WebsocketContextType = {
  wsProvider: WebSocketProvider | JsonRpcProvider | undefined;
};

export const WsContext = createContext({} as WebsocketContextType);

export function useWebsocketProvider() {
  return useContext(WsContext) as WebsocketContextType;
}

export function WebsocketContextProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const { chainId } = useChainId();
  const [wsProvider, setWsProvider] = useState<WebSocketProvider | JsonRpcProvider>();

  const { hasPageLostFocus, hasV2LostFocus } = useHasLostFocus();
  const initializedTime = useRef<number>();
  const healthCheckTimerId = useRef<any>();
  const lostFocusRef = useRef({ hasV2LostFocus });

  lostFocusRef.current.hasV2LostFocus = hasV2LostFocus;

  useEffect(
    function updateProviderEffect() {
      if (!isConnected || hasPageLostFocus) {
        return;
      }

      const newProvider = getWsProvider(chainId);
      setWsProvider(newProvider);

      if (newProvider) {
        initializedTime.current = Date.now();
        // eslint-disable-next-line no-console
        console.log(`ws provider for chain ${chainId} initialized at ${initializedTime.current}`);
        metrics.pushEvent<WsProviderConnected>({
          event: "wsProvider.connected",
          isError: false,
          data: {},
        });
      }

      return function cleanup() {
        initializedTime.current = undefined;
        clearTimeout(healthCheckTimerId.current);

        if (isWebsocketProvider(newProvider)) {
          closeWsConnection(newProvider);
        }

        // eslint-disable-next-line no-console
        console.log(`ws provider for chain ${chainId} disconnected at ${Date.now()}`);
        metrics.pushEvent<WsProviderDisconnected>({
          event: "wsProvider.disconnected",
          isError: false,
          data: {},
        });
      };
    },
    [isConnected, chainId, hasPageLostFocus]
  );

  useEffect(
    function healthCheckEffect() {
      if (!isConnected || hasPageLostFocus || !isWebsocketProvider(wsProvider)) {
        return;
      }

      async function nextHealthCheck() {
        if (!isWebsocketProvider(wsProvider)) {
          return;
        }

        // wait ws provider to be connected and avoid too often reconnects
        const isReconnectingIntervalPassed =
          initializedTime.current && Date.now() - initializedTime.current > WS_RECONNECT_INTERVAL;

        if (isDevelopment() && isReconnectingIntervalPassed) {
          // eslint-disable-next-line no-console
          console.log(`ws provider health check, state: ${wsProvider.websocket.readyState}`);
        }

        if (isProviderInClosedState(wsProvider) && isReconnectingIntervalPassed) {
          closeWsConnection(wsProvider);
          const nextProvider = getWsProvider(chainId);
          setWsProvider(nextProvider);
          initializedTime.current = Date.now();
          // eslint-disable-next-line no-console
          console.log("ws provider health check failed, reconnecting", initializedTime.current);
          metrics.pushEvent<WsProviderHealthCheckFailed>({
            event: "wsProvider.healthCheckFailed",
            isError: false,
            data: {},
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
    [isConnected, chainId, hasPageLostFocus, wsProvider]
  );

  const state: WebsocketContextType = useMemo(() => {
    return {
      wsProvider,
    };
  }, [wsProvider]);

  return <WsContext.Provider value={state}>{children}</WsContext.Provider>;
}
