import { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import React, { useCallback, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ClaimFundingFeeAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { formatTokenAmountWithUsd } from "lib/numbers";
import { getFormattedTotalClaimAction } from "./getFormattedTotalClaimAction";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
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

export const claimFundingFeeEventTitles: Record<ClaimFundingFeeAction["eventName"], MessageDescriptor> = {
  [ClaimType.SettleFundingFeeCancelled]: msg`Failed Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeCreated]: msg`Request Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeExecuted]: msg`Settled Funding Fees`,
};

export function ClaimFundingFeesHistoryRow({ claimAction }: ClaimFundingFeesHistoryRowProps) {
  const chainId = useSelector(selectChainId);
  const { _ } = useLingui();

  const eventTitleDescriptor = claimFundingFeeEventTitles[claimAction.eventName];

  const formattedTimestamp = useMemo(() => formatTradeActionTimestamp(claimAction.timestamp), [claimAction.timestamp]);

  const renderIsoTimestamp = useCallback(() => {
    return formatTradeActionTimestampISO(claimAction.timestamp);
  }, [claimAction.timestamp]);

  const marketContent = useMemo(() => {
    if (claimAction.eventName === ClaimType.SettleFundingFeeCreated) {
      const formattedMarketNames = (
        <div className="leading-2">
          {claimAction.markets.map((market, index) => (
            <React.Fragment key={index}>
              {index !== 0 && ", "}
              <MarketWithDirectionLabel
                bordered
                indexName={getMarketIndexName(market)}
                tokenSymbol={market.indexToken.symbol}
                isLong={claimAction.isLongOrders[index]}
              />
            </React.Fragment>
          ))}
        </div>
      );

      return (
        <Tooltip
          disableHandleStyle
          handleClassName="cursor-help"
          handle={formattedMarketNames}
          renderContent={() => {
            return claimAction.markets.map((market, index) => {
              const indexName = getMarketIndexName(market);
              const poolName = getMarketPoolName(market);
              const isLong = claimAction.isLongOrders[index];
              return (
                <div
                  className="ClaimHistoryRow-tooltip-row inline-flex items-start text-white"
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
          disableHandleStyle
          handleClassName="cursor-help *:cursor-auto"
          handle={
            <MarketWithDirectionLabel
              bordered
              indexName={indexName}
              tokenSymbol={claimAction.markets[0].indexToken.symbol}
              isLong={claimAction.isLongOrders[0]}
            />
          }
          renderContent={() => {
            return claimAction.markets.map((market, index) => {
              const indexName = getMarketIndexName(market);
              const poolName = getMarketPoolName(market);
              const isLong = claimAction.isLongOrders[index];
              return (
                <div
                  className="ClaimHistoryRow-tooltip-row inline-flex items-start text-white"
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
        <MarketWithDirectionLabel
          indexName={indexName}
          tokenSymbol={claimAction.markets[0].indexToken.symbol}
          isLong={claimAction.isLongOrders[0]}
        />
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
                {longTokenAmount > 0 && (
                  <div>
                    {formatTokenAmountWithUsd(
                      longTokenAmount,
                      longTokenAmountUsd,
                      market.longToken.symbol,
                      market.longToken.decimals
                    )}
                  </div>
                )}

                {shortTokenAmount > 0 && (
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
          <div className="ClaimHistoryRow-action-handle">{_(eventTitleDescriptor)}</div>
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
      <td>{marketContent}</td>
      <td className="ClaimHistoryRow-size">{sizeContent}</td>
    </tr>
  );
}
