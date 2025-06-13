import { createContext, PropsWithChildren, useContext, useMemo } from "react";

import { isDevelopment } from "config/env";
import { isContractsChain, isSourceChain } from "domain/multichain/config";
import { useChainIdImpl } from "lib/chains";
import { getRealChainId } from "lib/chains/getRealChainId";
import { ARBITRUM, ARBITRUM_SEPOLIA, ContractsChainId, SourceChainId } from "sdk/configs/chains";

export type ChainContext = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  isConnectedToChainId: boolean | undefined;
};

const realChainId = getRealChainId();

let initialChainId: ContractsChainId;
if (realChainId !== undefined && isContractsChain(realChainId)) {
  initialChainId = realChainId;
} else if (isDevelopment()) {
  initialChainId = ARBITRUM_SEPOLIA;
} else {
  initialChainId = ARBITRUM;
}

const initialSrcChainId = realChainId !== undefined && isSourceChain(realChainId) ? realChainId : undefined;

export const context = createContext<ChainContext>({
  chainId: initialChainId,
  srcChainId: initialSrcChainId,
  isConnectedToChainId: realChainId === initialChainId,
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
