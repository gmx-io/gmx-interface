import { plural, t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { Fragment, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { getToken } from "config/tokens";
import { ClaimCollateralAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { formatTokenAmount } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import { formatTradeActionTimestamp } from "../../TradeHistory/TradeHistoryRow/utils/shared";

import { ReactComponent as NewLink20ReactComponent } from "img/ic_new_link_20.svg";

export type ClaimCollateralHistoryRowProps = {
  claimAction: ClaimCollateralAction;
};

export const claimCollateralEventTitles: Record<ClaimCollateralAction["eventName"], string> = {
  [ClaimType.ClaimFunding]: t`Claim Funding Fees`,
  [ClaimType.ClaimPriceImpact]: t`Claim Price Impact Rebates`,
};

export function ClaimCollateralHistoryRow(p: ClaimCollateralHistoryRowProps) {
  const { chainId } = useChainId();
  const { claimAction } = p;

  const marketsCount = claimAction.claimItems.length;

  const eventTitle = claimCollateralEventTitles[claimAction.eventName];

  const [tokens, amountByToken] = useMemo(() => {
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

    const tokens = Object.entries(amountByToken)
      .map(([tokenAddress, amount]) => {
        const token = getToken(chainId, tokenAddress);

        return formatTokenAmount(amount, token.decimals, token.symbol);
      })
      .filter(Boolean) as string[];

    return [tokens, amountByToken];
  }, [chainId, claimAction.claimItems]);

  const timestamp = formatTradeActionTimestamp(claimAction.timestamp);

  return (
    <tr>
      <td>
        <div className="flex">
          <div className="ClaimHistoryRow-action-handle">{eventTitle}</div>
          <ExternalLink
            className="ClaimHistoryRow-external-link ml-xs"
            href={`${getExplorerUrl(chainId)}tx/${claimAction.transactionHash}`}
          >
            <NewLink20ReactComponent />
          </ExternalLink>
        </div>
        <span className="ClaimHistoryRow-time muted">{timestamp}</span>
      </td>
      <td>
        <Tooltip
          renderContent={() => <MarketTooltip claimAction={claimAction} />}
          handle={plural(marketsCount, { one: "# Market", other: "# Markets", many: "# Markets" })}
        />
      </td>
      <td className="ClaimHistoryRow-price">
        <Tooltip
          renderContent={() => <SizeTooltip tokens={tokens} />}
          handle={plural(Object.keys(amountByToken).length, {
            one: "# Size",
            other: "# Sizes",
          })}
        />
      </td>
    </tr>
  );
}

function MarketTooltip({ claimAction }: { claimAction: ClaimCollateralAction }) {
  return (
    <>
      {claimAction.claimItems.map(({ marketInfo: market, longTokenAmount, shortTokenAmount }) => {
        const indexName = getMarketIndexName(market);
        const poolName = getMarketPoolName(market);
        return (
          <Fragment key={market.indexTokenAddress}>
            <StatsTooltipRow
              className="ClaimHistoryRow-tooltip-row"
              key={market.marketTokenAddress}
              label={
                <div className="items-top text-white">
                  <span>{indexName}</span>
                  <span className="subtext lh-1">[{poolName}]</span>
                </div>
              }
              showDollar={false}
              value={
                <>
                  {longTokenAmount.gt(0) && (
                    <div>{formatTokenAmount(longTokenAmount, market.longToken.decimals, market.longToken.symbol)}</div>
                  )}

                  {shortTokenAmount.gt(0) && (
                    <div>
                      {formatTokenAmount(shortTokenAmount, market.shortToken.decimals, market.shortToken.symbol)}
                    </div>
                  )}
                </>
              }
            />
          </Fragment>
        );
      })}
    </>
  );
}

const SizeTooltip = ({ tokens }: { tokens: string[] }) => {
  return (
    <>
      {tokens.map((token, index) => (
        <div key={index}>{token}</div>
      ))}
    </>
  );
};
