import { JsonRpcProvider, WebSocketProvider } from "ethers";
import uniq from "lodash/uniq";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import { SourceChainId } from "config/chains";
import { isDevelopment } from "config/env";
import { isSourceChain } from "domain/multichain/config";
import { useChainId } from "lib/chains";
import {
  metrics,
  WsProviderConnected,
  WsProviderDisconnected,
  WsProviderHealthCheckFailed,
  WsSourceChainProviderConnected,
  WsSourceChainProviderDisconnected,
} from "lib/metrics";
import { EMPTY_OBJECT } from "lib/objects";
import { closeWsConnection, getWsProvider, isProviderInClosedState, isWebsocketProvider } from "lib/rpc";
import { useHasLostFocus } from "lib/useHasPageLostFocus";

import { getTotalSubscribersEventsCount } from "./subscribeToEvents";

const WS_HEALTH_CHECK_INTERVAL = 1000 * 30;
const WS_RECONNECT_INTERVAL = 1000 * 5;
const WS_ADDITIONAL_SOURCE_CHAIN_DISCONNECT_DELAY = 1 * 60 * 1000;

const DEBUG_WEBSOCKETS_LOGGING = false;

const debugLog = (...args: any[]) => {
  if (DEBUG_WEBSOCKETS_LOGGING) {
    // eslint-disable-next-line no-console
    console.log("[ws]", ...args);
  }
};

export type WebsocketContextType = {
  wsProvider: WebSocketProvider | JsonRpcProvider | undefined;
  wsSourceChainProviders: Partial<Record<SourceChainId, WebSocketProvider | JsonRpcProvider>>;

  setAdditionalSourceChain: (chainId: SourceChainId, name: string) => void;
  removeAdditionalSourceChain: (chainId: SourceChainId, name: string) => void;
};

export const WsContext = createContext({} as WebsocketContextType);

export function useWebsocketProvider() {
  return useContext(WsContext) as WebsocketContextType;
}

