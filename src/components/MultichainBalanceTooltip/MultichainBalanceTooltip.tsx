import { t } from "@lingui/macro";
import { useMemo } from "react";

import { getChainName } from "config/chains";
import { MultichainMarketTokenBalances } from "domain/multichain/types";
import { useSortedTokenBalances } from "domain/multichain/useSortedTokenBalances";
import { formatBalanceAmount, formatUsd } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

type Props = {
  multichainBalances: MultichainMarketTokenBalances | undefined;
  symbol: string;
  decimals: number | undefined;
};

export function MultichainBalanceTooltip({ multichainBalances, symbol, decimals }: Props) {
  const sortedTokenBalancesDataArray = useSortedTokenBalances({
    multichainBalances,
  });

  const tooltipContent = useMemo(() => {
    if (sortedTokenBalancesDataArray.length === 0 || decimals === undefined) {
      return null;
    }

    return (
      <>
        {sortedTokenBalancesDataArray.map((tokenBalancesData) => {
          const label =
            tokenBalancesData.chainId === 0
              ? t`GMX account Balance`
              : t({
                  message: `${getChainName(tokenBalancesData.chainId)} Balance`,
                  comment: "chainname balance",
                });

          let balanceUsd: bigint | undefined = tokenBalancesData.balanceUsd;

          if (balanceUsd === undefined || balanceUsd === 0n) {
            return null;
          }

          const formattedToken = formatBalanceAmount(tokenBalancesData.balance, decimals, symbol);

          return (
            <StatsTooltipRow
              key={tokenBalancesData.chainId}
              label={label}
              value={
                <span>
                  <span className="numbers">{formatUsd(balanceUsd)}</span>{" "}
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
