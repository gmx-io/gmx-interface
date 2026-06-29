import { createContext, PropsWithChildren, useContext, useMemo, useRef } from "react";

import { getUiApiCacheKey, getUiApiOverrideUrl, isUiApiSupported } from "config/api";
import { GmxApiSdk } from "sdk/clients/v2";
import { ContractsChainId } from "sdk/configs/chains";

type GmxSdkContextType = {
  getSdk: (chainId: ContractsChainId) => GmxApiSdk | undefined;
};

const context = createContext<GmxSdkContextType | null>(null);

export function GmxSdkProvider({ children }: PropsWithChildren) {
  const sdkCache = useRef<Map<string, GmxApiSdk>>(new Map());

  const value = useMemo(
    (): GmxSdkContextType => ({
      getSdk: (chainId: ContractsChainId) => {
        if (!isUiApiSupported(chainId)) {
          return undefined;
        }

        const cacheKey = getUiApiCacheKey(chainId);
        let sdk = sdkCache.current.get(cacheKey);

        if (!sdk) {
          const apiUrl = getUiApiOverrideUrl(chainId);
          sdk = new GmxApiSdk({ chainId, ...(apiUrl && { apiUrl }) });
          sdkCache.current.set(cacheKey, sdk);
        }

        return sdk;
      },
    }),
    []
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useGmxSdk(chainId: ContractsChainId): GmxApiSdk | undefined {
  const ctx = useContext(context);

  if (!ctx) {
    throw new Error("useGmxSdk must be used within GmxSdkProvider");
  }

  return ctx.getSdk(chainId);
}