export function WebsocketContextProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const { chainId, srcChainId } = useChainId();
  const [wsProvider, setWsProvider] = useState<WebSocketProvider | JsonRpcProvider>();
  const [additionalSourceChains, setAdditionalSourceChains] =
    useState<Partial<Record<SourceChainId, string[]>>>(EMPTY_OBJECT);
  const additionalSourceChainsCleanupTimersRef = useRef<Partial<Record<SourceChainId, number>>>({});
  const [wsSourceChainProviders, setWsSourceChainProviders] =
    useState<Partial<Record<SourceChainId, WebSocketProvider | JsonRpcProvider>>>(EMPTY_OBJECT);

  const { hasPageLostFocus, hasV1LostFocus, hasV2LostFocus } = useHasLostFocus();
  const initializedTime = useRef<number>();
  const healthCheckTimerId = useRef<any>();
  const lostFocusRef = useRef({ hasV1LostFocus, hasV2LostFocus });

  lostFocusRef.current.hasV1LostFocus = hasV1LostFocus;
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
    [isConnected, chainId, hasPageLostFocus, srcChainId]
  );

  useEffect(
    function updateSourceChainProviderEffect() {
      if (!isConnected || hasPageLostFocus || srcChainId === undefined) {
        return;
      }

      if (additionalSourceChainsCleanupTimersRef.current[srcChainId]) {
        window.clearTimeout(additionalSourceChainsCleanupTimersRef.current[srcChainId]);
        delete additionalSourceChainsCleanupTimersRef.current[srcChainId];
        debugLog("cancelling cleanup timer for source chain", srcChainId);
      }

      let newSourceChainProvider = getWsProvider(srcChainId);

      if (newSourceChainProvider) {
        debugLog("source chain provider connected", srcChainId);

        metrics.pushEvent<WsSourceChainProviderConnected>({
          event: "wsSourceChainProvider.connected",
          isError: false,
          data: {
            chainId: srcChainId,
          },
        });
        setWsSourceChainProviders((prev) => {
          const newProviders = { ...prev };
          newProviders[srcChainId] = newSourceChainProvider;
          return newProviders;
        });
      }

      return function cleanup() {
        const timer = window.setTimeout(() => {
          if (isWebsocketProvider(newSourceChainProvider)) {
            debugLog("source chain provider disconnected", srcChainId);
            closeWsConnection(newSourceChainProvider);
          }
          debugLog("source chain provider cleanup", srcChainId);
          setWsSourceChainProviders((prev) => {
            const newProviders = { ...prev };
            delete newProviders[srcChainId];
            return newProviders;
          });
          metrics.pushEvent<WsSourceChainProviderDisconnected>({
            event: "wsSourceChainProvider.disconnected",
            isError: false,
            data: {
              chainId: srcChainId,
            },
          });
        }, WS_ADDITIONAL_SOURCE_CHAIN_DISCONNECT_DELAY);

        // eslint-disable-next-line react-hooks/exhaustive-deps
        additionalSourceChainsCleanupTimersRef.current[srcChainId] = timer;
        debugLog("scheduling cleanup timer for source chain", srcChainId);
      };
    },
    [hasPageLostFocus, isConnected, srcChainId]
  );

  useEffect(
    function updateAdditionalSourceChainEffect() {
      if (!isConnected || hasPageLostFocus) {
        return;
      }

      const distinctChains = Object.keys(additionalSourceChains)
        .map((chainId) => parseInt(chainId) as SourceChainId)
        .filter((chainId) => chainId !== srcChainId && isSourceChain(chainId));

      if (distinctChains.length === 0) {
        return;
      }

      const wsProviders: Partial<Record<SourceChainId, WebSocketProvider | JsonRpcProvider>> = {};

      for (const additionalSourceChain of distinctChains) {
        if (additionalSourceChainsCleanupTimersRef.current[additionalSourceChain]) {
          window.clearTimeout(additionalSourceChainsCleanupTimersRef.current[additionalSourceChain]);
          delete additionalSourceChainsCleanupTimersRef.current[additionalSourceChain];
          debugLog("cancelling cleanup timer for additional source chain", additionalSourceChain);
        }

        const newSourceChainProvider = getWsProvider(additionalSourceChain);

        if (newSourceChainProvider) {
          wsProviders[additionalSourceChain] = newSourceChainProvider;
        }
      }

      if (Object.keys(wsProviders).length !== 0) {
        setWsSourceChainProviders((prev) => {
          return { ...prev, ...wsProviders };
        });
      }

      return function cleanup() {
        for (const additionalSourceChain in wsProviders) {
          debugLog("scheduling cleanup timer for additional source chain", additionalSourceChain);

          const timer = window.setTimeout(() => {
            debugLog("disconnecting from additional source chain", additionalSourceChain);
            if (isWebsocketProvider(wsProviders[additionalSourceChain])) {
              closeWsConnection(wsProviders[additionalSourceChain]);
            }
            setWsSourceChainProviders((prev) => {
              const newProviders = { ...prev };
              delete newProviders[additionalSourceChain];
              return newProviders;
            });
            // eslint-disable-next-line react-hooks/exhaustive-deps
            delete additionalSourceChainsCleanupTimersRef.current[additionalSourceChain];
          }, WS_ADDITIONAL_SOURCE_CHAIN_DISCONNECT_DELAY);

          // eslint-disable-next-line react-hooks/exhaustive-deps
          additionalSourceChainsCleanupTimersRef.current[additionalSourceChain] = timer;
        }
      };
    },
    [additionalSourceChains, hasPageLostFocus, isConnected, srcChainId]
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
          metrics.pushEvent<WsProviderHealthCheckFailed>({
            event: "wsProvider.healthCheckFailed",
            isError: false,
            data: {
              requiredListenerCount,
              listenerCount,
            },
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

  const setAdditionalSourceChain = useCallback((chainId: SourceChainId, name: string) => {
    setAdditionalSourceChains((prev) => {
      const newAdditionalSourceChains = structuredClone(prev);
      newAdditionalSourceChains[chainId] = uniq((newAdditionalSourceChains[chainId] || []).concat(name));
      return newAdditionalSourceChains;
    });
  }, []);

  const removeAdditionalSourceChain = useCallback((chainId: SourceChainId, name: string) => {
    setAdditionalSourceChains((prev) => {
      const newAdditionalSourceChains = structuredClone(prev);
      newAdditionalSourceChains[chainId] = newAdditionalSourceChains[chainId]?.filter((c) => c !== name) || [];
      return newAdditionalSourceChains;
    });
  }, []);

  const state: WebsocketContextType = useMemo(() => {
    return {
      wsProvider,
      wsSourceChainProviders,
      setAdditionalSourceChain,
      removeAdditionalSourceChain,
    };
  }, [removeAdditionalSourceChain, setAdditionalSourceChain, wsProvider, wsSourceChainProviders]);

  return <WsContext.Provider value={state}>{children}</WsContext.Provider>;
}

export function useWsAdditionalSourceChains(chainId: SourceChainId | undefined, name: string) {
  const { setAdditionalSourceChain, removeAdditionalSourceChain } = useWebsocketProvider();

  useEffect(() => {
    if (!chainId) {
      return;
    }

    debugLog("setting up additional source chain", chainId);

    setAdditionalSourceChain(chainId, name);

    return () => {
      debugLog("tearing down additional source chain", chainId);

      removeAdditionalSourceChain(chainId, name);
    };
  }, [chainId, name, setAdditionalSourceChain, removeAdditionalSourceChain]);
}
