import { plural, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getExplorerUrl } from "config/chains";
import { getToken } from "config/tokens";
import { ClaimCollateralAction, ClaimType } from "domain/synthetics/claimHistory";
import { MarketsData, getMarketName } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { formatTokenAmount } from "lib/numbers";
import { useMemo } from "react";

type Props = {
  claimAction: ClaimCollateralAction;
  marketsData: MarketsData;
  tokensData: TokensData;
};

export function ClaimHistoryRow(p: Props) {
  const { chainId } = useChainId();
  const { claimAction, marketsData, tokensData } = p;

  const marketsCount = claimAction.claimItems.length;

  const eventTitle = {
    [ClaimType.ClaimFunding]: t`Claim Funding Fees`,
    [ClaimType.ClaimPriceImpact]: t`Claim Price Impact`,
  }[claimAction.eventName];

  const tokensMsg = useMemo(() => {
    const amountByToken = claimAction.claimItems.reduce((acc, { market, longTokenAmount, shortTokenAmount }) => {
      if (longTokenAmount.gt(0)) {
        acc[market.longTokenAddress] = BigNumber.from(acc[market.longTokenAddress] || 0);
        acc[market.longTokenAddress] = acc[market.longTokenAddress].add(longTokenAmount);
      }
      if (shortTokenAmount.gt(0)) {
        acc[market.shortTokenAddress] = BigNumber.from(acc[market.shortTokenAddress] || 0);
        acc[market.shortTokenAddress] = acc[market.shortTokenAddress].add(shortTokenAmount);
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
              {claimAction.claimItems.map(({ market, longTokenAmount, shortTokenAmount }, index) => {
                const marketName = getMarketName(market);
                const longToken = getToken(chainId, market.longTokenAddress);
                const shortToken = getToken(chainId, market.shortTokenAddress);

                return (
                  <>
                    <StatsTooltipRow
                      className="ClaimHistoryRow-tooltip-row"
                      key={market.marketTokenAddress}
                      label={marketName}
                      showDollar={false}
                      value={
                        <>
                          {longTokenAmount.gt(0) && (
                            <div>{formatTokenAmount(longTokenAmount, longToken.decimals, longToken.symbol)}</div>
                          )}

                          {shortTokenAmount.gt(0) && (
                            <div>{formatTokenAmount(shortTokenAmount, shortToken.decimals, shortToken.symbol)}</div>
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
