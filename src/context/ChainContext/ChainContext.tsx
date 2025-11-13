import { createContext, PropsWithChildren, useContext, useMemo } from "react";

import { isDevelopment } from "config/env";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useChainIdImpl } from "lib/chains/useChainIdImpl";
import { ARBITRUM, ARBITRUM_SEPOLIA, ContractsChainId, SourceChainId } from "sdk/configs/chains";

export type ChainContext = {
  chainId: ContractsChainId;
  /**
   * Guaranteed to be related to the settlement chain in `chainId`
   */
  srcChainId: SourceChainId | undefined;
  isConnectedToChainId: boolean | undefined;
};

let initialChainId: ContractsChainId;
if (isDevelopment()) {
  initialChainId = ARBITRUM_SEPOLIA;
} else {
  initialChainId = ARBITRUM;
}
const realChainId = window.ethereum?.chainId ? parseInt(window.ethereum?.chainId) : initialChainId;

export const context = createContext<ChainContext>({
  chainId: initialChainId,
  srcChainId: isSourceChain(realChainId) ? realChainId : undefined,
  isConnectedToChainId: false,
});

export function ChainContextProvider({ children }: PropsWithChildren) {
  const [gmxAccountSettlementChainId] = useGmxAccountSettlementChainId();

  const { chainId, srcChainId, isConnectedToChainId } = useChainIdImpl(gmxAccountSettlementChainId);

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
