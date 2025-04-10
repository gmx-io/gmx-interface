import { MessageDescriptor } from "@lingui/core";
import { msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import React, { useCallback, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ClaimFundingFeeAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import {
  formatTradeActionTimestamp,
  formatTradeActionTimestampISO,
} from "components/Synthetics/TradeHistory/TradeHistoryRow/utils/shared";
import { TableTd, TableTr } from "components/Table/Table";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import NewLink20ReactComponent from "img/ic_new_link_20.svg?react";

import { getFormattedTotalClaimAction } from "./getFormattedTotalClaimAction";

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

    const amounts = (
      <div className="flex flex-col gap-16">
        {claimAction.claimItems.map(
          ({ marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd }) => {
            const indexName = getMarketIndexName(market);
            const poolName = getMarketPoolName(market);

            return (
              <div key={market.indexTokenAddress} className="flex flex-col gap-4">
                <div className="flex items-baseline text-white">
                  <span>{indexName}</span>
                  <span className="subtext">[{poolName}]</span>
                </div>
                <div>
                  {longTokenAmount > 0 && (
                    <div>
                      <AmountWithUsdBalance
                        amount={longTokenAmount}
                        decimals={market.longToken.decimals}
                        symbol={market.longToken.symbol}
                        usd={longTokenAmountUsd}
                      />
                    </div>
                  )}
                  {shortTokenAmount > 0 && (
                    <div>
                      <AmountWithUsdBalance
                        amount={shortTokenAmount}
                        decimals={market.shortToken.decimals}
                        symbol={market.shortToken.symbol}
                        usd={shortTokenAmountUsd}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    );

    const formattedTotalUsd = getFormattedTotalClaimAction(claimAction);

    return (
      <TooltipWithPortal
        tooltipClassName="ClaimHistoryRow-size-tooltip-portal"
        content={amounts}
        handle={formattedTotalUsd}
      />
    );
  }, [claimAction]);

  return (
    <TableTr>
      <TableTd>
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
          tooltipClassName="ClaimHistoryRow-tooltip-portal"
          renderContent={renderIsoTimestamp}
        />
      </TableTd>
      <TableTd>{marketContent}</TableTd>
      <TableTd>{sizeContent}</TableTd>
    </TableTr>
  );
}
