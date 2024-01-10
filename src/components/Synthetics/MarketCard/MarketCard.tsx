import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import {
  MarketInfo,
  getAvailableUsdLiquidityForPosition,
  getMarketIndexName,
  getMarketPoolName,
  getMaxOpenInterestUsd,
  getMaxReservedUsd,
  getOpenInterestUsd,
  getReservedUsd,
  isMarketAdaptiveFundingActive,
} from "domain/synthetics/markets";
import { CHART_PERIODS } from "lib/legacy";
import { formatAmount, formatPercentage, formatUsd, getBasisPoints } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ShareBar } from "components/ShareBar/ShareBar";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import { useCallback, useMemo } from "react";
import "./MarketCard.scss";
import { getPlusOrMinusSymbol, getPositiveOrNegativeClass } from "lib/utils";

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
    borrowingRate,
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
      borrowingRate: getBorrowingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100),
      fundingRateLong: getFundingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]).mul(100),
      fundingRateShort: getFundingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]).mul(100),
      currentOpenInterest: getOpenInterestUsd(marketInfo, isLong),
      totalInterestUsd: marketInfo.longInterestUsd.add(marketInfo.shortInterestUsd),
      priceDecimals: marketInfo.indexToken.priceDecimals,
      maxOpenInterest: getMaxOpenInterestUsd(marketInfo, isLong),
    };
  }, [marketInfo, isLong]);
  const fundingRate = isLong ? fundingRateLong : fundingRateShort;
  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const renderFundingFeeTooltipContent = useCallback(() => {
    if (!fundingRateLong || !fundingRateShort) return [];
    const isAdaptiveFundingForMarketActive = marketInfo && isMarketAdaptiveFundingActive(marketInfo);

    const isLongPositive = fundingRateLong?.gt(0);
    const long = (
      <Trans>
        Long positions {isLongPositive ? t`receive` : t`pay`} a Funding Fee of{" "}
        <span className={getPositiveOrNegativeClass(fundingRateLong)}>
          {getPlusOrMinusSymbol(fundingRateLong)}
          {formatAmount(fundingRateLong.abs(), 30, 4)}%
        </span>{" "}
        per hour.
      </Trans>
    );

    const isShortPositive = fundingRateShort?.gt(0);
    const short = (
      <Trans>
        Short positions {isShortPositive ? t`receive` : t`pay`} a Funding Fee of{" "}
        <span className={getPositiveOrNegativeClass(fundingRateShort)}>
          {getPlusOrMinusSymbol(fundingRateShort)}
          {formatAmount(fundingRateShort.abs(), 30, 4)}%
        </span>{" "}
        per hour.
      </Trans>
    );

    const [currentFeeElement, oppositeFeeElement] = isLong ? [long, short] : [short, long];

    return (
      <div>
        {currentFeeElement}
        <br />
        <br />
        {oppositeFeeElement}
        {isAdaptiveFundingForMarketActive && (
          <span>
            <br />
            <br />
            <Trans>
              This market uses an Adaptive Funding Rate. The Funding Rate will adjust over time depending on the ratio
              of longs and shorts.{" "}
              <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#adaptive-funding">Read more</ExternalLink>.
            </Trans>
          </span>
        )}
      </div>
    );
  }, [fundingRateLong, fundingRateShort, isLong, marketInfo]);

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
                fundingRate
                  ? `${getPlusOrMinusSymbol(fundingRate)}${formatAmount(fundingRate.abs(), 30, 4)}% / 1h`
                  : "..."
              }
              position="right-bottom"
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
              position="right-bottom"
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
