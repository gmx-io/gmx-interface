import { t } from "@lingui/macro";
import { useMemo } from "react";

import { getChainName, GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "config/chains";
import { MultichainMarketTokenBalances } from "domain/multichain/types";
import { useSortedTokenBalances } from "domain/multichain/useSortedTokenBalances";
import { formatBalanceAmount, formatUsd } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

type Props = {
  multichainBalances: MultichainMarketTokenBalances | undefined;
  symbol: string;
  decimals: number | undefined;
};

export function useHasMultichainBreakdown(multichainBalances: MultichainMarketTokenBalances | undefined): boolean {
  const sorted = useSortedTokenBalances({ multichainBalances });
  return useMemo(() => sorted.filter((d) => d.balanceUsd > 0n).length > 1, [sorted]);
}

export function MultichainBalanceTooltip({ multichainBalances, symbol, decimals }: Props) {
  const sortedTokenBalancesDataArray = useSortedTokenBalances({
    multichainBalances,
  });

  const tooltipContent = useMemo(() => {
    if (sortedTokenBalancesDataArray.length === 0 || decimals === undefined) {
      return null;
    }

    const visibleRows = sortedTokenBalancesDataArray.filter((d) => d.balanceUsd !== undefined && d.balanceUsd !== 0n);

    if (visibleRows.length <= 1) {
      return null;
    }

    return (
      <>
        {visibleRows.map((tokenBalancesData) => {
          const label =
            tokenBalancesData.chainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID
              ? t`GMX Account balance`
              : t({
                  message: `${getChainName(tokenBalancesData.chainId)} balance`,
                  comment: "chainname balance",
                });

          const formattedToken = formatBalanceAmount(tokenBalancesData.balance, decimals, symbol);

          return (
            <StatsTooltipRow
              key={tokenBalancesData.chainId}
              label={label}
              value={
                <span>
                  <span className="text-typography-primary numbers">{formatUsd(tokenBalancesData.balanceUsd)}</span>{" "}
                  <span className="text-typography-secondary numbers">({formattedToken})</span>
                </span>
              }
              showDollar={false}
            />
          );
        })}
      </>
    );
  }, [sortedTokenBalancesDataArray, symbol, decimals]);

  return tooltipContent;
}
