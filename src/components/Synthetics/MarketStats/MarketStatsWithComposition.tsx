import cx from "classnames";
import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import {
  MarketInfo,
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMaxPoolUsd,
  getPoolUsdWithoutPnl,
} from "domain/synthetics/markets";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import MarketTokenSelector from "../MarketTokenSelector/MarketTokenSelector";

import { CardRow } from "components/CardRow/CardRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { BridgingInfo } from "../BridgingInfo/BridgingInfo";

import { AprInfo } from "components/AprInfo/AprInfo";
import { MARKET_STATS_DECIMALS } from "config/ui";
import { isGlv } from "domain/synthetics/markets/glv";
import { zeroAddress } from "viem";
import "./MarketStats.scss";
import { CompositionBar } from "./components/CompositionBar";
import { CompositionTableGm } from "./components/CompositionTable";
import { MarketDescription } from "./components/MarketDescription";
import { useMarketMintableTokens } from "./hooks/useMarketMintableTokens";
import { useMarketSellableToken } from "./hooks/useMarketSellableToken";
import { useMedia } from "react-use";

type Props = {
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  marketInfo?: MarketInfo;
  marketToken?: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvMarketsTokensApyData: MarketTokensAPRData | undefined;
};

export function MarketStatsWithComposition(p: Props) {
  const {
    marketInfo,
    marketToken,
    marketsTokensApyData,
    marketsInfoData,
    marketTokensData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvMarketsTokensApyData,
  } = p;
  const { chainId } = useChainId();

  const isGlvMarket = marketInfo && isGlv(marketInfo);

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const { longToken, shortToken } = marketInfo || {};

  const mintableInfo = useMarketMintableTokens(marketInfo, marketToken);
  const sellableInfo = useMarketSellableToken(marketInfo, marketToken, marketTokensData);

  const maxLongSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxLongSellableUsd,
    longToken?.decimals,
    longToken?.prices.minPrice
  );

  const maxShortSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxShortSellableUsd,
    shortToken?.decimals,
    shortToken?.prices.minPrice
  );

  const apy = getByKey(marketsTokensApyData, marketInfo?.marketTokenAddress);
  const incentiveApr = getByKey(marketsTokensIncentiveAprData, marketInfo?.marketTokenAddress);
  const lidoApr = getByKey(marketsTokensLidoAprData, marketInfo?.marketTokenAddress);

  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const maxLongTokenValue = useMemo(
    () => [
      formatTokenAmountWithUsd(
        mintableInfo?.longDepositCapacityAmount,
        mintableInfo?.longDepositCapacityUsd,
        longToken?.symbol,
        longToken?.decimals
      ),
      marketInfo
        ? `(${formatUsd(getPoolUsdWithoutPnl(marketInfo, true, "midPrice"))} / ${formatUsd(getMaxPoolUsd(marketInfo, true))})`
        : "",
    ],
    [
      longToken?.decimals,
      longToken?.symbol,
      marketInfo,
      mintableInfo?.longDepositCapacityAmount,
      mintableInfo?.longDepositCapacityUsd,
    ]
  );
  const maxShortTokenValue = useMemo(
    () => [
      formatTokenAmountWithUsd(
        mintableInfo?.shortDepositCapacityAmount,
        mintableInfo?.shortDepositCapacityUsd,
        shortToken?.symbol,
        shortToken?.decimals
      ),
      marketInfo
        ? `(${formatUsd(getPoolUsdWithoutPnl(marketInfo, false, "midPrice"))} / ${formatUsd(getMaxPoolUsd(marketInfo, false))})`
        : "",
    ],
    [
      marketInfo,
      mintableInfo?.shortDepositCapacityAmount,
      mintableInfo?.shortDepositCapacityUsd,
      shortToken?.decimals,
      shortToken?.symbol,
    ]
  );

  const buyableRow = useMemo(() => {
    const buyableInfo = mintableInfo
      ? formatTokenAmountWithUsd(
          mintableInfo.mintableAmount,
          mintableInfo.mintableUsd,
          isGlvMarket ? marketToken?.symbol : marketToken?.symbol,
          marketToken?.decimals,
          {
            displayDecimals: 0,
          }
        )
      : "...";

    if (isGlvMarket) {
      return <CardRow label={t`Buyable`} value={buyableInfo} />;
    }

    return (
      <CardRow
        label={t`Buyable`}
        value={
          mintableInfo && marketTotalSupplyUsd !== undefined && marketToken ? (
            <Tooltip
              disabled={isGlvMarket}
              maxAllowedWidth={350}
              handle={buyableInfo}
              position="bottom-end"
              content={
                <div>
                  {marketInfo?.isSameCollaterals ? (
                    <Trans>
                      {marketInfo?.longToken.symbol} can be used to buy GM for this market up to the specified buying
                      caps.
                    </Trans>
                  ) : (
                    <Trans>
                      {marketInfo?.longToken.symbol} and {marketInfo?.shortToken.symbol} can be used to buy GM for this
                      market up to the specified buying caps.
                    </Trans>
                  )}

                  <br />
                  <br />

                  <StatsTooltipRow
                    label={t`Max ${marketInfo?.longToken.symbol}`}
                    value={maxLongTokenValue}
                    showDollar={false}
                  />
                  <br />
                  <StatsTooltipRow
                    label={t`Max ${marketInfo?.shortToken.symbol}`}
                    value={maxShortTokenValue}
                    showDollar={false}
                  />
                </div>
              }
            />
          ) : (
            "..."
          )
        }
      />
    );
  }, [isGlvMarket, marketInfo, marketToken, marketTotalSupplyUsd, mintableInfo, maxLongTokenValue, maxShortTokenValue]);

  const sellableRow = useMemo(() => {
    const sellableValue = sellableInfo
      ? formatTokenAmountWithUsd(
          sellableInfo?.totalAmount,
          sellableInfo?.totalUsd,
          marketToken?.symbol,
          marketToken?.decimals,
          {
            displayDecimals: 0,
          }
        )
      : "...";

    if (isGlvMarket) {
      return <CardRow label={t`Sellable`} value={sellableValue} />;
    }

    return (
      <CardRow
        label={t`Sellable`}
        value={
          <Tooltip
            maxAllowedWidth={300}
            handle={sellableValue}
            position="bottom-end"
            content={
              <div>
                {marketInfo?.isSameCollaterals ? (
                  <Trans>
                    GM can be sold for {longToken?.symbol} for this market up to the specified selling caps. The
                    remaining tokens in the pool are reserved for currently open positions.
                  </Trans>
                ) : (
                  <Trans>
                    GM can be sold for {longToken?.symbol} and {shortToken?.symbol} for this market up to the specified
                    selling caps. The remaining tokens in the pool are reserved for currently open positions.
                  </Trans>
                )}
                <br />
                <br />
                <StatsTooltipRow
                  label={t`Max ${marketInfo?.longToken.symbol}`}
                  value={formatTokenAmountWithUsd(
                    maxLongSellableTokenAmount,
                    sellableInfo?.maxLongSellableUsd,
                    longToken?.symbol,
                    longToken?.decimals
                  )}
                  showDollar={false}
                />
                {!marketInfo?.isSameCollaterals && (
                  <StatsTooltipRow
                    label={t`Max ${marketInfo?.shortToken.symbol}`}
                    value={formatTokenAmountWithUsd(
                      maxShortSellableTokenAmount,
                      sellableInfo?.maxShortSellableUsd,
                      shortToken?.symbol,
                      shortToken?.decimals
                    )}
                    showDollar={false}
                  />
                )}
              </div>
            }
          />
        }
      />
    );
  }, [
    marketInfo,
    longToken,
    shortToken,
    marketToken,
    sellableInfo,
    maxLongSellableTokenAmount,
    maxShortSellableTokenAmount,
    isGlvMarket,
  ]);

  const canFitCompositionOnRow = useMedia("(min-width: 1200px)");

  return (
    <div
      className={cx("flex flex-grow bg-slate-800", {
        "flex-row": canFitCompositionOnRow,
        "flex-col": !canFitCompositionOnRow,
      })}
    >
      <div
        className={cx("p-20", {
          "max-w-[36.6rem]": canFitCompositionOnRow,
          "w-[100%]": !canFitCompositionOnRow,
        })}
      >
        <MarketTokenSelector
          chainId={chainId}
          marketTokensData={marketTokensData}
          marketsInfoData={marketsInfoData}
          marketsTokensAPRData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          currentMarketInfo={marketInfo}
        />
        <div className="App-card-divider" />
        <div className="App-card-content">
          <MarketDescription marketInfo={marketInfo} />
          {isGlvMarket ? (
            <CardRow
              label={t`Vault`}
              value={
                marketInfo.name && poolName ? (
                  <div className="flex items-start">
                    <span>{marketInfo.name}</span>
                    <span className="subtext gm-market-name">[{poolName}]</span>
                  </div>
                ) : (
                  "..."
                )
              }
            />
          ) : (
            <CardRow
              label={t`Market`}
              value={
                indexName && poolName ? (
                  <div className="flex items-start">
                    <span>{indexName}</span>
                    <span className="subtext gm-market-name">[{poolName}]</span>
                  </div>
                ) : (
                  "..."
                )
              }
            />
          )}

          <CardRow
            label={t`Price`}
            value={
              <Tooltip
                handle={
                  formatUsd(marketPrice, {
                    displayDecimals: MARKET_STATS_DECIMALS,
                  }) || "..."
                }
                position="bottom-end"
                renderContent={() => {
                  return (
                    <div>
                      <Trans>
                        GM token pricing includes price impact pool amounts, the pending PnL of open positions, and
                        borrowing fees. It excludes funding fees, which are exchanged between traders.
                        <br />
                        <br />
                        <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2/#token-pricing">
                          Read more about GM token pricing
                        </ExternalLink>
                        .
                      </Trans>
                    </div>
                  );
                }}
              />
            }
          />

          <CardRow
            label={t`Wallet`}
            value={
              marketToken
                ? formatTokenAmountWithUsd(
                    marketBalance ?? 0n,
                    marketBalanceUsd ?? 0n,
                    isGlvMarket ? "GLV" : "GM",
                    marketToken?.decimals ?? 18
                  )
                : "..."
            }
          />

          <CardRow
            label={t`APY`}
            value={
              isGlvMarket ? (
                <AprInfo
                  lidoApr={undefined}
                  incentiveApr={undefined}
                  apy={glvMarketsTokensApyData?.[marketInfo?.marketTokenAddress]}
                  tokenAddress={marketToken?.address ?? zeroAddress}
                />
              ) : (
                <AprInfo
                  apy={apy}
                  incentiveApr={incentiveApr}
                  lidoApr={lidoApr}
                  tokenAddress={marketToken?.address ?? zeroAddress}
                />
              )
            }
          />

          <CardRow
            label={t`Total Supply`}
            value={
              marketTotalSupply !== undefined && marketTotalSupplyUsd !== undefined
                ? formatTokenAmountWithUsd(
                    marketTotalSupply,
                    marketTotalSupplyUsd,
                    isGlvMarket ? "GLV" : "GM",
                    marketToken?.decimals,
                    {
                      displayDecimals: 0,
                    }
                  )
                : "..."
            }
          />

          {sellableRow}
          {buyableRow}

          {isGlvMarket && (
            <>
              <CardRow
                label={t`Last Rebalance`}
                value={
                  marketInfo?.shiftLastExecutedAt === 0n ? "-" : marketInfo?.shiftLastExecutedAt.toString() ?? "..."
                }
              />
              <CardRow
                label={t`Rebalance Frequency`}
                value={secondsToHumanReadableDuration(marketInfo?.shiftMinInterval) ?? "..."}
              />
            </>
          )}

          <div className="App-card-divider" />
          <BridgingInfo chainId={chainId} tokenSymbol={longToken?.symbol} />
        </div>
      </div>
      <div
        className={cx("flex-grow", {
          "border-l-1 border-l-slate-700": canFitCompositionOnRow,
          "mt-20 border-t-1 border-t-slate-700": !canFitCompositionOnRow,
        })}
      >
        <div className="p-20">
          <p>Composition</p>
          <CompositionBar marketInfo={marketInfo} marketsInfoData={marketsInfoData} />
          <CompositionTableGm marketInfo={marketInfo} />
        </div>
      </div>
    </div>
  );
}

/**
 *
 * @returns every N weeks, days, hours, minutes, and seconds
 */
function secondsToHumanReadableDuration(s: bigint, roundUpTo?: "minutes" | "hours" | "days" | "weeks"): string {
  const secs = Number(s);

  const weeks = Math.floor(secs / 604800);
  const days = Math.floor((secs % 604800) / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const parts = (() => {
    const parts: string[] = [];

    if (weeks) {
      parts.push(weeks > 1 ? t`${weeks} weeks` : t`week`);
    }
    if (roundUpTo === "weeks") {
      return parts;
    }

    if (days) {
      parts.push(days > 1 ? t`${days} days` : t`day`);
    }
    if (roundUpTo === "days") {
      return parts;
    }

    if (hours) {
      parts.push(hours > 1 ? t`${hours} hours` : t`hour`);
    }
    if (roundUpTo === "hours") {
      return parts;
    }

    if (minutes) {
      parts.push(minutes > 1 ? t`${minutes} minutes` : t`minute`);
    }
    if (roundUpTo === "minutes") {
      return parts;
    }

    if (seconds) {
      parts.push(seconds > 1 ? t`${seconds} seconds` : t`second`);
    }

    return parts;
  })();

  return t`Every` + " " + parts.join(" ");
}