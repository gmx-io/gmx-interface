import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from "react";

import { DEFAULT_SETTLEMENT_CHAIN_ID, DEFAULT_SETTLEMENT_CHAIN_ID_MAP } from "config/chains";
import { isDevelopment } from "config/env";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { useChainIdImpl } from "lib/chains/useChainIdImpl";
import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, ContractsChainId, SourceChainId } from "sdk/configs/chains";

type ChainContext = {
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

const context = createContext<ChainContext>({
  chainId: initialChainId,
  srcChainId: isSourceChain(realChainId, initialChainId) ? realChainId : undefined,
  isConnectedToChainId: false,
});

export function ChainContextProvider({ children }: PropsWithChildren) {
  const [gmxAccountSettlementChainId, setGmxAccountSettlementChainId] = useGmxAccountSettlementChainId();

  const { chainId, srcChainId, isConnectedToChainId } = useChainIdImpl(gmxAccountSettlementChainId);

  const { emptyGmxAccounts } = useEmptyGmxAccounts([AVALANCHE]);
  const isAvalancheEmpty = emptyGmxAccounts?.[AVALANCHE] === true;

  useEffect(() => {
    if (gmxAccountSettlementChainId === AVALANCHE && isAvalancheEmpty && srcChainId !== undefined) {
      const fallbackSettlementChainId = DEFAULT_SETTLEMENT_CHAIN_ID_MAP[srcChainId] ?? DEFAULT_SETTLEMENT_CHAIN_ID;
      if (fallbackSettlementChainId !== gmxAccountSettlementChainId) {
        setGmxAccountSettlementChainId(fallbackSettlementChainId);
      }
    }
  }, [gmxAccountSettlementChainId, isAvalancheEmpty, srcChainId, setGmxAccountSettlementChainId]);

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
