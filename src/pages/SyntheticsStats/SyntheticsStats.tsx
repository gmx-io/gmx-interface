import { useChainId } from "lib/chains";
import { CHART_PERIODS, PRECISION } from "lib/legacy";
import { BigNumberish, ethers } from "ethers";
import { expandDecimals, formatAmount, formatUsd } from "lib/numbers";

import cx from "classnames";
import { ShareBar } from "components/ShareBar/ShareBar";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod, getPriceImpactUsd } from "domain/synthetics/fees";
import {
  MarketInfo,
  getUsedLiquidity,
  getAvailableUsdLiquidityForCollateral,
  getMarketIndexName,
  getMarketPoolName,
  getMaxOpenInterestUsd,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { usePositionsConstantsRequest } from "domain/synthetics/positions";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import "./SyntheticsStats.scss";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { DownloadAsCsv } from "components/DownloadAsCsv/DownloadAsCsv";
import { format } from "date-fns";
import { getPlusOrMinusSymbol, getPositiveOrNegativeClass } from "lib/utils";
import { bigMath } from "lib/bigmath";

function pow(bn: bigint, exponent: bigint) {
  // this is just aproximation
  const n = Number(bn.toString()) / 1e30;
  const e = Number(exponent.toString()) / 1e30;
  const afterExponent = Math.pow(n, e);
  return expandDecimals(afterExponent.toFixed(0), 30);
}

function formatAmountHuman(amount: BigNumberish | undefined, tokenDecimals: number, showDollar = false) {
  const n = Number(formatAmount(amount, tokenDecimals));
  const isNegative = n < 0;
  const absN = Math.abs(n);
  const sign = showDollar ? "$" : "";

  if (absN >= 1000000) {
    return `${isNegative ? "-" : ""}${sign}${(absN / 1000000).toFixed(1)}M`;
  }
  if (absN >= 1000) {
    return `${isNegative ? "-" : ""}${sign}${(absN / 1000).toFixed(1)}K`;
  }
  return `${isNegative ? "-" : ""}${sign}${absN.toFixed(1)}`;
}

function formatFactor(factor: bigint) {
  if (factor == 0n) {
    return "0";
  }

  if (bigMath.abs(factor) > PRECISION * 1000n) {
    return (factor / PRECISION).toString();
  }

  const trailingZeroes =
    bigMath
      .abs(factor)
      .toString()
      .match(/^(.+?)(?<zeroes>0*)$/)?.groups?.zeroes?.length || 0;
  const factorDecimals = 30 - trailingZeroes;
  return formatAmount(factor, 30, factorDecimals);
}

const CSV_EXCLUDED_FIELDS: (keyof MarketInfo)[] = [
  "longToken",
  "shortToken",
  "indexToken",
  "longPoolAmountAdjustment",
  "shortPoolAmountAdjustment",
];

export function SyntheticsStats() {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstantsRequest(chainId);

  const markets = Object.values(marketsInfoData || {});
  markets.sort((a, b) => {
    if (a.indexTokenAddress === b.indexTokenAddress) {
      return 0;
    }
    if (a.indexTokenAddress === ethers.ZeroAddress) {
      return 1;
    }
    if (b.indexTokenAddress === ethers.ZeroAddress) {
      return -1;
    }
    return 0;
  });

  return (
    <div className="SyntheticsStats page-layout default-container">
      <div className="SyntheticsStats-table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sticky-left">Market</th>
              <th>Pool Value</th>
              <th>Pool Balance</th>
              <th>Pool Cap Long</th>
              <th>Pool Cap Short</th>
              <th>
                <TooltipWithPortal handle="PnL" renderContent={() => "Pending PnL from all open positions"} />
              </th>
              <th>
                <TooltipWithPortal
                  handle="Borrowing Fees"
                  renderContent={() => "Pending Borrowing Fees from all open positions"}
                />
              </th>
              <th>
                <TooltipWithPortal
                  handle="Funding APR"
                  renderContent={() => (
                    <div>
                      Longs / Shorts
                      <br />
                      <br />
                      Per 1h
                      <br />
                      <br />
                      Negative Value: Traders pay funding
                      <br />
                      <br />
                      Positive Value: Traders receive funding
                    </div>
                  )}
                />
              </th>
              <th>Open Interest</th>
              <th>Liquidity Long</th>
              <th>Liquidity Short</th>
              <th>
                <TooltipWithPortal
                  handle="VI Positions"
                  position="bottom-end"
                  renderContent={() => (
                    <>
                      <p>Virtual inventory for positons</p>
                      <p>
                        Virtual Inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC,
                        ETH/USDT.
                      </p>
                    </>
                  )}
                />
              </th>
              <th>
                <TooltipWithPortal
                  handle="VI Swaps"
                  position="bottom-end"
                  renderContent={() => (
                    <>
                      <p>Virtual inventory for swaps (Long / Short)</p>
                      <p>
                        Virtual Inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC,
                        ETH/USDT.
                      </p>
                    </>
                  )}
                />
              </th>
              <th>Position Impact Pool</th>
              <th>Config</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => {
              const totalInterestUsd = market.longInterestUsd + market.shortInterestUsd;

              const midLongPrice = getMidPrice(market.longToken.prices);
              const midShortPrice = getMidPrice(market.shortToken.prices);

              const longPoolUsd = convertToUsd(market.longPoolAmount, market.longToken.decimals, midLongPrice);
              const shortPoolUsd = convertToUsd(market.shortPoolAmount, market.shortToken.decimals, midShortPrice);
              const totalPoolUsd = (longPoolUsd ?? 0n) + (shortPoolUsd ?? 0n);

              const longCollateralLiquidityUsd = getAvailableUsdLiquidityForCollateral(market, true);
              const shortCollateralLiquidityUsd = getAvailableUsdLiquidityForCollateral(market, false);

              const swapImpactUsdLong = convertToUsd(
                market.swapImpactPoolAmountLong,
                market.longToken.decimals,
                midLongPrice
              );

              const swapImpactUsdShort = convertToUsd(
                market.swapImpactPoolAmountShort,
                market.shortToken.decimals,
                midShortPrice
              );
              const positionImpactUsd = convertToUsd(
                market.positionImpactPoolAmount,
                market.indexToken.decimals,
                market.indexToken.prices.minPrice
              );

              const virtualInventoryPositions = market.virtualInventoryForPositions;
              const virtualInventorySwapsLong = market.virtualPoolAmountForLongToken;
              const virtualInventorySwapsShort = market.virtualPoolAmountForShortToken;

              const reservedUsdLong = getReservedUsd(market, true);
              const maxReservedUsdLong = getMaxReservedUsd(market, true);
              const maxOpenInterestLong = getMaxOpenInterestUsd(market, true);

              const [liquidityLong, maxLiquidityLong] = getUsedLiquidity(market, true);
              const [liquidityShort, maxLiquidityShort] = getUsedLiquidity(market, false);

              const reservedUsdShort = getReservedUsd(market, false);
              const maxReservedUsdShort = getMaxReservedUsd(market, false);
              const maxOpenInterestShort = getMaxOpenInterestUsd(market, false);

              const borrowingRateLong = getBorrowingFactorPerPeriod(market, true, 60 * 60 * 100);
              const borrowingRateShort = getBorrowingFactorPerPeriod(market, false, 60 * 60 * 100);

              const fundingAprLong = getFundingFactorPerPeriod(market, true, CHART_PERIODS["1h"]) * 100n;
              const fundingAprShort = getFundingFactorPerPeriod(market, false, CHART_PERIODS["1h"]) * 100n;

              function renderMarketCell() {
                return (
                  <div className="cell">
                    <div>
                      <TooltipWithPortal
                        portalClassName="SyntheticsStats-tooltip"
                        handle={getMarketIndexName(market)}
                        renderContent={() => (
                          <>
                            <StatsTooltipRow label="Key" value={market.marketTokenAddress} showDollar={false} />
                            <br />
                            <StatsTooltipRow
                              label="Virtual Market Id"
                              value={
                                <div className="debug-key">
                                  {market.virtualMarketId !== ethers.ZeroHash ? market.virtualMarketId : "-"}
                                </div>
                              }
                              showDollar={false}
                            />
                            <br />
                            <StatsTooltipRow
                              label="Virtual Long Token Id"
                              value={
                                <div className="debug-key">
                                  {market.virtualLongTokenId !== ethers.ZeroHash ? market.virtualLongTokenId : "-"}
                                </div>
                              }
                              showDollar={false}
                            />
                            <br />
                            <StatsTooltipRow
                              label="Virtual Short Token Id"
                              value={
                                <div className="debug-key">
                                  {market.virtualShortTokenId !== ethers.ZeroHash ? market.virtualShortTokenId : "-"}
                                </div>
                              }
                              showDollar={false}
                            />
                          </>
                        )}
                      />
                    </div>
                    <div className="subtext">[{getMarketPoolName(market)}]</div>
                  </div>
                );
              }

              function renderPoolCell() {
                return (
                  <div className="cell">
                    <TooltipWithPortal
                      handle={`$${formatAmountHuman(market.poolValueMax, 30)}`}
                      renderContent={() => (
                        <>
                          <StatsTooltipRow label="Pool USD Long" value={formatAmount(longPoolUsd, 30, 2, true)} />
                          <StatsTooltipRow label="Pool USD Short" value={formatAmount(shortPoolUsd, 30, 2, true)} />

                          <StatsTooltipRow
                            label="Pool Long Amount"
                            value={formatAmount(market.longPoolAmount, market.longToken.decimals, 0, true)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Pool Short Amount"
                            value={formatAmount(market.shortPoolAmount, market.shortToken.decimals, 0, true)}
                            showDollar={false}
                          />

                          <StatsTooltipRow
                            label="Pool Max Long Amount"
                            value={formatAmount(market.maxLongPoolAmount, market.longToken.decimals, 0, true)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Pool Max Short Amount"
                            value={formatAmount(market.maxShortPoolAmount, market.shortToken.decimals, 0, true)}
                            showDollar={false}
                          />

                          <StatsTooltipRow
                            label="Pool Max Long Amount For Deposit"
                            value={formatAmount(market.maxLongPoolAmountForDeposit, market.longToken.decimals, 0, true)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Pool Max Short Amount For Deposit"
                            value={formatAmount(
                              market.maxShortPoolAmountForDeposit,
                              market.shortToken.decimals,
                              0,
                              true
                            )}
                            showDollar={false}
                          />

                          <StatsTooltipRow
                            label={`Swap Impact Amount ${market.longToken.symbol}`}
                            value={formatAmount(swapImpactUsdLong, 30, 0, true)}
                          />
                          <StatsTooltipRow
                            label={`Swap Impact Amount ${market.shortToken.symbol}`}
                            value={formatAmount(swapImpactUsdShort, 30, 0, true)}
                          />
                          <StatsTooltipRow
                            label={`Position Impact Amount`}
                            value={formatAmount(positionImpactUsd, 30, 0, true)}
                          />
                        </>
                      )}
                    />
                  </div>
                );
              }

              function renderPoolBalanceCell() {
                return (
                  <div className="cell">
                    <div>
                      <TooltipWithPortal
                        handle={`$${formatAmountHuman(longPoolUsd, 30)} / $${formatAmountHuman(shortPoolUsd, 30)}`}
                        renderContent={() => {
                          return (
                            <>
                              <StatsTooltipRow label="Pool USD Long" value={formatAmount(longPoolUsd, 30, 2, true)} />
                              <StatsTooltipRow label="Pool USD Short" value={formatAmount(shortPoolUsd, 30, 2, true)} />

                              <StatsTooltipRow
                                label="Pool Long Amount"
                                value={formatAmount(market.longPoolAmount, market.longToken.decimals, 0, true)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Pool Short Amount"
                                value={formatAmount(market.shortPoolAmount, market.shortToken.decimals, 0, true)}
                                showDollar={false}
                              />
                            </>
                          );
                        }}
                      />
                    </div>
                    <ShareBar className="balance" share={longPoolUsd} total={totalPoolUsd} />
                  </div>
                );
              }

              function renderPoolCapCell(isLong: boolean) {
                const poolAmount = isLong ? market.longPoolAmount : market.shortPoolAmount;
                const maxPoolAmountForDeposit = isLong
                  ? market.maxLongPoolAmountForDeposit
                  : market.maxShortPoolAmountForDeposit;
                const token = isLong ? market.longToken : market.shortToken;

                return (
                  <div className="cell">
                    {formatAmountHuman(poolAmount, token.decimals)} /{" "}
                    {formatAmountHuman(maxPoolAmountForDeposit, token.decimals)} {token.symbol}
                    <ShareBar share={poolAmount} total={maxPoolAmountForDeposit} warningThreshold={90} />
                  </div>
                );
              }

              function renderBorrowingRateCell() {
                const maxBorrowingRateLong =
                  bigMath.mulDiv(
                    pow(maxLiquidityLong, market.borrowingExponentFactorLong),
                    market.borrowingFactorLong,
                    longPoolUsd!
                  ) *
                  (3600n * 100n);
                const maxBorrowingRateShort =
                  bigMath.mulDiv(
                    pow(maxLiquidityShort, market.borrowingExponentFactorShort),
                    market.borrowingFactorShort,
                    shortPoolUsd!
                  ) *
                  (3600n * 100n);

                return (
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <TooltipWithPortal
                        handle={
                          <>
                            <span className={getPositiveOrNegativeClass(-borrowingRateLong + 1n)}>
                              {formatAmount(-borrowingRateLong, 30, 4)}%
                            </span>
                            {" / "}
                            <span className={getPositiveOrNegativeClass(-borrowingRateShort + 1n)}>
                              {formatAmount(-borrowingRateShort, 30, 4)}%
                            </span>
                          </>
                        }
                        renderContent={() => (
                          <>
                            <StatsTooltipRow
                              label="Pending borrowing fee"
                              value={formatAmountHuman(market.totalBorrowingFees, 30)}
                            />
                            <StatsTooltipRow
                              label="Borrowing Factor Long"
                              value={formatFactor(market.borrowingFactorLong)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Borrowing Factor Short"
                              value={formatFactor(market.borrowingFactorShort)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Borrowing Exponent Long"
                              value={formatFactor(market.borrowingExponentFactorLong)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Borrowing Exponent Short"
                              value={formatFactor(market.borrowingExponentFactorShort)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Max Rate Long"
                              value={`-${formatAmount(maxBorrowingRateLong, 30, 4)}% / 1h`}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Max Rate Short"
                              value={`-${formatAmount(maxBorrowingRateShort, 30, 4)}% / 1h`}
                              showDollar={false}
                            />
                          </>
                        )}
                      />
                    )}
                  </div>
                );
              }

              function renderFundingCell() {
                return (
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <TooltipWithPortal
                        handle={
                          <>
                            <span className={getPositiveOrNegativeClass(fundingAprLong)}>
                              {market.longsPayShorts ? "-" : "+"}
                              {formatAmount(bigMath.abs(fundingAprLong), 30, 4)}%
                            </span>
                            {" / "}
                            <span className={getPositiveOrNegativeClass(fundingAprShort)}>
                              {market.longsPayShorts ? "+" : "-"}
                              {formatAmount(bigMath.abs(fundingAprShort), 30, 4)}%
                            </span>
                          </>
                        }
                        renderContent={() =>
                          market.fundingIncreaseFactorPerSecond !== undefined &&
                          market.fundingIncreaseFactorPerSecond > 0 ? (
                            <>
                              <StatsTooltipRow
                                label="Funding increase factor"
                                value={formatFactor(market.fundingIncreaseFactorPerSecond)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Funding decrease factor"
                                value={formatFactor(market.fundingDecreaseFactorPerSecond)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Max funding factor"
                                value={formatFactor(market.maxFundingFactorPerSecond)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Min funding factor"
                                value={formatFactor(market.minFundingFactorPerSecond)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Threshold for stable funding"
                                value={formatFactor(market.thresholdForStableFunding)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Threshold for decrease funding"
                                value={formatFactor(market.thresholdForDecreaseFunding)}
                                showDollar={false}
                              />
                            </>
                          ) : (
                            <>
                              <StatsTooltipRow
                                label="Funding factor"
                                value={formatAmount(market.fundingFactor, 30, 2)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Funding exponent factor"
                                value={formatAmount(market.fundingExponentFactor, 30, 14)}
                                showDollar={false}
                              />
                            </>
                          )
                        }
                      />
                    )}
                  </div>
                );
              }

              function renderOIBalanceCell() {
                if (market.isSpotOnly) {
                  return <div className="cell">...</div>;
                }
                return (
                  <div className="cell">
                    <div>
                      <TooltipWithPortal
                        handle={`$${formatAmountHuman(market.longInterestUsd, 30)} / $${formatAmountHuman(
                          market.shortInterestUsd,
                          30
                        )}`}
                        renderContent={() => (
                          <>
                            <StatsTooltipRow
                              label="Total"
                              value={formatAmount(market.shortInterestUsd + market.longInterestUsd, 30, 0, true)}
                            />
                            <StatsTooltipRow label="Long" value={formatAmount(market.longInterestUsd, 30, 0, true)} />
                            <StatsTooltipRow label="Short" value={formatAmount(market.shortInterestUsd, 30, 0, true)} />
                            <StatsTooltipRow
                              showDollar={false}
                              label="Percentage"
                              value={(() => {
                                const totalInterestUsd = market.shortInterestUsd + market.longInterestUsd;
                                let longInterestPercent = "0";
                                let shortInterestPercent = "0";
                                if (totalInterestUsd !== 0n) {
                                  longInterestPercent = formatAmount(
                                    bigMath.mulDiv(market.longInterestUsd, 10000n, totalInterestUsd),
                                    2,
                                    2
                                  );
                                  shortInterestPercent = formatAmount(
                                    bigMath.mulDiv(market.shortInterestUsd, 10000n, totalInterestUsd),
                                    2,
                                    2
                                  );
                                }
                                return (
                                  <>
                                    {longInterestPercent}% / {shortInterestPercent}%
                                  </>
                                );
                              })()}
                            />
                            <StatsTooltipRow
                              label="Difference"
                              value={formatAmount(
                                bigMath.abs(market.shortInterestUsd - market.longInterestUsd),
                                30,
                                0,
                                true
                              )}
                            />
                          </>
                        )}
                      />
                    </div>
                    <ShareBar className="balance" share={market.longInterestUsd} total={totalInterestUsd} />
                  </div>
                );
              }

              function renderLiquidityCell(isLong: boolean) {
                const [
                  collateralLiquidityUsd,
                  liquidity,
                  maxLiquidity,
                  reservedUsd,
                  maxReservedUsd,
                  interestUsd,
                  maxOpenInterest,
                  token,
                ] = isLong
                  ? [
                      longCollateralLiquidityUsd,
                      liquidityLong,
                      maxLiquidityLong,
                      reservedUsdLong,
                      maxReservedUsdLong,
                      market.longInterestUsd,
                      maxOpenInterestLong,
                      market.longToken,
                    ]
                  : [
                      shortCollateralLiquidityUsd,
                      liquidityShort,
                      maxLiquidityShort,
                      reservedUsdShort,
                      maxReservedUsdShort,
                      market.shortInterestUsd,
                      maxOpenInterestShort,
                      market.shortToken,
                    ];

                const isLongLabel = isLong ? "Long" : "Short";
                let availableLiquidity = maxLiquidity - liquidity;
                if (availableLiquidity < 0) {
                  availableLiquidity = 0n;
                }

                return (
                  <div className="cell">
                    <div>
                      <TooltipWithPortal
                        handle={
                          market.isSpotOnly ? (
                            formatAmountHuman(collateralLiquidityUsd, 30)
                          ) : (
                            <span>
                              ${formatAmountHuman(liquidity, 30)} / ${formatAmountHuman(maxLiquidity, 30)}
                            </span>
                          )
                        }
                        renderContent={() => (
                          <>
                            <StatsTooltipRow label={`Reserved Long`} value={formatAmount(reservedUsd, 30, 0, true)} />
                            <StatsTooltipRow
                              label={`Max Reserved ${isLongLabel}`}
                              value={formatAmount(maxReservedUsd, 30, 0, true)}
                            />
                            <StatsTooltipRow
                              label={`Open Interest ${isLongLabel}`}
                              value={formatAmount(interestUsd, 30, 0, true)}
                            />
                            <StatsTooltipRow
                              label={`Max Open Interest ${isLongLabel}`}
                              value={formatAmount(maxOpenInterest, 30, 0, true)}
                            />
                            <StatsTooltipRow
                              label={`Max ${token.symbol} Out`}
                              value={formatAmount(collateralLiquidityUsd, 30, 0, true)}
                            />
                            <StatsTooltipRow
                              label={`Available Liquidity ${isLongLabel}`}
                              value={formatAmount(availableLiquidity, 30, 0, true)}
                            />
                          </>
                        )}
                      />
                    </div>
                    <ShareBar share={liquidity} total={maxLiquidity} warningThreshold={90} />
                  </div>
                );
              }

              function renderPositionImpactCell() {
                const bonusApr =
                  bigMath.mulDiv(
                    market.positionImpactPoolDistributionRate * 86400n * 365n,
                    market.indexToken.prices.minPrice,
                    (longPoolUsd ?? 0n) + (shortPoolUsd ?? 0n) ?? 0n
                  ) * 100n;

                const reservedPositivePriceImpactUsd = getPriceImpactUsd({
                  currentLongUsd: market.longInterestUsd - market.shortInterestUsd,
                  currentShortUsd: 0n,
                  nextLongUsd: 0n,
                  nextShortUsd: 0n,
                  factorNegative: market.positionImpactFactorNegative,
                  factorPositive: market.positionImpactFactorPositive,
                  exponentFactor: market.positionImpactExponentFactor,
                });

                const reservedPositivePriceImpact = bigMath.mulDiv(
                  reservedPositivePriceImpactUsd,
                  expandDecimals(1, market.indexToken.decimals),
                  market.indexToken.prices.maxPrice
                );

                return (
                  <div className="cell">
                    <TooltipWithPortal
                      handle={`$${formatAmount(positionImpactUsd, 30, 2, true)}`}
                      position="bottom-end"
                      renderContent={() => (
                        <>
                          <StatsTooltipRow
                            label="Impact Pool Amount"
                            value={formatAmount(market.positionImpactPoolAmount, market.indexToken.decimals, 2, true)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Min Impact Pool Amount"
                            value={formatAmount(market.minPositionImpactPoolAmount, market.indexToken.decimals, 4)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Impact Pool After Reserved Positive Impact"
                            value={formatAmount(
                              market.positionImpactPoolAmount - reservedPositivePriceImpact,
                              market.indexToken.decimals,
                              2,
                              true
                            )}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label={`Distribution Rate, ${market.indexToken.symbol}`}
                            value={formatAmount(
                              market.positionImpactPoolDistributionRate,
                              market.indexToken.decimals + 30,
                              10
                            )}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Distribution Rate per Day, USD"
                            value={formatAmount(
                              market.positionImpactPoolDistributionRate * 86400n * market.indexToken.prices.minPrice,
                              market.indexToken.decimals + 60,
                              2,
                              true
                            )}
                          />
                          <StatsTooltipRow
                            label="Bonus APR"
                            value={formatAmount(bonusApr, market.indexToken.decimals + 30, 2, true)}
                            showDollar={false}
                            unit="%"
                          />
                          <StatsTooltipRow
                            label="Negative Impact Factor"
                            value={formatFactor(market.positionImpactFactorNegative)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Positive Impact Factor"
                            value={formatFactor(market.positionImpactFactorPositive)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Impact Exponent"
                            value={formatFactor(market.positionImpactExponentFactor)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Reserved Positive Impact"
                            value={formatAmount(reservedPositivePriceImpact, market.indexToken.decimals, 4, true)}
                            showDollar={false}
                          />
                        </>
                      )}
                    />
                  </div>
                );
              }

              return (
                <tr key={market.marketTokenAddress}>
                  <td className="sticky-left">{renderMarketCell()}</td>
                  <td>{renderPoolCell()}</td>
                  <td>{renderPoolBalanceCell()}</td>
                  <td>{renderPoolCapCell(true)}</td>
                  <td>{renderPoolCapCell(false)}</td>
                  <td>
                    <div className="cell">
                      {market.isSpotOnly ? (
                        "..."
                      ) : (
                        <TooltipWithPortal
                          handle={
                            <span className={cx({ positive: market.netPnlMax > 0, negative: market.netPnlMax < 0 })}>
                              {getPlusOrMinusSymbol(market.netPnlMax)}$
                              {formatAmountHuman(bigMath.abs(market.netPnlMax), 30)}
                            </span>
                          }
                          renderContent={() => (
                            <>
                              <StatsTooltipRow
                                showDollar={false}
                                label="PnL Long"
                                textClassName={getPositiveOrNegativeClass(market.pnlLongMax)}
                                value={`${getPlusOrMinusSymbol(market.pnlLongMax)}${formatAmountHuman(
                                  bigMath.abs(market.pnlLongMax),
                                  30,
                                  true
                                )}`}
                              />
                              <StatsTooltipRow
                                showDollar={false}
                                label="PnL Short"
                                textClassName={getPositiveOrNegativeClass(market.pnlShortMax)}
                                value={`${getPlusOrMinusSymbol(market.pnlShortMax)}${formatAmountHuman(
                                  bigMath.abs(market.pnlShortMax),
                                  30,
                                  true
                                )}`}
                              />
                            </>
                          )}
                        />
                      )}
                    </div>
                  </td>
                  <td>{renderBorrowingRateCell()}</td>
                  <td>{renderFundingCell()}</td>
                  <td>{renderOIBalanceCell()}</td>
                  <td>{renderLiquidityCell(true)}</td>
                  <td>{renderLiquidityCell(false)}</td>
                  <td>
                    <div className="cell">
                      {market.isSpotOnly ? (
                        "..."
                      ) : (
                        <TooltipWithPortal
                          position="bottom-end"
                          handle={
                            <>
                              <div>
                                {virtualInventoryPositions > 0 ? "Short" : "Long"}{" "}
                                {formatAmountHuman(bigMath.abs(virtualInventoryPositions), 30) || "$0.00"}
                              </div>
                            </>
                          }
                          renderContent={() => {
                            return (
                              <StatsTooltipRow
                                label={virtualInventoryPositions > 0 ? "Short" : "Long"}
                                value={formatUsd(bigMath.abs(virtualInventoryPositions)) || "$0.00"}
                                showDollar={false}
                              />
                            );
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="cell">
                      <TooltipWithPortal
                        position="bottom-end"
                        handle={
                          <div>
                            {formatAmountHuman(
                              convertToUsd(virtualInventorySwapsLong, market.longToken.decimals, midLongPrice),
                              30
                            ) || "$0.00"}{" "}
                            /{" "}
                            {formatAmountHuman(
                              convertToUsd(virtualInventorySwapsShort, market.shortToken.decimals, midShortPrice),
                              30
                            ) || "$0.00"}{" "}
                          </div>
                        }
                        renderContent={() => {
                          return (
                            <>
                              <StatsTooltipRow
                                label="Long"
                                value={formatUsd(
                                  convertToUsd(virtualInventorySwapsLong, market.longToken.decimals, midLongPrice)
                                )}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label="Short"
                                value={formatUsd(
                                  convertToUsd(virtualInventorySwapsShort, market.shortToken.decimals, midShortPrice)
                                )}
                                showDollar={false}
                              />
                            </>
                          );
                        }}
                      />
                    </div>
                  </td>
                  <td>{renderPositionImpactCell()}</td>
                  <td>
                    <div className="cell">
                      <TooltipWithPortal
                        position="bottom-end"
                        handle="..."
                        portalClassName="MarketCard-config-tooltip"
                        renderContent={() => (
                          <>
                            <div>Position Impact</div>
                            <br />
                            <StatsTooltipRow
                              label="Exponent"
                              value={formatFactor(market.positionImpactExponentFactor)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Positive Factor"
                              value={formatFactor(market.positionImpactFactorPositive)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Negative Factor"
                              value={formatFactor(market.positionImpactFactorNegative)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Max Positive Factor"
                              value={formatFactor(market.maxPositionImpactFactorPositive)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Max Negative Factor"
                              value={formatFactor(market.maxPositionImpactFactorNegative)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Max Factor for Liquidations"
                              value={formatFactor(market.maxPositionImpactFactorForLiquidations)}
                              showDollar={false}
                            />
                            <br />
                            <div className="Tooltip-divider" />
                            <br />
                            <div>Swap Impact</div>
                            <br />
                            <StatsTooltipRow
                              label="Exponent"
                              value={formatFactor(market.swapImpactExponentFactor)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Positive Factor"
                              value={formatFactor(market.swapImpactFactorPositive)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Negative Factor"
                              value={formatFactor(market.swapImpactFactorNegative)}
                              showDollar={false}
                            />
                            <br />
                            <div className="Tooltip-divider" />
                            <br />
                            <div>Fees factors</div>
                            <br />
                            <StatsTooltipRow
                              label="Swap Fee Factor (Positive PI)"
                              value={formatFactor(market.swapFeeFactorForPositiveImpact)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Swap Fee Factor (Negative PI)"
                              value={formatFactor(market.swapFeeFactorForNegativeImpact)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Position Fee Factor (Positive PI)"
                              value={formatFactor(market.positionFeeFactorForPositiveImpact)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Position Fee Factor (Negative PI)"
                              value={formatFactor(market.positionFeeFactorForNegativeImpact)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Borrowing Factor Long"
                              value={formatFactor(market.borrowingFactorLong)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Borrowing Factor Short"
                              value={formatFactor(market.borrowingFactorShort)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Borrowing Exponent Long"
                              value={formatFactor(market.borrowingExponentFactorLong)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Borrowing Exponent Short"
                              value={formatFactor(market.borrowingExponentFactorShort)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Funding Factor"
                              value={formatFactor(market.fundingFactor)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Funding Exponent"
                              value={formatFactor(market.fundingExponentFactor)}
                              showDollar={false}
                            />
                            <br />
                            <div className="Tooltip-divider" />
                            <br />
                            <div>Other</div>
                            <br />
                            <StatsTooltipRow
                              label="Min Collateral"
                              value={formatUsd(minCollateralUsd)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Min position size"
                              value={formatUsd(minPositionSizeUsd) || "..."}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Min Collateral Factor"
                              value={formatFactor(market.minCollateralFactor)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Min Collateral Factor OI Long"
                              value={formatFactor(market.minCollateralFactorForOpenInterestLong)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Min Collateral Factor OI Short"
                              value={formatFactor(market.minCollateralFactorForOpenInterestShort)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Max Leverage"
                              value={
                                market.minCollateralFactor > 0
                                  ? formatAmount((PRECISION / market.minCollateralFactor) * 100n, 2, 2)
                                  : "..."
                              }
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Reserve Factor Longs"
                              value={formatFactor(market.reserveFactorLong)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Reserve Factor Shorts"
                              value={formatFactor(market.reserveFactorShort)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Open Interest Reserve Factor Longs"
                              value={formatFactor(market.openInterestReserveFactorLong)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Open Interest Reserve Factor Shorts"
                              value={formatFactor(market.openInterestReserveFactorShort)}
                              showDollar={false}
                            />
                            <br />
                          </>
                        )}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div>
        <DownloadAsCsv
          excludedFields={CSV_EXCLUDED_FIELDS}
          data={markets}
          fileName={`gmx_v2_markets_${format(new Date(), "yyyy-MM-dd")}`}
          className="download-csv mt-15"
        />
      </div>
    </div>
  );
}
