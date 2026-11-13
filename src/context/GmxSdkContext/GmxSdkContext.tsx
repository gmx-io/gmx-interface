import { createContext, PropsWithChildren, useContext, useMemo, useRef } from "react";

import { getUiApiCacheKey, getUiApiOverrideUrl, isUiApiSupported } from "config/api";
import { GmxApiSdk } from "sdk/clients/v2";
import { NetworkId } from "sdk/configs/chains";

type GmxSdkContextType = {
  getSdk: (networkId: NetworkId) => GmxApiSdk | undefined;
};

const context = createContext<GmxSdkContextType | null>(null);

export function GmxSdkProvider({ children }: PropsWithChildren) {
  const sdkCache = useRef<Map<string, GmxApiSdk>>(new Map());

  const value = useMemo(
    (): GmxSdkContextType => ({
      getSdk: (networkId: NetworkId) => {
        if (!isUiApiSupported(networkId)) {
          return undefined;
        }

        const cacheKey = getUiApiCacheKey(networkId);
        let sdk = sdkCache.current.get(cacheKey);

        if (!sdk) {
          const apiUrl = getUiApiOverrideUrl(networkId);
          sdk = new GmxApiSdk({ chainId: networkId, ...(apiUrl && { apiUrl }) });
          sdkCache.current.set(cacheKey, sdk);
        }

        return sdk;
      },
    }),
    []
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useGmxSdk(networkId: NetworkId): GmxApiSdk | undefined {
  const ctx = useContext(context);

  if (!ctx) {
    throw new Error("useGmxSdk must be used within GmxSdkProvider");
  }

  return ctx.getSdk(networkId);
}

// the price and candle streams are optional, so their hooks also run in trees without the provider, such as component tests
export function useOptionalGmxSdk(networkId: NetworkId): GmxApiSdk | undefined {
  return useContext(context)?.getSdk(networkId);
}
