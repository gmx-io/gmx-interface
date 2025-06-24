import { createContext, PropsWithChildren, useContext, useMemo } from "react";

import { isDevelopment } from "config/env";
import { useChainIdImpl } from "lib/chains";
import { ARBITRUM, ARBITRUM_SEPOLIA, ContractsChainId, SourceChainId } from "sdk/configs/chains";

export type ChainContext = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  isConnectedToChainId: boolean | undefined;
};

let initialChainId: ContractsChainId;
if (isDevelopment()) {
  initialChainId = ARBITRUM_SEPOLIA;
} else {
  initialChainId = ARBITRUM;
}

export const context = createContext<ChainContext>({
  chainId: initialChainId,
  srcChainId: undefined,
  isConnectedToChainId: false,
});

export function ChainContextProvider({ children }: PropsWithChildren) {
  const { chainId, srcChainId, isConnectedToChainId } = useChainIdImpl();

  const value = useMemo(
    () => ({
      chainId,
      srcChainId,
      isConnectedToChainId,
    }),
    [chainId, srcChainId, isConnectedToChainId]
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export const useChainContext = () => useContext(context);
