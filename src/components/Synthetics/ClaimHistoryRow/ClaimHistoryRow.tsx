import { plural, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getExplorerUrl } from "config/chains";
import { getToken } from "config/tokens";
import { ClaimCollateralAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { formatTokenAmount } from "lib/numbers";
import { useMemo } from "react";

type Props = {
  claimAction: ClaimCollateralAction;
};

export function ClaimHistoryRow(p: Props) {
  const { chainId } = useChainId();
  const { claimAction } = p;

  const marketsCount = claimAction.claimItems.length;

  const eventTitle = {
    [ClaimType.ClaimFunding]: t`Claim Funding Fees`,
    [ClaimType.ClaimPriceImpact]: t`Claim Price Impact`,
  }[claimAction.eventName];

  const tokensMsg = useMemo(() => {
    const amountByToken = claimAction.claimItems.reduce((acc, { marketInfo, longTokenAmount, shortTokenAmount }) => {
      if (longTokenAmount.gt(0)) {
        acc[marketInfo.longTokenAddress] = acc[marketInfo.longTokenAddress] || BigNumber.from(0);
        acc[marketInfo.longTokenAddress] = acc[marketInfo.longTokenAddress].add(longTokenAmount);
      }
      if (shortTokenAmount.gt(0)) {
        acc[marketInfo.shortTokenAddress] = acc[marketInfo.shortTokenAddress] || BigNumber.from(0);
        acc[marketInfo.shortTokenAddress] = acc[marketInfo.shortTokenAddress].add(shortTokenAmount);
      }

      return acc;
    }, {} as { [tokenAddress: string]: BigNumber });

    const tokensMsg = Object.entries(amountByToken)
      .map(([tokenAddress, amount]) => {
        const token = getToken(chainId, tokenAddress);

        return formatTokenAmount(amount, token.decimals, token.symbol);
      })
      .join(", ");

    return tokensMsg;
  }, [chainId, claimAction.claimItems]);

  return (
    <div className="TradeHistoryRow App-box App-box-border">
      <div className="muted TradeHistoryRow-time">{formatDateTime(claimAction.timestamp)}</div>
      <ExternalLink className="plain" href={`${getExplorerUrl(chainId)}tx/${claimAction.transactionHash}`}>
        {eventTitle}: {tokensMsg} from&nbsp;{" "}
        <Tooltip
          handle={plural(marketsCount, { one: "# Market", other: "# Markets" })}
          renderContent={() => (
            <>
              {claimAction.claimItems.map(({ marketInfo: market, longTokenAmount, shortTokenAmount }, index) => {
                const indexName = getMarketIndexName(market);
                const poolName = getMarketPoolName(market);
                return (
                  <>
                    <StatsTooltipRow
                      className="ClaimHistoryRow-tooltip-row"
                      key={market.marketTokenAddress}
                      label={
                        <div className="items-center">
                          <span>{indexName}</span>
                          <span className="subtext lh-1">[{poolName}]</span>
                        </div>
                      }
                      showDollar={false}
                      value={
                        <>
                          {longTokenAmount.gt(0) && (
                            <div>
                              {formatTokenAmount(longTokenAmount, market.longToken.decimals, market.longToken.symbol)}
                            </div>
                          )}

                          {shortTokenAmount.gt(0) && (
                            <div>
                              {formatTokenAmount(
                                shortTokenAmount,
                                market.shortToken.decimals,
                                market.shortToken.symbol
                              )}
                            </div>
                          )}
                        </>
                      }
                    />
                    {index < marketsCount - 1 && <br />}
                  </>
                );
              })}
            </>
          )}
        />
      </ExternalLink>
    </div>
  );
}
