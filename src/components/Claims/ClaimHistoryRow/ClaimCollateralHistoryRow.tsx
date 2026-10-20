import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import React, { useCallback, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ClaimCollateralAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { NumericValue } from "components/NumericValue/NumericValue";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipRow, TooltipText, TooltipTitle } from "components/Tooltip/TooltipBlocks";

import NewLink20ReactComponent from "img/ic_new_link_20.svg?react";

import { getFormattedTotalClaimAction } from "./getFormattedTotalClaimAction";
import {
  formatTradeActionTimestamp,
  formatTradeActionTimestampUTC,
} from "../../TradeHistory/TradeHistoryRow/utils/shared";

export type ClaimCollateralHistoryRowProps = {
  claimAction: ClaimCollateralAction;
};

export const claimCollateralEventTitles: Record<ClaimCollateralAction["eventName"], MessageDescriptor> = {
  [ClaimType.ClaimFunding]: msg`Claimed funding fees`,
  [ClaimType.ClaimPriceImpact]: msg`Claimed price impact rebates`,
};

export function ClaimCollateralHistoryRow(p: ClaimCollateralHistoryRowProps) {
  const { _ } = useLingui();
  const chainId = useSelector(selectChainId);
  const { claimAction } = p;

  const eventTitle = useMemo(() => _(claimCollateralEventTitles[claimAction.eventName]), [_, claimAction.eventName]);

  const marketNamesJoined = useMemo(() => {
    return (
      <div className="leading-2">
        {claimAction.claimItems.map(({ marketInfo }, index) => (
          <React.Fragment key={index}>
            {index !== 0 && ", "}
            <div className="inline-block whitespace-nowrap leading-base">
              <TokenIcon className="mr-5" symbol={marketInfo.indexToken.symbol} displaySize={20} />
              {getMarketIndexName(marketInfo)}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }, [claimAction.claimItems]);

  const formattedTimestamp = useMemo(() => formatTradeActionTimestamp(claimAction.timestamp), [claimAction.timestamp]);

  const renderIsoTimestamp = useCallback(() => {
    return <TooltipRow label="UTC" value={formatTradeActionTimestampUTC(claimAction.timestamp)} />;
  }, [claimAction.timestamp]);

  const sizeContent = useMemo(() => {
    const formattedTotalUsd = getFormattedTotalClaimAction(claimAction);

    return (
      <StandardTooltip
        content={<SizeTooltip claimAction={claimAction} />}
        handle={<NumericValue parts={formattedTotalUsd} />}
        handleClassName="numbers"
      />
    );
  }, [claimAction]);

  return (
    <TableTr>
      <TableTd>
        <div className="flex">
          <div className="ClaimHistoryRow-action-handle font-medium">{eventTitle}</div>
          <ExternalLink
            className="ClaimHistoryRow-external-link ml-5"
            href={`${getExplorerUrl(chainId)}tx/${claimAction.transactionHash}`}
          >
            <NewLink20ReactComponent />
          </ExternalLink>
        </div>
        <StandardTooltip
          handle={<span className="ClaimHistoryRow-time muted">{formattedTimestamp}</span>}
          renderContent={renderIsoTimestamp}
        />
      </TableTd>
      <TableTd>{marketNamesJoined}</TableTd>
      <TableTd>{sizeContent}</TableTd>
    </TableTr>
  );
}

function SizeTooltip({ claimAction }: { claimAction: ClaimCollateralAction }) {
  return (
    <TooltipContent>
      {claimAction.claimItems.map(
        ({ marketInfo: market, longTokenAmount, shortTokenAmount, longTokenAmountUsd, shortTokenAmountUsd }) => {
          const indexName = getMarketIndexName(market);
          const poolName = getMarketPoolName(market);
          return (
            <div key={market.indexTokenAddress} className="flex flex-col gap-2">
              <TooltipTitle>
                {indexName}
                <span className="subtext">[{poolName}]</span>
              </TooltipTitle>
              <TooltipText>
                {longTokenAmount > 0 && (
                  <div>
                    <AmountWithUsdBalance
                      amount={longTokenAmount}
                      decimals={market.longToken.decimals}
                      symbol={market.longToken.symbol}
                      usd={longTokenAmountUsd}
                      isStable={market.longToken.isStable}
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
                      isStable={market.shortToken.isStable}
                    />
                  </div>
                )}
              </TooltipText>
            </div>
          );
        }
      )}
    </TooltipContent>
  );
}
