import { t } from "@lingui/macro";
import { Fragment, useCallback, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { ClaimCollateralAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { formatTokenAmountWithUsd } from "lib/numbers";
import { getFormattedTotalClaimAction } from "./getFormattedTotalClaimAction";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import {
  formatTradeActionTimestamp,
  formatTradeActionTimestampISO,
} from "../../TradeHistory/TradeHistoryRow/utils/shared";

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

  const formattedTimestamp = useMemo(() => formatTradeActionTimestamp(claimAction.timestamp), [claimAction.timestamp]);

  const renderIsoTimestamp = useCallback(() => {
    return formatTradeActionTimestampISO(claimAction.timestamp);
  }, [claimAction.timestamp]);

  const sizeContent = useMemo(() => {
    const formattedTotalUsd = getFormattedTotalClaimAction(claimAction);

    return (
      <TooltipWithPortal
        portalClassName="ClaimHistoryRow-size-tooltip-portal"
        renderContent={() => <SizeTooltip claimAction={claimAction} />}
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
            className="ClaimHistoryRow-external-link ml-5"
            href={`${getExplorerUrl(chainId)}tx/${claimAction.transactionHash}`}
          >
            <NewLink20ReactComponent />
          </ExternalLink>
        </div>
        <TooltipWithPortal
          disableHandleStyle
          handle={<span className="ClaimHistoryRow-time muted">{formattedTimestamp}</span>}
          portalClassName="ClaimHistoryRow-tooltip-portal"
          renderContent={renderIsoTimestamp}
        />
      </td>
      <td>{marketNamesJoined}</td>
      <td className="ClaimHistoryRow-size">{sizeContent}</td>
    </tr>
  );
}

function SizeTooltip({ claimAction }: { claimAction: ClaimCollateralAction }) {
  return (
    <>
      {claimAction.claimItems.map(
        ({ marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd }) => {
          const indexName = getMarketIndexName(market);
          const poolName = getMarketPoolName(market);
          return (
            <Fragment key={market.indexTokenAddress}>
              <StatsTooltipRow
                textClassName="whitespace-nowrap mb-5"
                key={market.marketTokenAddress}
                label={
                  <div className="flex items-start text-white">
                    <span>{indexName}</span>
                    <span className="subtext leading-1">[{poolName}]</span>
                  </div>
                }
                showDollar={false}
                value={
                  <>
                    {longTokenAmount.gt(0) && (
                      <div>
                        {formatTokenAmountWithUsd(
                          longTokenAmount,
                          longTokenAmountUsd,
                          market.longToken.symbol,
                          market.longToken.decimals
                        )}
                      </div>
                    )}

                    {shortTokenAmount.gt(0) && (
                      <div>
                        {formatTokenAmountWithUsd(
                          shortTokenAmount,
                          shortTokenAmountUsd,
                          market.shortToken.symbol,
                          market.shortToken.decimals
                        )}
                      </div>
                    )}
                  </>
                }
              />
            </Fragment>
          );
        }
      )}
    </>
  );
}
