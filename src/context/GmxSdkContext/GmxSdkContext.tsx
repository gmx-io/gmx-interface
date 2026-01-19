import { createContext, PropsWithChildren, useContext, useMemo, useRef } from "react";

import { GmxApiSdk } from "sdk/client/v2";
import { ContractsChainId } from "sdk/configs/chains";

type GmxSdkContextType = {
  getSdk: (chainId: ContractsChainId) => GmxApiSdk;
};

const context = createContext<GmxSdkContextType | null>(null);

export function GmxSdkProvider({ children }: PropsWithChildren) {
  const sdkCache = useRef<Map<ContractsChainId, GmxApiSdk>>(new Map());

  const value = useMemo(
    (): GmxSdkContextType => ({
      getSdk: (chainId: ContractsChainId) => {
        let sdk = sdkCache.current.get(chainId);

        if (!sdk) {
          sdk = new GmxApiSdk({ chainId });
          sdkCache.current.set(chainId, sdk);
        }

        return sdk;
      },
    }),
    []
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useGmxSdk(chainId: ContractsChainId): GmxApiSdk {
  const ctx = useContext(context);

  if (!ctx) {
    throw new Error("useGmxSdk must be used within GmxSdkProvider");
  }

  return ctx.getSdk(chainId);
}
