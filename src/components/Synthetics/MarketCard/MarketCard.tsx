import "./MarketCard.scss";

import { t, Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import Tooltip from "components/Tooltip/Tooltip";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import {
  getAvailableUsdLiquidityForPosition,
  getMarketIndexName,
  getMarketPoolName,
  getMaxOpenInterestUsd,
  getMaxReservedUsd,
  getOpenInterestUsd,
  getReservedUsd,
  MarketInfo,
} from "domain/synthetics/markets";
import { CHART_PERIODS } from "lib/legacy";
import { formatPercentage, formatRatePercentage, formatUsd, getBasisPoints } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ShareBar } from "components/ShareBar/ShareBar";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import MarketNetFee from "components/Synthetics/MarketNetFee/MarketNetFee";
import { renderNetFeeHeaderTooltipContent } from "components/Synthetics/MarketsList/NetFeeHeaderTooltipContent";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export type Props = {
  marketInfo?: MarketInfo;
  allowedSlippage?: number;
  isLong: boolean;
};

export function MarketCard({ marketInfo, allowedSlippage, isLong }: Props) {
  const { indexToken } = marketInfo || {};

  const entryPrice = isLong ? indexToken?.prices?.maxPrice : indexToken?.prices?.minPrice;
  const exitPrice = isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const longShortText = isLong ? t`Long` : t`Short`;

  const {
    liquidity,
    maxReservedUsd,
    reservedUsd,
    borrowingRateLong,
    borrowingRateShort,
    fundingRateLong,
    fundingRateShort,
    totalInterestUsd,
    priceDecimals,
    currentOpenInterest,
    maxOpenInterest,
  } = useMemo(() => {
    if (!marketInfo) return {};
    return {
      liquidity: getAvailableUsdLiquidityForPosition(marketInfo, isLong),
      maxReservedUsd: getMaxReservedUsd(marketInfo, isLong),
      reservedUsd: getReservedUsd(marketInfo, isLong),
      borrowingRateLong: -getBorrowingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]),
      borrowingRateShort: -getBorrowingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]),
      fundingRateLong: getFundingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]),
      fundingRateShort: getFundingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]),
      currentOpenInterest: getOpenInterestUsd(marketInfo, isLong),
      totalInterestUsd: marketInfo.longInterestUsd + marketInfo.shortInterestUsd,
      priceDecimals: marketInfo.indexToken.priceDecimals,
      maxOpenInterest: getMaxOpenInterestUsd(marketInfo, isLong),
    };
  }, [marketInfo, isLong]);
  const fundingRate = isLong ? fundingRateLong : fundingRateShort;
  const borrowingRate = isLong ? borrowingRateLong : borrowingRateShort;
  const netRateHourly = (fundingRate ?? 0n) + (borrowingRate ?? 0n);
  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const renderFundingFeeTooltipContent = useCallback(() => {
    if (fundingRateLong === undefined || fundingRateShort === undefined) return [];

    const long = (
      <MarketNetFee borrowRateHourly={borrowingRateLong} fundingRateHourly={fundingRateLong} isLong={true} />
    );

    const short = (
      <MarketNetFee borrowRateHourly={borrowingRateShort} fundingRateHourly={fundingRateShort} isLong={false} />
    );

    const [currentFeeElement, oppositeFeeElement] = isLong ? [long, short] : [short, long];

    return (
      <div>
        {currentFeeElement}
        <br />
        {oppositeFeeElement}
      </div>
    );
  }, [fundingRateLong, fundingRateShort, isLong, borrowingRateLong, borrowingRateShort]);

  return (
    <div className="Exchange-swap-market-box App-box App-box-border MarketCard">
      <div className="App-card-title">
        {longShortText}&nbsp;{indexToken?.symbol}
      </div>
      <div className="App-card-divider" />
      <div>
        <ExchangeInfoRow
          label={t`Market`}
          value={
            <div className="flex items-start">
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
              position="bottom-end"
              renderContent={() => (
                <Trans>
                  The position will be opened at a reference price of{" "}
                  {formatUsd(entryPrice, { displayDecimals: priceDecimals })}, not accounting for price impact, with a
                  max slippage of -{allowedSlippage ? (allowedSlippage / 100.0).toFixed(2) : "..."}%.
                  <br />
                  <br />
                  The slippage amount can be configured under Settings, found by clicking on your address at the top
                  right of the page after connecting your wallet.
                  <br />
                  <br />
                  <ExternalLink href="https://docs.gmx.io/docs/trading/v2#opening-a-position">Read more</ExternalLink>.
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
              position="bottom-end"
              renderContent={() => (
                <Trans>
                  If you have an existing position, the position will be closed at a reference price of{" "}
                  {formatUsd(entryPrice)}, not accounting for price impact.
                  <br />
                  <br />
                  This exit price will change with the price of the asset.
                  <br />
                  <br />
                  <ExternalLink href="https://docs.gmx.io/docs/trading/v2#opening-a-position">Read more</ExternalLink>.
                </Trans>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={
            <TooltipWithPortal renderContent={renderNetFeeHeaderTooltipContent}>
              <Trans>Net Rate</Trans>
            </TooltipWithPortal>
          }
          value={
            <TooltipWithPortal
              portalClassName="MarketCard-net-fee"
              handle={netRateHourly !== undefined ? `${formatRatePercentage(netRateHourly)} / 1h` : "..."}
              position="top-end"
              renderContent={renderFundingFeeTooltipContent}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Available Liquidity`}
          value={
            <Tooltip
              className="al-swap"
              handle={formatUsd(liquidity) || "..."}
              position="bottom-end"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`${longShortText} ${indexToken?.symbol} Reserve`}
                    value={`${formatUsd(reservedUsd, { displayDecimals: 0 })} / ${formatUsd(maxReservedUsd, {
                      displayDecimals: 0,
                    })}`}
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label={t`${longShortText} ${indexToken?.symbol} Open Interest`}
                    value={`${formatUsd(currentOpenInterest, { displayDecimals: 0 })} / ${formatUsd(maxOpenInterest, {
                      displayDecimals: 0,
                    })}`}
                    showDollar={false}
                  />

                  <br />
                  {isLong && (
                    <>
                      <Trans>Reserve considers the PnL of Open Positions, while Open Interest does not.</Trans>{" "}
                    </>
                  )}
                  <Trans>
                    The Available Liquidity will be the lesser of the difference between the maximum value and the
                    current value for the Reserve and Open Interest.
                  </Trans>
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
                position="bottom-end"
                handle={
                  totalInterestUsd !== undefined && totalInterestUsd > 0 ? (
                    <ShareBar
                      showPercentage
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
                    {(marketInfo && totalInterestUsd !== undefined && (
                      <>
                        <StatsTooltipRow
                          label={t`Long Open Interest`}
                          value={
                            <span>
                              {formatUsd(marketInfo.longInterestUsd, { displayDecimals: 0 })} <br />
                              {totalInterestUsd > 0 &&
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
                              {totalInterestUsd > 0 &&
                                `(${formatPercentage(getBasisPoints(marketInfo.shortInterestUsd, totalInterestUsd))})`}
                            </span>
                          }
                          showDollar={false}
                        />
                      </>
                    )) ||
                      null}
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
