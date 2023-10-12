import { plural, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getExplorerUrl } from "config/chains";
import { getToken } from "config/tokens";
import { ClaimAction, ClaimCollateralAction, ClaimFundingFeeAction, ClaimType } from "domain/synthetics/claimHistory";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { formatTokenAmount } from "lib/numbers";
import { groupBy } from "lodash";
import { Fragment, useMemo } from "react";
import "./ClaimHistoryRow.scss";

type ClaimHistoryRowProps = {
  claimAction: ClaimAction;
};
type ClaimCollateralHistoryRowProps = {
  claimAction: ClaimCollateralAction;
};

type ClaimFundingFeesHistoryRowProps = {
  claimAction: ClaimFundingFeeAction;
};

const claimCollateralEventTitles: Record<ClaimCollateralAction["eventName"], string> = {
  [ClaimType.ClaimFunding]: t`Claim Funding Fees`,
  [ClaimType.ClaimPriceImpact]: t`Claim Price Impact`,
};

export function ClaimHistoryRow({ claimAction }: ClaimHistoryRowProps) {
  return claimAction.type === "collateral" ? (
    <ClaimCollateralHistoryRow claimAction={claimAction} />
  ) : (
    <ClaimFundingFeesHistoryRow claimAction={claimAction} />
  );
}

function ClaimCollateralHistoryRow(p: ClaimCollateralHistoryRowProps) {
  const { chainId } = useChainId();
  const { claimAction } = p;

  const marketsCount = claimAction.claimItems.length;

  const eventTitle = claimCollateralEventTitles[claimAction.eventName];

  const tokensMsg = useMemo(() => {
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
              {claimAction.claimItems.map(({ marketInfo: market, longTokenAmount, shortTokenAmount }, index) => {
                const indexName = getMarketIndexName(market);
                const poolName = getMarketPoolName(market);
                return (
                  <>
                    <StatsTooltipRow
                      className="ClaimHistoryRow-tooltip-row"
                      key={market.marketTokenAddress}
                      label={
                        <div className="items-center">
                          <span>{indexName}</span>
                          <span className="subtext lh-1">[{poolName}]</span>
                        </div>
                      }
                      showDollar={false}
                      value={
                        <>
                          {longTokenAmount.gt(0) && (
                            <div>
                              {formatTokenAmount(longTokenAmount, market.longToken.decimals, market.longToken.symbol)}
                            </div>
                          )}

                          {shortTokenAmount.gt(0) && (
                            <div>
                              {formatTokenAmount(
                                shortTokenAmount,
                                market.shortToken.decimals,
                                market.shortToken.symbol
                              )}
                            </div>
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

const claimFundingFeeEventTitles: Record<ClaimFundingFeeAction["eventName"], string> = {
  [ClaimType.SettleFundingFeeCancelled]: t`Failed Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeCreated]: t`Request Settlement of Funding Fees`,
  [ClaimType.SettleFundingFeeExecuted]: t`Settled Funding Fees`,
};

function ClaimFundingFeesHistoryRow(p: ClaimFundingFeesHistoryRowProps) {
  const { chainId } = useChainId();
  const { claimAction } = p;

  const eventTitle = claimFundingFeeEventTitles[claimAction.eventName];

  const groups = useMemo(() => {
    const claimActionItems = claimAction.markets.map((market, i) => ({
      market,
      amount: claimAction.amounts[i],
      token: claimAction.tokens[i],
      transactionHash: claimAction.transactionHashes[i],
      isLong: claimAction.isLongOrders[i],
    }));
    return groupBy(claimActionItems, (item) => `${item.market.marketTokenAddress}/${item.isLong}`) as Record<
      string,
      typeof claimActionItems
    >;
  }, [
    claimAction.amounts,
    claimAction.isLongOrders,
    claimAction.markets,
    claimAction.tokens,
    claimAction.transactionHashes,
  ]);

  const content = useMemo(() => {
    if (claimAction.eventName === ClaimType.SettleFundingFeeCreated) {
      const groupsEntries = Object.entries(groups);
      return (
        <ExternalLink href={claimAction.transactionHash} className="plain" key={claimAction.transactionHash}>
          <div>
            {eventTitle} from{" "}
            <Tooltip
              handle={plural(groupsEntries.length, { one: "# Position", other: "# Positions" })}
              renderContent={() => {
                return groupsEntries.map(([key, items]) => {
                  return (
                    <div key={key} className="ClaimHistoryRow__token-amount">
                      {items.map((item, index) => {
                        return (
                          <span key={key}>
                            {item.isLong ? "Long" : "Short"} {getMarketIndexName(item.market)} Position
                          </span>
                        );
                      })}
                    </div>
                  );
                });
              }}
            />
          </div>
        </ExternalLink>
      );
    }

    if (claimAction.eventName === ClaimType.SettleFundingFeeCancelled) {
      const groupsEntries = Object.entries(groups);
      return (
        <span className="plain" key={claimAction.transactionHash}>
          <div>
            <span className="text-red">{eventTitle}</span> from{" "}
            <Tooltip
              handle={plural(groupsEntries.length, { one: "# Position", other: "# Positions" })}
              renderContent={() => {
                return groupsEntries.map(([key, items]) => {
                  return (
                    <div key={key} className="ClaimHistoryRow__token-amount">
                      {items.map((item) => {
                        return (
                          <div key={key}>
                            <ExternalLink href={item.transactionHash}>
                              {item.isLong ? "Long" : "Short"} {getMarketIndexName(item.market)} Position
                            </ExternalLink>
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              }}
            />
          </div>
        </span>
      );
    }

    if (claimAction.eventName === ClaimType.SettleFundingFeeExecuted) {
      const groupsEntries = Object.entries(groups);
      const amounts = groupsEntries.map(([key, items], index) => {
        return (
          <div key={key}>
            <ExternalLink
              className="plain ClaimHistoryRow__token-amount"
              href={`${getExplorerUrl(chainId)}tx/${items[0].transactionHash}`}
            >
              {items.map((item, itemIndex) => (
                <Fragment key={`${item.token.address}/${item.market.marketTokenAddress}`}>
                  {formatTokenAmount(item.amount, item.token.decimals, item.token.symbol)}
                  {itemIndex === items.length - 1 ? "" : ", "}
                </Fragment>
              ))}{" "}
              from {items[0].isLong ? "Long" : "Short"} {getMarketIndexName(items[0].market)} Position
              {groupsEntries.length - 1 === index ? "" : <br />}
            </ExternalLink>
          </div>
        );
      });
      return (
        <>
          <div>{eventTitle}</div>
          <div>{amounts}</div>
        </>
      );
    }

    return null;
  }, [chainId, claimAction.eventName, claimAction.transactionHash, eventTitle, groups]);

  return (
    <div className="TradeHistoryRow App-box App-box-border">
      <div className="muted TradeHistoryRow-time">{formatDateTime(claimAction.timestamp)}</div>
      {content}
    </div>
  );
}
