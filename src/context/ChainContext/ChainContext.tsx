import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from "react";

import {
  type NetworkId,
  DEFAULT_SETTLEMENT_CHAIN_ID,
  DEFAULT_SETTLEMENT_CHAIN_ID_MAP,
  SOLANA_NETWORK_ID,
} from "config/chains";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useChainIdSearchParam } from "domain/multichain/useChainIdSearchParam";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { useChainIdImpl } from "lib/chains/useChainIdImpl";
import { AVALANCHE, ContractsChainId, SourceChainId } from "sdk/configs/chains";

type ChainContext = {
  chainId: ContractsChainId;
  networkId: NetworkId;
  /**
   * Guaranteed to be related to the settlement chain in `chainId`
   */
  srcChainId: SourceChainId | undefined;
  isConnectedToChainId: boolean | undefined;
};

const initialChainId: ContractsChainId = DEFAULT_SETTLEMENT_CHAIN_ID;
const realChainId = window.ethereum?.chainId ? parseInt(window.ethereum?.chainId) : initialChainId;

const context = createContext<ChainContext>({
  chainId: initialChainId,
  networkId: initialChainId,
  srcChainId: isSourceChain(realChainId, initialChainId) ? realChainId : undefined,
  isConnectedToChainId: false,
});

export function ChainContextProvider({ children }: PropsWithChildren) {
  const [gmxAccountSettlementChainId, setGmxAccountSettlementChainId] = useGmxAccountSettlementChainId();

  const { chainId, srcChainId, isConnectedToChainId, isSolanaNetworkSelected } =
    useChainIdImpl(gmxAccountSettlementChainId);
  const networkId: NetworkId = isSolanaNetworkSelected ? SOLANA_NETWORK_ID : chainId;

  useChainIdSearchParam({
    settlementChainId: gmxAccountSettlementChainId,
    setSettlementChainId: setGmxAccountSettlementChainId,
  });

  const { emptyGmxAccounts } = useEmptyGmxAccounts(isSolanaNetworkSelected ? undefined : [AVALANCHE]);
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
      networkId,
      srcChainId,
      isConnectedToChainId,
    }),
    [chainId, networkId, srcChainId, isConnectedToChainId]
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export const useChainContext = () => useContext(context);
