import { PropsWithChildren, useEffect } from "react";

import { DEFAULT_SETTLEMENT_CHAIN_ID_MAP } from "config/multichain";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { useChainId } from "lib/chains";
import { AVALANCHE } from "sdk/configs/chains";

import { DEFAULT_SETTLEMENT_CHAIN_ID } from "./GmxAccountContext";
import { useGmxAccountSettlementChainId } from "./hooks";

export function AvalancheFallbackProvider({ children }: PropsWithChildren) {
  const { srcChainId } = useChainId();
  const { emptyGmxAccounts } = useEmptyGmxAccounts([AVALANCHE]);
  const isAvalancheEmpty = emptyGmxAccounts?.[AVALANCHE] === true;
  const [settlementChainId, setSettlementChainId] = useGmxAccountSettlementChainId();

  useEffect(() => {
    if (settlementChainId === AVALANCHE && isAvalancheEmpty && srcChainId !== undefined) {
      const fallbackSettlementChainId = DEFAULT_SETTLEMENT_CHAIN_ID_MAP[srcChainId] ?? DEFAULT_SETTLEMENT_CHAIN_ID;
      if (fallbackSettlementChainId !== settlementChainId) {
        setSettlementChainId(fallbackSettlementChainId);
      }
    }
  }, [settlementChainId, isAvalancheEmpty, srcChainId, setSettlementChainId]);

  return children;
}
