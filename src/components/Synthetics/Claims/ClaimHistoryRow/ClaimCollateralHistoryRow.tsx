import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import React, { Fragment, useCallback, useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ClaimCollateralAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { formatTokenAmountWithUsd } from "lib/numbers";
import { getFormattedTotalClaimAction } from "./getFormattedTotalClaimAction";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import {
  formatTradeActionTimestamp,
  formatTradeActionTimestampISO,
} from "../../TradeHistory/TradeHistoryRow/utils/shared";

import { ReactComponent as NewLink20ReactComponent } from "img/ic_new_link_20.svg";

export type ClaimCollateralHistoryRowProps = {
  claimAction: ClaimCollateralAction;
};

export const claimCollateralEventTitles: Record<ClaimCollateralAction["eventName"], MessageDescriptor> = {
  [ClaimType.ClaimFunding]: msg`Claim Funding Fees`,
  [ClaimType.ClaimPriceImpact]: msg`Claim Price Impact Rebates`,
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
          handle={<span className="ClaimHistoryRow-time muted cursor-help">{formattedTimestamp}</span>}
          portalClassName="ClaimHistoryRow-tooltip-portal cursor-help *:cursor-auto"
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
            </Fragment>
          );
        }
      )}
    </>
  );
}
