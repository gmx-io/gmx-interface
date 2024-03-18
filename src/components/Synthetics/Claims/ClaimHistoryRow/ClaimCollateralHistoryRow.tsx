import { t } from "@lingui/macro";
import { Fragment, useCallback, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { ClaimCollateralAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatTokenAmountWithUsd } from "lib/numbers";
import { getFormattedTotalClaimAction } from "./getFormattedTotalClaimAction";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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

  const eventTitle = claimCollateralEventTitles[claimAction.eventName];

  const marketNamesJoined = useMemo(() => {
    return claimAction.claimItems
      .map(({ marketInfo }) => {
        return getMarketIndexName(marketInfo);
      })
      .join(", ");
  }, [claimAction.claimItems]);

  const timestamp = formatTradeActionTimestamp(claimAction.timestamp);

  const renderMarketTooltipContent = useCallback(() => <MarketTooltip claimAction={claimAction} />, [claimAction]);

  const sizeContent = useMemo(() => {
    const amounts = claimAction.tokens.map((token, index) => {
      const amount = claimAction.amounts[index];
      const price = claimAction.tokenPrices[index];
      const amountUsd = amount.mul(price);

      return (
        <Fragment key={token.address}>
          {index !== 0 && <br />}
          {formatTokenAmountWithUsd(amount, amountUsd, token.symbol, token.decimals)}
        </Fragment>
      );
    });

    const formattedTotalUsd = getFormattedTotalClaimAction(claimAction);

    return (
      <TooltipWithPortal
        portalClassName="ClaimHistoryRow-size-tooltip-portal"
        renderContent={() => <>{amounts}</>}
        handle={formattedTotalUsd}
      />
    );
  }, [claimAction]);

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
        <TooltipWithPortal renderContent={renderMarketTooltipContent} handle={marketNamesJoined} />
      </td>
      <td className="ClaimHistoryRow-size">{sizeContent}</td>
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
