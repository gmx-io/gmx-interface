import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { ClaimFundingFeeAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { formatTokenAmountWithUsd } from "lib/numbers";
import { getFormattedTotalClaimAction } from "./getFormattedTotalClaimAction";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import {
  formatTradeActionTimestamp,
  formatTradeActionTimestampISO,
} from "components/Synthetics/TradeHistory/TradeHistoryRow/utils/shared";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ReactComponent as NewLink20ReactComponent } from "img/ic_new_link_20.svg";

export type ClaimFundingFeesHistoryRowProps = {
  claimAction: ClaimFundingFeeAction;
};

export const claimFundingFeeEventTitles: Record<ClaimFundingFeeAction["eventName"], string> = {
  [ClaimType.SettleFundingFeeCancelled]: t`Failed Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeCreated]: t`Request Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeExecuted]: t`Settled Funding Fees`,
};

const NBSP = String.fromCharCode(160);

export function ClaimFundingFeesHistoryRow({ claimAction }: ClaimFundingFeesHistoryRowProps) {
  const { chainId } = useChainId();

  const eventTitle = claimFundingFeeEventTitles[claimAction.eventName];

  const formattedTimestamp = useMemo(() => formatTradeActionTimestamp(claimAction.timestamp), [claimAction.timestamp]);

  const renderIsoTimestamp = useCallback(() => {
    return formatTradeActionTimestampISO(claimAction.timestamp);
  }, [claimAction.timestamp]);

  const marketContent = useMemo(() => {
    if (claimAction.eventName === ClaimType.SettleFundingFeeCreated) {
      const formattedMarketNames = claimAction.markets
        .map((market, index) => {
          const isLong = claimAction.isLongOrders[index];

          let res = "";
          if (index !== 0) {
            res += ", ";
          }
          res += `${isLong ? t`Long` : t`Short`}${NBSP}${getMarketIndexName(market)}`;

          return res;
        })
        .join("");

      return (
        <Tooltip
          handle={formattedMarketNames}
          renderContent={() => {
            return claimAction.markets.map((market, index) => {
              const indexName = getMarketIndexName(market);
              const poolName = getMarketPoolName(market);
              const isLong = claimAction.isLongOrders[index];
              return (
                <div
                  className="text-white ClaimHistoryRow-tooltip-row inline-flex items-start"
                  key={`${market.name}/${isLong}`}
                >
                  {isLong ? t`Long` : t`Short`} {indexName} <span className="subtext leading-1">[{poolName}]</span>
                </div>
              );
            });
          }}
        />
      );
    }

    if (claimAction.eventName === ClaimType.SettleFundingFeeCancelled) {
      const indexName = getMarketIndexName(claimAction.markets[0]);
      return (
        <TooltipWithPortal
          handle={
            <span className="flex items-start">
              {claimAction.isLongOrders[0] ? t`Long` : t`Short`} {indexName}
            </span>
          }
          renderContent={() => {
            return claimAction.markets.map((market, index) => {
              const indexName = getMarketIndexName(market);
              const poolName = getMarketPoolName(market);
              const isLong = claimAction.isLongOrders[index];
              return (
                <div
                  className="text-white ClaimHistoryRow-tooltip-row inline-flex items-start"
                  key={`${market.name}/${isLong}`}
                >
                  {isLong ? t`Long` : t`Short`} {indexName} <span className="subtext leading-1">[{poolName}]</span>
                </div>
              );
            });
          }}
        />
      );
    }

    if (claimAction.eventName === ClaimType.SettleFundingFeeExecuted) {
      const indexName = getMarketIndexName(claimAction.markets[0]);

      const positionName = (
        <span className="flex items-start">
          {claimAction.isLongOrders[0] ? t`Long` : t`Short`} {indexName}
        </span>
      );

      return positionName;
    }

    return null;
  }, [claimAction.eventName, claimAction.isLongOrders, claimAction.markets]);

  const sizeContent = useMemo(() => {
    if (
      claimAction.eventName === ClaimType.SettleFundingFeeCreated ||
      claimAction.eventName === ClaimType.SettleFundingFeeCancelled
    ) {
      return "-";
    }

    const amounts = claimAction.claimItems.map(
      ({ marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd }) => {
        const indexName = getMarketIndexName(market);
        const poolName = getMarketPoolName(market);

        return (
          <StatsTooltipRow
            className="ClaimHistoryRow-tooltip-row"
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
        );
      }
    );

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
            className="ClaimHistoryRow-external-link ml-8"
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
      <td>{marketContent}</td>
      <td className="ClaimHistoryRow-size">{sizeContent}</td>
    </tr>
  );
}
