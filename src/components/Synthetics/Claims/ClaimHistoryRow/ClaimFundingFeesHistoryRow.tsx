import { plural, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { formatTradeActionTimestamp } from "components/Synthetics/TradeHistory/TradeHistoryRow/utils/shared";
import Tooltip from "components/Tooltip/Tooltip";
import { getExplorerUrl } from "config/chains";
import { ClaimFundingFeeAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { formatTokenAmount } from "lib/numbers";
import { Fragment, useMemo } from "react";

import { ReactComponent as NewLink20ReactComponent } from "img/ic_new_link_20.svg";

export type ClaimFundingFeesHistoryRowProps = {
  claimAction: ClaimFundingFeeAction;
};

export const claimFundingFeeEventTitles: Record<ClaimFundingFeeAction["eventName"], string> = {
  [ClaimType.SettleFundingFeeCancelled]: t`Failed Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeCreated]: t`Request Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeExecuted]: t`Settled Funding Fees`,
};

export function ClaimFundingFeesHistoryRow({ claimAction }: ClaimFundingFeesHistoryRowProps) {
  const { chainId } = useChainId();

  const eventTitle = claimFundingFeeEventTitles[claimAction.eventName];

  const marketContent = useMemo(() => {
    if (claimAction.eventName === ClaimType.SettleFundingFeeCreated) {
      return (
        <Tooltip
          handle={plural(claimAction.markets.length, { one: "# Position", other: "# Positions" })}
          renderContent={() => {
            return claimAction.markets.map((market, index) => {
              const indexName = getMarketIndexName(market);
              const poolName = getMarketPoolName(market);
              const isLong = claimAction.isLongOrders[index];
              return (
                <div className="text-white ClaimHistoryRow-tooltip-row items-top" key={`${market.name}/${isLong}`}>
                  {isLong ? t`Long` : t`Short`} {indexName} <span className="subtext lh-1">[{poolName}]</span>
                </div>
              );
            });
          }}
        />
      );
    }

    if (claimAction.eventName === ClaimType.SettleFundingFeeCancelled) {
      const indexName = getMarketIndexName(claimAction.markets[0]);
      const poolName = getMarketPoolName(claimAction.markets[0]);
      return (
        <span>
          {claimAction.isLongOrders[0] ? "Long" : "Short"} {indexName} <span className="subtext">[{poolName}]</span>
          &nbsp;Position
        </span>
      );
    }

    if (claimAction.eventName === ClaimType.SettleFundingFeeExecuted) {
      const indexName = getMarketIndexName(claimAction.markets[0]);
      const poolName = getMarketPoolName(claimAction.markets[0]);

      const positionName = (
        <span className="items-top">
          {claimAction.isLongOrders[0] ? t`Long` : t`Short`} {indexName}
        </span>
      );
      const isLong = claimAction.isLongOrders[0];

      return (
        <Tooltip
          handle={positionName}
          renderContent={() => (
            <div className="items-center">
              <span>{isLong ? t`Long` : t`Short`}</span>&nbsp;<span>{indexName && indexName}</span>
              <span className="subtext lh-1">{poolName && `[${poolName}]`}</span>
            </div>
          )}
        />
      );
    }

    return null;
  }, [claimAction.eventName, claimAction.isLongOrders, claimAction.markets]);

  const sizeContent = useMemo(() => {
    if (claimAction.eventName === ClaimType.SettleFundingFeeCreated) {
      return "-";
    }

    const amounts = claimAction.markets.map((market, index) => {
      const token = claimAction.tokens[index];
      const amount = claimAction.amounts[index];

      return (
        <Fragment key={`${token.address}/${market.marketTokenAddress}`}>
          {index !== 0 && <br />}
          {formatTokenAmount(amount, token.decimals, token.symbol)}
        </Fragment>
      );
    });

    return (
      <Tooltip
        renderContent={() => <>{amounts}</>}
        handle={plural(claimAction.markets.length, { one: "# Size", other: "# Sizes" })}
      />
    );
  }, [claimAction]);

  return (
    <tr>
      <td>
        {eventTitle}
        <ExternalLink
          className="ClaimHistoryRow-external-link ml-xs"
          href={`${getExplorerUrl(chainId)}tx/${claimAction.transactionHash}`}
        >
          <NewLink20ReactComponent />
        </ExternalLink>
        <br />
        <span className="ClaimHistoryRow-time muted">{formatTradeActionTimestamp(claimAction.timestamp)}</span>
      </td>
      <td>{marketContent}</td>
      <td>{sizeContent}</td>
    </tr>
  );
}
