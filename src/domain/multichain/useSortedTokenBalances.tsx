import { useMemo } from "react";

import type { AnyChainId, GmxAccountPseudoChainId } from "config/chains";
import type { MultichainMarketTokenBalances } from "domain/multichain/types";
import { EMPTY_ARRAY } from "lib/objects";

// TODO MLTCH this could be a selector
export function useSortedTokenBalances({
  multichainBalances,
}: {
  multichainBalances: MultichainMarketTokenBalances | undefined;
}): { chainId: AnyChainId | GmxAccountPseudoChainId; balance: bigint; balanceUsd: bigint }[] {
  return useMemo(() => {
    if (!multichainBalances?.balances) {
      return EMPTY_ARRAY;
    }
    return Object.entries(multichainBalances.balances)
      .filter(([, data]) => data !== undefined && data.balance > 0n)
      .sort((a, b) => {
        const aBalance = a[1]?.balance ?? 0n;
        const aBalanceUsd = a[1]?.balanceUsd ?? 0n;
        const bBalance = b[1]?.balance ?? 0n;
        const bBalanceUsd = b[1]?.balanceUsd ?? 0n;

        if (aBalanceUsd === 0n && bBalanceUsd === 0n && (aBalance > 0n || bBalance > 0n)) {
          return aBalance > bBalance ? -1 : 1;
        }

        return aBalanceUsd > bBalanceUsd ? -1 : 1;
      })
      .map(([chainId, data]) => ({
        chainId: parseInt(chainId) as AnyChainId | GmxAccountPseudoChainId,
        balance: data!.balance,
        balanceUsd: data!.balanceUsd,
      }));
  }, [multichainBalances?.balances]);
}
