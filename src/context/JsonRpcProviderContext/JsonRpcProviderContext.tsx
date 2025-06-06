// TODO: use this sometime in the future

import { JsonRpcProvider } from "ethers";
import mapValues from "lodash/mapValues";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLatest } from "react-use";

import { RPC_PROVIDERS, SUPPORTED_CHAIN_IDS } from "config/chains";
import { SOURCE_CHAINS } from "domain/multichain/config";
import { EMPTY_OBJECT } from "lib/objects";
import { getCurrentRpcUrls, RPC_TRACKER_UPDATE_EVENT } from "lib/rpc/bestRpcTracker";
import { UiSupportedChain } from "sdk/configs/chains";

export type JsonRpcProviderContext = {
  providers: Partial<Record<number, JsonRpcProvider>>;
};

export const context = createContext<JsonRpcProviderContext>({
  providers: EMPTY_OBJECT,
});

export function JsonRpcProviderContext({ children }: PropsWithChildren) {
  const [providers, setProviders] =
    useState<Partial<Record<UiSupportedChain, { provider: JsonRpcProvider; url: string }>>>(EMPTY_OBJECT);

  const handleRpcUpdate = useCallback(() => {
    for (const listenedChainId of SUPPORTED_CHAIN_IDS) {
      const { primary } = getCurrentRpcUrls(listenedChainId);

      if (providers[listenedChainId]?.url === primary) continue;

      const provider = new JsonRpcProvider(primary, listenedChainId);
      provider._start();
      provider._waitUntilReady().then(() => {
        setProviders((prev) => ({ ...prev, [listenedChainId]: { provider, url: primary } }));
      });
    }

    for (const listenedSourceChainId of SOURCE_CHAINS) {
      const url = RPC_PROVIDERS[listenedSourceChainId]?.[0];
      if (url) {
        if (providers[listenedSourceChainId]?.url !== url) {
          const provider = new JsonRpcProvider(url, listenedSourceChainId);
          provider._start();
          provider._waitUntilReady().then(() => {
            setProviders((prev) => ({ ...prev, [listenedSourceChainId]: { provider, url } }));
          });
        }
      }
    }
  }, [providers]);

  const latestHandleRpcUpdate = useLatest(handleRpcUpdate);

  useEffect(() => {
    const handler = latestHandleRpcUpdate.current;
    handler();
    window.addEventListener(RPC_TRACKER_UPDATE_EVENT, handler);

    return () => {
      window.removeEventListener(RPC_TRACKER_UPDATE_EVENT, handler);
    };
  }, [latestHandleRpcUpdate]);

  const value = useMemo(() => {
    return {
      providers: mapValues(providers, (item) => item?.provider),
    };
  }, [providers]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useJsonRpcProvider(chainId: UiSupportedChain): { provider: JsonRpcProvider | undefined } {
  const { providers } = useContext(context);
  return { provider: providers[chainId]?.provider };
}
