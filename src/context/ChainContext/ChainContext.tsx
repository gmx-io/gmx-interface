import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from "react";

import { type AppNetworkId, DEFAULT_SETTLEMENT_CHAIN_ID, DEFAULT_SETTLEMENT_CHAIN_ID_MAP } from "config/chains";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { useChainIdImpl } from "lib/chains/useChainIdImpl";
import { AVALANCHE, ContractsChainId, SourceChainId } from "sdk/configs/chains";

type ChainContext = {
  chainId: ContractsChainId;
  /**
   * Guaranteed to be related to the settlement chain in `chainId`
   */
  srcChainId: SourceChainId | undefined;
  isConnectedToChainId: boolean | undefined;
  selectedNetworkId: AppNetworkId;
  isSolana: boolean;
};

const initialChainId: ContractsChainId = DEFAULT_SETTLEMENT_CHAIN_ID;
const realChainId = window.ethereum?.chainId ? parseInt(window.ethereum?.chainId) : initialChainId;
const initialSrcChainId = isSourceChain(realChainId, initialChainId) ? realChainId : undefined;

const context = createContext<ChainContext>({
  chainId: initialChainId,
  srcChainId: initialSrcChainId,
  isConnectedToChainId: false,
  selectedNetworkId: initialSrcChainId ?? initialChainId,
  isSolana: false,
});

export function ChainContextProvider({ children }: PropsWithChildren) {
  const [gmxAccountSettlementChainId, setGmxAccountSettlementChainId] = useGmxAccountSettlementChainId();

  const { chainId, srcChainId, isConnectedToChainId, selectedNetworkId, isSolana } =
    useChainIdImpl(gmxAccountSettlementChainId);

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
      selectedNetworkId,
      isSolana,
    }),
    [chainId, srcChainId, isConnectedToChainId, selectedNetworkId, isSolana]
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export const useChainContext = () => useContext(context);
