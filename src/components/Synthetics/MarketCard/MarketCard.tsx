import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import {
  MarketInfo,
  getAvailableUsdLiquidityForPosition,
  getMarketIndexName,
  getMarketPoolName,
  getMaxReservedUsd,
  getReservedUsd,
} from "domain/synthetics/markets";
import { CHART_PERIODS } from "lib/legacy";
import { formatAmount, formatPercentage, formatUsd, getBasisPoints } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ShareBar } from "components/ShareBar/ShareBar";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import { useMemo } from "react";
import "./MarketCard.scss";

export type Props = {
  marketInfo?: MarketInfo;
  allowedSlippage?: number;
  isLong: boolean;
  isIncrease: boolean;
};

export function MarketCard({ marketInfo, allowedSlippage, isLong, isIncrease }: Props) {
  const { indexToken } = marketInfo || {};

  const entryPrice = isLong ? indexToken?.prices?.maxPrice : indexToken?.prices?.minPrice;
  const exitPrice = isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const longShortText = isLong ? t`Long` : t`Short`;

  const { liquidity, maxReservedUsd, reservedUsd, borrowingRate, fundingRate, totalInterestUsd, priceDecimals } =
    useMemo(() => {
      if (!marketInfo) return {};

      return {
        liquidity: getAvailableUsdLiquidityForPosition(marketInfo, isLong),
        maxReservedUsd: getMaxReservedUsd(marketInfo, isLong),
        reservedUsd: getReservedUsd(marketInfo, isLong),
        borrowingRate: getBorrowingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100),
        fundingRate: getFundingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100),
        totalInterestUsd: marketInfo.longInterestUsd.add(marketInfo.shortInterestUsd),
        priceDecimals: marketInfo.indexToken.priceDecimals,
      };
    }, [marketInfo, isLong]);

  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        {longShortText}&nbsp;{indexToken?.symbol}
      </div>
      <div className="App-card-divider" />
      <div>
        <ExchangeInfoRow
          label={t`Market`}
          value={
            <div className="items-top">
              <span>{indexName && indexName}</span>
              <span className="subtext">{poolName && `[${poolName}]`}</span>
            </div>
          }
        />
        <ExchangeInfoRow
          label={t`Entry Price`}
          value={
            <Tooltip
              handle={formatUsd(entryPrice, { displayDecimals: priceDecimals }) || "..."}
              position="right-bottom"
              renderContent={() => (
                <Trans>
                  The position will be opened at a reference price of{" "}
                  {formatUsd(entryPrice, { displayDecimals: priceDecimals })}, not accounting for price impact, with a
                  max slippage of {allowedSlippage ? (allowedSlippage / 100.0).toFixed(2) : "..."}%.
                  <br />
                  <br />
                  The slippage amount can be configured under Settings, found by clicking on your address at the top
                  right of the page after connecting your wallet.
                  <br />
                  <br />
                  <ExternalLink href="https://docs.gmx.io/docs/trading/v2#opening-a-position">More Info</ExternalLink>
                </Trans>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Exit Price`}
          value={
            <Tooltip
              handle={
                formatUsd(exitPrice, {
                  displayDecimals: priceDecimals,
                }) || "..."
              }
              position="right-bottom"
              renderContent={() => (
                <Trans>
                  If you have an existing position, the position will be closed at a reference price of{" "}
                  {formatUsd(entryPrice)}, not accounting for price impact.
                  <br />
                  <br />
                  This exit price will change with the price of the asset.
                  <br />
                  <br />
                  <ExternalLink href="https://docs.gmx.io/docs/trading/v2#opening-a-position">More Info</ExternalLink>
                </Trans>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Borrow Fee`}
          value={borrowingRate ? `-${formatAmount(borrowingRate, 30, 4)}% / 1h` : "..."}
        />

        <ExchangeInfoRow
          label={t`Funding Fee`}
          value={
            <Tooltip
              className="al-swap"
              handle={
                fundingRate ? `${fundingRate.gt(0) ? "+" : "-"}${formatAmount(fundingRate.abs(), 30, 4)}% / 1h` : "..."
              }
              position="right-bottom"
              renderContent={() => (
                <div>
                  <Trans>
                    {longShortText} positions {fundingRate.gt(0) ? t`earn` : t`pay`} a funding fee of{" "}
                    {formatAmount(fundingRate.abs(), 30, 4)}% per hour.
                  </Trans>
                </div>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Available Liquidity`}
          value={
            <Tooltip
              className="al-swap"
              handle={formatUsd(liquidity) || "..."}
              position="right-bottom"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Max ${indexToken?.symbol} ${longShortText} capacity`}
                    value={formatUsd(maxReservedUsd, { displayDecimals: 0 }) || "..."}
                    showDollar={false}
                  />

                  <StatsTooltipRow
                    label={t`Current ${indexToken?.symbol} ${longShortText}`}
                    value={formatUsd(reservedUsd, { displayDecimals: 0 }) || "..."}
                    showDollar={false}
                  />

                  {isLong && (
                    <>
                      <br />
                      <Trans>"Current {indexToken?.symbol} Long" takes into account PnL of open positions.</Trans>
                    </>
                  )}
                </div>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Open Interest Balance`}
          value={
            <div className="MarketCard-pool-balance">
              <Tooltip
                position="right-bottom"
                handle={
                  totalInterestUsd?.gt(0) ? (
                    <ShareBar
                      className="MarketCard-pool-balance-bar"
                      share={marketInfo?.longInterestUsd}
                      total={totalInterestUsd}
                    />
                  ) : (
                    "..."
                  )
                }
                renderContent={() => (
                  <div>
                    {marketInfo && totalInterestUsd && (
                      <>
                        <StatsTooltipRow
                          label={t`Long Open Interest`}
                          value={
                            <span>
                              {formatUsd(marketInfo.longInterestUsd, { displayDecimals: 0 })} <br />
                              {totalInterestUsd.gt(0) &&
                                `(${formatPercentage(getBasisPoints(marketInfo.longInterestUsd, totalInterestUsd))})`}
                            </span>
                          }
                          showDollar={false}
                        />
                        <br />
                        <StatsTooltipRow
                          label={t`Short Open Interest`}
                          value={
                            <span>
                              {formatUsd(marketInfo.shortInterestUsd, { displayDecimals: 0 })} <br />
                              {totalInterestUsd.gt(0) &&
                                `(${formatPercentage(getBasisPoints(marketInfo.shortInterestUsd, totalInterestUsd))})`}
                            </span>
                          }
                          showDollar={false}
                        />
                      </>
                    )}
                  </div>
                )}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
