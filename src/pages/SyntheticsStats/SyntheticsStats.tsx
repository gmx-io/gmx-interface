import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { format } from "date-fns";
import { ReactNode } from "react";
import { zeroAddress, zeroHash } from "viem";

import { FACTOR_TO_PERCENT_MULTIPLIER_BIGINT } from "config/factors";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod, getPriceImpactUsd } from "domain/synthetics/fees";
import { useJitLiquidityRequest } from "domain/synthetics/jit/useJitLiquidityRequest";
import { getJitLiquidityInfo } from "domain/synthetics/jit/utils";
import {
  getAvailableUsdLiquidityForCollateral,
  getCappedPoolPnl,
  getMarketIndexName,
  getMarketNetPnl,
  getMarketPnl,
  getMarketPoolName,
  getMaxOpenInterestUsd,
  getMaxPoolUsdForSwap,
  getMaxReservedUsd,
  getOpenInterestForBalance,
  getOpenInterestUsd,
  getPoolUsdWithoutPnl,
  getReservedUsd,
  getStrictestMaxPoolUsdForDeposit,
  getUsedLiquidity,
  MarketInfo,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { useKinkModelMarketsRates } from "domain/synthetics/markets/useKinkModelMarketsRates";
import { usePositionsConstantsRequest } from "domain/synthetics/positions";
import { convertToUsd, getMidPrice, useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { CHART_PERIODS } from "lib/legacy";
import {
  expandDecimals,
  formatAmount,
  formatFactor,
  formatUsd,
  getPlusOrMinusSymbol,
  PRECISION,
  USD_SYMBOL,
} from "lib/numbers";
import { formatAmountHuman } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { bigMath } from "sdk/utils/bigmath";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { DownloadAsCsv } from "components/DownloadAsCsv/DownloadAsCsv";
import { ShareBar } from "components/ShareBar/ShareBar";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import {
  TooltipContent,
  TooltipDivider,
  TooltipRow,
  TooltipRows,
  TooltipText,
  TooltipTitle,
} from "components/Tooltip/TooltipBlocks";

import "./SyntheticsStats.scss";

function Usd({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="numeric-affix">{USD_SYMBOL}</span>
      {children}
    </>
  );
}

function pow(bn: bigint, exponent: bigint) {
  // this is just aproximation
  const n = Number(bn.toString()) / 1e30;
  const e = Number(exponent.toString()) / 1e30;
  const afterExponent = Math.pow(n, e);
  return expandDecimals(afterExponent.toFixed(0), 30);
}

const CSV_EXCLUDED_FIELDS: (keyof MarketInfo)[] = ["longToken", "shortToken", "indexToken"];

export function SyntheticsStats() {
  const { chainId, srcChainId } = useChainId();

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { kinkMarketsBorrowingRatesData } = useKinkModelMarketsRates(chainId);
  const { jitLiquidityMap } = useJitLiquidityRequest(chainId);
  const { positionsConstants } = usePositionsConstantsRequest(chainId);
  const { minCollateralUsd, minPositionSizeUsd, claimableCollateralDelay, claimableCollateralReductionFactor } =
    positionsConstants || {};

  const markets = Object.values(marketsInfoData || {});
  markets.sort((a, b) => {
    if (a.indexTokenAddress === b.indexTokenAddress) {
      return 0;
    }
    if (a.indexTokenAddress === zeroAddress) {
      return 1;
    }
    if (b.indexTokenAddress === zeroAddress) {
      return -1;
    }
    return 0;
  });

  return (
    <AppPageLayout title="Synthetics Stats">
      <div className="SyntheticsStats mt-20">
        <div className="SyntheticsStats-table-wrap">
          <table>
            <thead>
              <tr>
                <th className="sticky-left">
                  <Trans>MARKET</Trans>
                </th>
                <th>
                  <Trans>POOL VALUE</Trans>
                </th>
                <th>
                  <Trans>POOL BALANCE</Trans>
                </th>
                <th>
                  <Trans>POOL CAP LONG</Trans>
                </th>
                <th>
                  <Trans>POOL CAP SHORT</Trans>
                </th>
                <th>
                  <StandardTooltip
                    handle={t`PNL`}
                    variant="iconStroke"
                    renderContent={() => t`Pending PnL from all open positions`}
                  />
                </th>
                <th>
                  <StandardTooltip
                    handle={t`BORROWING FEES`}
                    variant="iconStroke"
                    renderContent={() => t`Pending borrowing fees from all open positions`}
                  />
                </th>
                <th>
                  <StandardTooltip
                    handle={t`FUNDING APR`}
                    variant="iconStroke"
                    renderContent={() => (
                      <TooltipContent>
                        <TooltipText>
                          <Trans>Longs / shorts</Trans>
                        </TooltipText>
                        <TooltipText>
                          <Trans>Per 1h</Trans>
                        </TooltipText>
                        <TooltipText>
                          <Trans>Negative value: traders pay funding</Trans>
                        </TooltipText>
                        <TooltipText>
                          <Trans>Positive value: traders receive funding</Trans>
                        </TooltipText>
                      </TooltipContent>
                    )}
                  />
                </th>
                <th>
                  <Trans>OPEN INTEREST</Trans>
                </th>
                <th>
                  <Trans>LIQUIDITY LONG</Trans>
                </th>
                <th>
                  <Trans>LIQUIDITY SHORT</Trans>
                </th>
                <th>
                  <StandardTooltip
                    handle={t`VI POSITIONS`}
                    variant="iconStroke"
                    position="bottom-end"
                    renderContent={() => (
                      <TooltipContent>
                        <TooltipText>
                          <Trans>Virtual inventory for positions</Trans>
                        </TooltipText>
                        <TooltipText>
                          <Trans>
                            Virtual inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC,
                            ETH/USDT.
                          </Trans>
                        </TooltipText>
                      </TooltipContent>
                    )}
                  />
                </th>
                <th>
                  <StandardTooltip
                    handle={t`VI SWAPS`}
                    variant="iconStroke"
                    position="bottom-end"
                    renderContent={() => (
                      <TooltipContent>
                        <TooltipText>
                          <Trans>Virtual inventory for swaps (long / short)</Trans>
                        </TooltipText>
                        <TooltipText>
                          <Trans>
                            Virtual inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC,
                            ETH/USDT.
                          </Trans>
                        </TooltipText>
                      </TooltipContent>
                    )}
                  />
                </th>
                <th>
                  <Trans>POSITION IMPACT POOL</Trans>
                </th>
                <th>
                  <Trans>CONFIG</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => {
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

                const borrowingRateLong = getBorrowingFactorPerPeriod(market, true, BigInt(60 * 60 * 100));
                const borrowingRateShort = getBorrowingFactorPerPeriod(market, false, BigInt(60 * 60 * 100));

                const fundingAprLong = getFundingFactorPerPeriod(market, true, BigInt(CHART_PERIODS["1h"])) * 100n;
                const fundingAprShort = getFundingFactorPerPeriod(market, false, BigInt(CHART_PERIODS["1h"])) * 100n;

                const marketKinkModelBorrowingData = kinkMarketsBorrowingRatesData[market.marketTokenAddress];

                function renderMarketCell() {
                  return (
                    <div className="cell">
                      <div>
                        <StandardTooltip
                          handle={getMarketIndexName(market)}
                          renderContent={() => (
                            <TooltipRows>
                              <TooltipRow
                                label={t`Key`}
                                value={<div className="debug-key">{market.marketTokenAddress}</div>}
                                valueClassName="min-w-0 !shrink !whitespace-normal"
                              />
                              <TooltipRow
                                label={t`Virtual market ID`}
                                value={
                                  <div className="debug-key">
                                    {market.virtualMarketId !== zeroHash ? market.virtualMarketId : "-"}
                                  </div>
                                }
                                valueClassName="min-w-0 !shrink !whitespace-normal"
                              />
                              <TooltipRow
                                label={t`Virtual long token ID`}
                                value={
                                  <div className="debug-key">
                                    {market.virtualLongTokenId !== zeroHash ? market.virtualLongTokenId : "-"}
                                  </div>
                                }
                                valueClassName="min-w-0 !shrink !whitespace-normal"
                              />
                              <TooltipRow
                                label={t`Virtual short token ID`}
                                value={
                                  <div className="debug-key">
                                    {market.virtualShortTokenId !== zeroHash ? market.virtualShortTokenId : "-"}
                                  </div>
                                }
                                valueClassName="min-w-0 !shrink !whitespace-normal"
                              />
                            </TooltipRows>
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
                      <StandardTooltip
                        handle={formatAmountHuman(market.poolValueMax, 30, true)}
                        renderContent={() => (
                          <TooltipRows>
                            <TooltipRow
                              label={t`Pool USD long`}
                              value={<Usd>{formatAmount(longPoolUsd, 30, 2, true)}</Usd>}
                            />
                            <TooltipRow
                              label={t`Pool USD short`}
                              value={<Usd>{formatAmount(shortPoolUsd, 30, 2, true)}</Usd>}
                            />

                            <TooltipRow
                              label={t`Pool long amount`}
                              value={formatAmount(market.longPoolAmount, market.longToken.decimals, 0, true)}
                            />
                            <TooltipRow
                              label={t`Pool short amount`}
                              value={formatAmount(market.shortPoolAmount, market.shortToken.decimals, 0, true)}
                            />

                            <TooltipRow
                              label={t`Pool max long amount`}
                              value={formatAmount(market.maxLongPoolAmount, market.longToken.decimals, 0, true)}
                            />
                            <TooltipRow
                              label={t`Pool max short amount`}
                              value={formatAmount(market.maxShortPoolAmount, market.shortToken.decimals, 0, true)}
                            />

                            <TooltipRow
                              label={t`Pool max long USD for deposit`}
                              value={formatUsd(market.maxLongPoolUsdForDeposit)}
                            />
                            <TooltipRow
                              label={t`Pool max short USD for deposit`}
                              value={formatUsd(market.maxShortPoolUsdForDeposit)}
                            />

                            <TooltipRow
                              label={t`Swap impact amount ${market.longToken.symbol}`}
                              value={<Usd>{formatAmount(swapImpactUsdLong, 30, 0, true)}</Usd>}
                            />
                            <TooltipRow
                              label={t`Swap impact amount ${market.shortToken.symbol}`}
                              value={<Usd>{formatAmount(swapImpactUsdShort, 30, 0, true)}</Usd>}
                            />
                            <TooltipRow
                              label={t`Position impact amount`}
                              value={<Usd>{formatAmount(positionImpactUsd, 30, 0, true)}</Usd>}
                            />
                          </TooltipRows>
                        )}
                      />
                    </div>
                  );
                }

                function renderPoolBalanceCell() {
                  return (
                    <div className="cell">
                      <div>
                        <StandardTooltip
                          handle={`${formatAmountHuman(longPoolUsd, 30, true)} / ${formatAmountHuman(shortPoolUsd, 30, true)}`}
                          renderContent={() => {
                            return (
                              <TooltipRows>
                                <TooltipRow
                                  label={t`Pool USD long`}
                                  value={<Usd>{formatAmount(longPoolUsd, 30, 2, true)}</Usd>}
                                />
                                <TooltipRow
                                  label={t`Pool USD short`}
                                  value={<Usd>{formatAmount(shortPoolUsd, 30, 2, true)}</Usd>}
                                />

                                <TooltipRow
                                  label={t`Pool long amount`}
                                  value={formatAmount(market.longPoolAmount, market.longToken.decimals, 0, true)}
                                />
                                <TooltipRow
                                  label={t`Pool short amount`}
                                  value={formatAmount(market.shortPoolAmount, market.shortToken.decimals, 0, true)}
                                />
                              </TooltipRows>
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
                  const maxPoolUsdForSwap = getMaxPoolUsdForSwap(market, isLong);
                  const maxPoolUsdForDeposit = isLong
                    ? market.maxLongPoolUsdForDeposit
                    : market.maxShortPoolUsdForDeposit;
                  const maxPoolAmount = isLong ? market.maxLongPoolAmount : market.maxShortPoolAmount;
                  const maxPoolUsd = getStrictestMaxPoolUsdForDeposit(market, isLong);
                  const token = isLong ? market.longToken : market.shortToken;
                  const poolUsd = convertToUsd(poolAmount, token.decimals, getMidPrice(token.prices));

                  return (
                    <StandardTooltip
                      handle={
                        <div className="cell">
                          {formatAmountHuman(poolAmount, token.decimals)} {token.symbol} / {formatUsd(maxPoolUsd)}{" "}
                          <ShareBar share={poolUsd} total={maxPoolUsd} warningThreshold={90} />
                        </div>
                      }
                      renderContent={() => (
                        <TooltipRows>
                          <TooltipRow
                            label={t`Pool amount capacity`}
                            value={`${formatAmountHuman(poolAmount, token.decimals)} ${token.symbol} / ${formatAmountHuman(maxPoolAmount, token.decimals)} ${token.symbol}`}
                          />
                          <TooltipRow
                            label={t`Pool USD capacity (swap)`}
                            value={`${formatUsd(poolUsd)} / ${formatUsd(maxPoolUsdForSwap)}`}
                          />
                          <TooltipRow
                            label={t`Deposit USD capacity`}
                            value={`${formatUsd(poolUsd)} / ${formatUsd(maxPoolUsdForDeposit)}`}
                          />
                          <TooltipRow
                            label={t`Strictest deposit USD capacity`}
                            value={`${formatUsd(poolUsd)} / ${formatUsd(maxPoolUsd)}`}
                          />
                        </TooltipRows>
                      )}
                    />
                  );
                }

                function renderBorrowingRateCell() {
                  const maxBorrowingRateLong =
                    longPoolUsd! > 0
                      ? bigMath.mulDiv(
                          pow(maxLiquidityLong, market.borrowingExponentFactorLong),
                          market.borrowingFactorLong,
                          longPoolUsd!
                        ) *
                        (3600n * 100n)
                      : undefined;
                  const maxBorrowingRateShort =
                    shortPoolUsd! > 0
                      ? bigMath.mulDiv(
                          pow(maxLiquidityShort, market.borrowingExponentFactorShort),
                          market.borrowingFactorShort,
                          shortPoolUsd!
                        ) *
                        (3600n * 100n)
                      : undefined;

                  return (
                    <div className="cell">
                      {market.isSpotOnly ? (
                        "..."
                      ) : (
                        <StandardTooltip
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
                          renderContent={() =>
                            marketKinkModelBorrowingData ? (
                              <TooltipRows>
                                <TooltipRow
                                  label={t`Pending borrowing fee`}
                                  value={<Usd>{formatAmountHuman(market.totalBorrowingFees, 30)}</Usd>}
                                />
                                <TooltipRow
                                  label={t`Optimal usage factor long`}
                                  value={`${formatFactor(marketKinkModelBorrowingData.optimalUsageFactorLong * FACTOR_TO_PERCENT_MULTIPLIER_BIGINT)}%`}
                                />
                                <TooltipRow
                                  label={t`Optimal usage factor short`}
                                  value={`${formatFactor(marketKinkModelBorrowingData.optimalUsageFactorShort * FACTOR_TO_PERCENT_MULTIPLIER_BIGINT)}%`}
                                />
                                <TooltipRow
                                  label={t`Base borrowing factor long`}
                                  value={formatAmount(marketKinkModelBorrowingData.baseBorrowingFactorLong, 30, 11)}
                                />
                                <TooltipRow
                                  label={t`Base borrowing factor short`}
                                  value={formatAmount(marketKinkModelBorrowingData.baseBorrowingFactorShort, 30, 11)}
                                />
                                <TooltipRow
                                  label={t`Max rate long`}
                                  value={
                                    marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorLong
                                      ? `-${formatAmount(marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorLong * 3600n * 100n, 30, 5)}% / 1h`
                                      : "N/A"
                                  }
                                />
                                <TooltipRow
                                  label={t`Max rate short`}
                                  value={
                                    marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorShort
                                      ? `-${formatAmount(marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorShort * 3600n * 100n, 30, 5)}% / 1h`
                                      : "N/A"
                                  }
                                />
                              </TooltipRows>
                            ) : (
                              <TooltipRows>
                                <TooltipRow
                                  label={t`Pending borrowing fee`}
                                  value={<Usd>{formatAmountHuman(market.totalBorrowingFees, 30)}</Usd>}
                                />
                                <TooltipRow
                                  label={t`Borrowing factor long`}
                                  value={formatFactor(market.borrowingFactorLong)}
                                />
                                <TooltipRow
                                  label={t`Borrowing factor short`}
                                  value={formatFactor(market.borrowingFactorShort)}
                                />
                                <TooltipRow
                                  label={t`Borrowing exponent long`}
                                  value={formatFactor(market.borrowingExponentFactorLong)}
                                />
                                <TooltipRow
                                  label={t`Borrowing exponent short`}
                                  value={formatFactor(market.borrowingExponentFactorShort)}
                                />
                                <TooltipRow
                                  label={t`Max rate long`}
                                  value={
                                    maxBorrowingRateLong ? `-${formatAmount(maxBorrowingRateLong, 30, 4)}% / 1h` : "N/A"
                                  }
                                />
                                <TooltipRow
                                  label={t`Max rate short`}
                                  value={
                                    maxBorrowingRateShort
                                      ? `-${formatAmount(maxBorrowingRateShort, 30, 4)}% / 1h`
                                      : "N/A"
                                  }
                                />
                              </TooltipRows>
                            )
                          }
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
                        <StandardTooltip
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
                              <TooltipRows>
                                <TooltipRow
                                  label={t`Funding increase factor`}
                                  value={formatFactor(market.fundingIncreaseFactorPerSecond)}
                                />
                                <TooltipRow
                                  label={t`Funding decrease factor`}
                                  value={formatFactor(market.fundingDecreaseFactorPerSecond)}
                                />
                                <TooltipRow
                                  label={t`Max funding factor (long)`}
                                  value={formatFactor(market.maxFundingFactorPerSecondLong)}
                                />
                                <TooltipRow
                                  label={t`Max funding factor (short)`}
                                  value={formatFactor(market.maxFundingFactorPerSecondShort)}
                                />
                                <TooltipRow
                                  label={t`Min funding factor (long)`}
                                  value={formatFactor(market.minFundingFactorPerSecondLong)}
                                />
                                <TooltipRow
                                  label={t`Min funding factor (short)`}
                                  value={formatFactor(market.minFundingFactorPerSecondShort)}
                                />
                                <TooltipRow
                                  label={t`Threshold for stable funding`}
                                  value={formatFactor(market.thresholdForStableFunding)}
                                />
                                <TooltipRow
                                  label={t`Threshold for decrease funding`}
                                  value={formatFactor(market.thresholdForDecreaseFunding)}
                                />
                              </TooltipRows>
                            ) : (
                              <TooltipRows>
                                <TooltipRow
                                  label={t`Funding factor`}
                                  value={formatAmount(market.fundingFactor, 30, 2)}
                                />
                                <TooltipRow
                                  label={t`Funding exponent factor`}
                                  value={formatAmount(market.fundingExponentFactor, 30, 14)}
                                />
                              </TooltipRows>
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
                  const longOIUsd = getOpenInterestForBalance(market, true);
                  const shortOIUsd = getOpenInterestForBalance(market, false);
                  const totalOIUsd = longOIUsd + shortOIUsd;
                  return (
                    <div className="cell">
                      <div>
                        <StandardTooltip
                          handle={`${formatAmountHuman(longOIUsd, 30, true)} / ${formatAmountHuman(shortOIUsd, 30, true)}`}
                          renderContent={() => (
                            <TooltipRows>
                              <TooltipRow label={t`Total`} value={<Usd>{formatAmount(totalOIUsd, 30, 0, true)}</Usd>} />
                              <TooltipRow label={t`Long`} value={<Usd>{formatAmount(longOIUsd, 30, 0, true)}</Usd>} />
                              <TooltipRow label={t`Short`} value={<Usd>{formatAmount(shortOIUsd, 30, 0, true)}</Usd>} />
                              <TooltipRow
                                label={t`Percentage`}
                                value={(() => {
                                  let longInterestPercent = "0";
                                  let shortInterestPercent = "0";
                                  if (totalOIUsd !== 0n) {
                                    longInterestPercent = formatAmount(
                                      bigMath.mulDiv(longOIUsd, 10000n, totalOIUsd),
                                      2,
                                      2
                                    );
                                    shortInterestPercent = formatAmount(
                                      bigMath.mulDiv(shortOIUsd, 10000n, totalOIUsd),
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
                              <TooltipRow
                                label={t`Difference`}
                                value={<Usd>{formatAmount(bigMath.abs(shortOIUsd - longOIUsd), 30, 0, true)}</Usd>}
                              />
                            </TooltipRows>
                          )}
                        />
                      </div>
                      <ShareBar className="balance" share={longOIUsd} total={totalOIUsd} />
                    </div>
                  );
                }

                function renderLiquidityCell(isLong: boolean) {
                  const jitInfo = getJitLiquidityInfo(jitLiquidityMap, market.marketTokenAddress);
                  const maxReservedWithJit = isLong
                    ? jitInfo?.maxReservedUsdWithJitLong
                    : jitInfo?.maxReservedUsdWithJitShort;

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
                        getOpenInterestUsd(market, true),
                        maxOpenInterestLong,
                        market.longToken,
                      ]
                    : [
                        shortCollateralLiquidityUsd,
                        liquidityShort,
                        maxLiquidityShort,
                        reservedUsdShort,
                        maxReservedUsdShort,
                        getOpenInterestUsd(market, false),
                        maxOpenInterestShort,
                        market.shortToken,
                      ];

                  const directionLabel = isLong ? t`Long` : t`Short`;
                  let availableLiquidity = maxLiquidity - liquidity;
                  if (availableLiquidity < 0) {
                    availableLiquidity = 0n;
                  }

                  return (
                    <div className="cell">
                      <div>
                        <StandardTooltip
                          handle={
                            market.isSpotOnly ? (
                              formatAmountHuman(collateralLiquidityUsd, 30, true)
                            ) : (
                              <span>
                                {formatAmountHuman(liquidity, 30, true)} / {formatAmountHuman(maxLiquidity, 30, true)}
                              </span>
                            )
                          }
                          renderContent={() => (
                            <TooltipRows>
                              <TooltipRow
                                label={t`Reserved ${directionLabel}`}
                                value={<Usd>{formatAmount(reservedUsd, 30, 0, true)}</Usd>}
                              />
                              <TooltipRow
                                label={t`Max reserved ${directionLabel}`}
                                value={<Usd>{formatAmount(maxReservedUsd, 30, 0, true)}</Usd>}
                              />
                              {maxReservedWithJit !== undefined && (
                                <TooltipRow
                                  label={t`Max reserved + JIT ${directionLabel}`}
                                  value={<Usd>{formatAmount(maxReservedWithJit, 30, 0, true)}</Usd>}
                                />
                              )}
                              <TooltipRow
                                label={t`Open interest ${directionLabel}`}
                                value={<Usd>{formatAmount(interestUsd, 30, 0, true)}</Usd>}
                              />
                              <TooltipRow
                                label={t`Max open interest ${directionLabel}`}
                                value={<Usd>{formatAmount(maxOpenInterest, 30, 0, true)}</Usd>}
                              />
                              <TooltipRow
                                label={t`Max ${token.symbol} out`}
                                value={<Usd>{formatAmount(collateralLiquidityUsd, 30, 0, true)}</Usd>}
                              />
                              <TooltipRow
                                label={t`Available liquidity ${directionLabel}`}
                                value={<Usd>{formatAmount(availableLiquidity, 30, 0, true)}</Usd>}
                              />
                            </TooltipRows>
                          )}
                        />
                      </div>
                      <ShareBar share={liquidity} total={maxLiquidity} warningThreshold={90} />
                    </div>
                  );
                }

                function renderPositionImpactCell() {
                  const summaryPoolUsd = market.poolValueMax;

                  const bonusApr =
                    summaryPoolUsd > 0n
                      ? bigMath.mulDiv(
                          market.positionImpactPoolDistributionRate * 86400n * 365n,
                          market.indexToken.prices.minPrice,
                          summaryPoolUsd
                        ) * 100n
                      : undefined;

                  const { priceImpactDeltaUsd: reservedPositivePriceImpactUsd } = getPriceImpactUsd({
                    currentLongUsd: market.longInterestUsd - market.shortInterestUsd,
                    currentShortUsd: 0n,
                    nextLongUsd: 0n,
                    nextShortUsd: 0n,
                    factorNegative: market.positionImpactFactorNegative,
                    factorPositive: market.positionImpactFactorPositive,
                    exponentFactorPositive: market.positionImpactExponentFactorPositive,
                    exponentFactorNegative: market.positionImpactExponentFactorNegative,
                  });

                  const reservedPositivePriceImpact = bigMath.mulDiv(
                    reservedPositivePriceImpactUsd,
                    expandDecimals(1, market.indexToken.decimals),
                    market.indexToken.prices.maxPrice
                  );

                  return (
                    <div className="cell">
                      <StandardTooltip
                        handle={`$\u200a${formatAmount(positionImpactUsd, 30, 2, true)}`}
                        position="bottom-end"
                        renderContent={() => (
                          <TooltipRows>
                            <TooltipRow
                              label={t`Impact pool amount`}
                              value={formatAmount(market.positionImpactPoolAmount, market.indexToken.decimals, 2, true)}
                            />
                            <TooltipRow
                              label={t`Min impact pool amount`}
                              value={formatAmount(market.minPositionImpactPoolAmount, market.indexToken.decimals, 4)}
                            />
                            <TooltipRow
                              label={t`Impact pool after reserved positive impact`}
                              value={formatAmount(
                                market.positionImpactPoolAmount - reservedPositivePriceImpact,
                                market.indexToken.decimals,
                                2,
                                true
                              )}
                            />
                            <TooltipRow
                              label={t`Distribution rate, ${market.indexToken.symbol}`}
                              value={formatAmount(
                                market.positionImpactPoolDistributionRate,
                                market.indexToken.decimals + 30,
                                10
                              )}
                            />
                            <TooltipRow
                              label={t`Distribution rate per day, USD`}
                              value={
                                <Usd>
                                  {formatAmount(
                                    bigMath.mulDiv(
                                      market.positionImpactPoolDistributionRate * 86400n,
                                      market.indexToken.prices.minPrice,
                                      expandDecimals(1, 60)
                                    ),
                                    market.indexToken.decimals,
                                    2,
                                    true
                                  )}
                                </Usd>
                              }
                            />
                            <TooltipRow
                              label={t`Bonus APR`}
                              value={`${formatAmount(bonusApr, market.indexToken.decimals + 30, 2, true)}%`}
                            />
                            <TooltipRow
                              label={t`Negative impact factor`}
                              value={formatFactor(market.positionImpactFactorNegative)}
                            />
                            <TooltipRow
                              label={t`Positive impact factor`}
                              value={formatFactor(market.positionImpactFactorPositive)}
                            />
                            <TooltipRow
                              label={t`Impact exponent (positive)`}
                              value={formatFactor(market.positionImpactExponentFactorPositive)}
                            />
                            <TooltipRow
                              label={t`Impact exponent (negative)`}
                              value={formatFactor(market.positionImpactExponentFactorNegative)}
                            />
                            <TooltipRow
                              label={t`Reserved positive impact`}
                              value={formatAmount(reservedPositivePriceImpact, market.indexToken.decimals, 4, true)}
                            />
                          </TooltipRows>
                        )}
                      />
                    </div>
                  );
                }

                const netPnlMax = getMarketNetPnl(market, true);
                const longPnlMax = getMarketPnl(market, true, true);
                const shortPnlMax = getMarketPnl(market, false, true);

                const cappedLongPnlMax = getCappedPoolPnl({
                  marketInfo: market,
                  poolUsd: getPoolUsdWithoutPnl(market, true, "maxPrice"),
                  poolPnl: longPnlMax,
                  isLong: true,
                });

                const cappedShortPnlMax = getCappedPoolPnl({
                  marketInfo: market,
                  poolUsd: getPoolUsdWithoutPnl(market, false, "maxPrice"),
                  poolPnl: shortPnlMax,
                  isLong: false,
                });

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
                          <StandardTooltip
                            handle={
                              <span className={cx({ positive: netPnlMax > 0, negative: netPnlMax < 0 })}>
                                {getPlusOrMinusSymbol(netPnlMax)}${formatAmountHuman(bigMath.abs(netPnlMax), 30)}
                              </span>
                            }
                            renderContent={() => (
                              <TooltipRows>
                                <TooltipRow
                                  label={t`PnL long`}
                                  valueClassName={getPositiveOrNegativeClass(cappedLongPnlMax)}
                                  value={`${getPlusOrMinusSymbol(cappedLongPnlMax)}${formatAmountHuman(
                                    bigMath.abs(cappedLongPnlMax),
                                    30,
                                    true
                                  )}`}
                                />
                                <TooltipRow
                                  label={t`PnL short`}
                                  valueClassName={getPositiveOrNegativeClass(shortPnlMax)}
                                  value={`${getPlusOrMinusSymbol(cappedShortPnlMax)}${formatAmountHuman(
                                    bigMath.abs(cappedShortPnlMax),
                                    30,
                                    true
                                  )}`}
                                />
                              </TooltipRows>
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
                          <StandardTooltip
                            position="bottom-end"
                            handle={
                              <>
                                <div>
                                  {virtualInventoryPositions > 0 ? t`Short` : t`Long`}{" "}
                                  {formatAmountHuman(bigMath.abs(virtualInventoryPositions), 30) || "$0.00"}
                                </div>
                              </>
                            }
                            renderContent={() => {
                              return (
                                <TooltipRows>
                                  <TooltipRow
                                    label={virtualInventoryPositions > 0 ? t`Short` : t`Long`}
                                    value={formatUsd(bigMath.abs(virtualInventoryPositions)) || "$0.00"}
                                  />
                                </TooltipRows>
                              );
                            }}
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="cell">
                        <StandardTooltip
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
                              <TooltipRows>
                                <TooltipRow
                                  label={t`Long`}
                                  value={formatUsd(
                                    convertToUsd(virtualInventorySwapsLong, market.longToken.decimals, midLongPrice)
                                  )}
                                />
                                <TooltipRow
                                  label={t`Short`}
                                  value={formatUsd(
                                    convertToUsd(virtualInventorySwapsShort, market.shortToken.decimals, midShortPrice)
                                  )}
                                />
                              </TooltipRows>
                            );
                          }}
                        />
                      </div>
                    </td>
                    <td>{renderPositionImpactCell()}</td>
                    <td>
                      <div className="cell">
                        <StandardTooltip
                          position="bottom-end"
                          handle="..."
                          renderContent={() => (
                            <div
                              className="max-h-[min(80vh,calc(var(--tooltip-available-height,80vh)-28px))] overflow-y-auto overscroll-contain"
                              onWheel={(e) => {
                                e.stopPropagation();
                              }}
                              onTouchMove={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <TooltipContent>
                                <TooltipRows>
                                  <TooltipTitle>
                                    <Trans>Position impact</Trans>
                                  </TooltipTitle>
                                  <TooltipRow
                                    label={t`Exponent (positive)`}
                                    value={formatFactor(market.positionImpactExponentFactorPositive)}
                                  />
                                  <TooltipRow
                                    label={t`Exponent (negative)`}
                                    value={formatFactor(market.positionImpactExponentFactorNegative)}
                                  />
                                  <TooltipRow
                                    label={t`Positive factor`}
                                    value={formatFactor(market.positionImpactFactorPositive)}
                                  />
                                  <TooltipRow
                                    label={t`Negative factor`}
                                    value={formatFactor(market.positionImpactFactorNegative)}
                                  />
                                  <TooltipRow
                                    label={t`Max positive factor`}
                                    value={formatFactor(market.maxPositionImpactFactorPositive)}
                                  />
                                  <TooltipRow
                                    label={t`Max negative factor`}
                                    value={formatFactor(market.maxPositionImpactFactorNegative)}
                                  />
                                  <TooltipRow
                                    label={t`Max factor for liquidations`}
                                    value={formatFactor(market.maxPositionImpactFactorForLiquidations)}
                                  />
                                  <TooltipRow
                                    label={t`Max lendable impact factor`}
                                    value={formatFactor(market.maxLendableImpactFactor)}
                                  />
                                  <TooltipRow
                                    label={t`Max lendable impact factor for withdrawals`}
                                    value={formatFactor(market.maxLendableImpactFactorForWithdrawals)}
                                  />
                                  <TooltipRow
                                    label={t`Max lendable impact USD`}
                                    value={formatUsd(market.maxLendableImpactUsd)}
                                  />
                                  <TooltipRow
                                    label={t`Lent position impact pool amount`}
                                    value={formatUsd(market.lentPositionImpactPoolAmount)}
                                  />
                                </TooltipRows>
                                <TooltipDivider />
                                <TooltipRows>
                                  <TooltipTitle>
                                    <Trans>Swap impact</Trans>
                                  </TooltipTitle>
                                  <TooltipRow
                                    label={t`Swap impact exponent`}
                                    value={formatFactor(market.swapImpactExponentFactor)}
                                  />
                                  <TooltipRow
                                    label={t`Positive factor`}
                                    value={formatFactor(market.swapImpactFactorPositive)}
                                  />
                                  <TooltipRow
                                    label={t`Negative factor`}
                                    value={formatFactor(market.swapImpactFactorNegative)}
                                  />
                                </TooltipRows>
                                <TooltipDivider />
                                <TooltipRows>
                                  <TooltipTitle>
                                    <Trans>Fee factors</Trans>
                                  </TooltipTitle>
                                  <TooltipRow
                                    label={t`Swap fee factor (positive PI)`}
                                    value={formatFactor(market.swapFeeFactorForBalanceWasImproved)}
                                  />
                                  <TooltipRow
                                    label={t`Swap fee factor (negative PI)`}
                                    value={formatFactor(market.swapFeeFactorForBalanceWasNotImproved)}
                                  />
                                  <TooltipRow
                                    label={t`Position fee factor (positive PI)`}
                                    value={formatFactor(market.positionFeeFactorForBalanceWasImproved)}
                                  />
                                  <TooltipRow
                                    label={t`Position fee factor (negative PI)`}
                                    value={formatFactor(market.positionFeeFactorForBalanceWasNotImproved)}
                                  />
                                  <TooltipRow
                                    label={t`Borrowing factor long`}
                                    value={formatFactor(market.borrowingFactorLong)}
                                  />
                                  <TooltipRow
                                    label={t`Borrowing factor short`}
                                    value={formatFactor(market.borrowingFactorShort)}
                                  />
                                  <TooltipRow
                                    label={t`Borrowing exponent long`}
                                    value={formatFactor(market.borrowingExponentFactorLong)}
                                  />
                                  <TooltipRow
                                    label={t`Borrowing exponent short`}
                                    value={formatFactor(market.borrowingExponentFactorShort)}
                                  />
                                  <TooltipRow label={t`Funding factor`} value={formatFactor(market.fundingFactor)} />
                                  <TooltipRow
                                    label={t`Funding exponent`}
                                    value={formatFactor(market.fundingExponentFactor)}
                                  />
                                </TooltipRows>
                                <TooltipDivider />
                                <TooltipRows>
                                  <TooltipTitle>
                                    <Trans>Other</Trans>
                                  </TooltipTitle>
                                  <TooltipRow label={t`Min collateral`} value={formatUsd(minCollateralUsd)} />
                                  <TooltipRow
                                    label={t`Min position size`}
                                    value={formatUsd(minPositionSizeUsd) || "..."}
                                  />
                                  <TooltipRow
                                    label={t`Min collateral factor`}
                                    value={formatFactor(market.minCollateralFactor)}
                                  />
                                  <TooltipRow
                                    label={t`Min collateral factor for liquidation`}
                                    value={formatFactor(market.minCollateralFactorForLiquidation)}
                                  />
                                  <TooltipRow
                                    label={t`Min collateral factor OI long`}
                                    value={formatFactor(market.minCollateralFactorForOpenInterestLong)}
                                  />
                                  <TooltipRow
                                    label={t`Min collateral factor OI short`}
                                    value={formatFactor(market.minCollateralFactorForOpenInterestShort)}
                                  />
                                  <TooltipRow
                                    label={t`Max leverage`}
                                    value={
                                      market.minCollateralFactor > 0
                                        ? formatAmount((PRECISION / market.minCollateralFactor) * 100n, 2, 2)
                                        : "..."
                                    }
                                  />
                                  <TooltipRow
                                    label={t`Reserve factor longs`}
                                    value={formatFactor(market.reserveFactorLong)}
                                  />
                                  <TooltipRow
                                    label={t`Reserve factor shorts`}
                                    value={formatFactor(market.reserveFactorShort)}
                                  />
                                  <TooltipRow
                                    label={t`Open interest reserve factor longs`}
                                    value={formatFactor(market.openInterestReserveFactorLong)}
                                  />
                                  <TooltipRow
                                    label={t`Open interest reserve factor shorts`}
                                    value={formatFactor(market.openInterestReserveFactorShort)}
                                  />
                                </TooltipRows>
                                <TooltipDivider />
                                <TooltipRows>
                                  <TooltipRow
                                    label={t`Claimable collateral delay`}
                                    value={claimableCollateralDelay?.toString() || "..."}
                                  />
                                  <TooltipRow
                                    label={t`Claimable collateral reduction factor`}
                                    value={formatFactor(claimableCollateralReductionFactor ?? 0n)}
                                  />
                                  <TooltipRow
                                    label={t`Use open interest in tokens for balance`}
                                    value={market.useOpenInterestInTokensForBalance ? t`True` : t`False`}
                                  />
                                </TooltipRows>
                              </TooltipContent>
                            </div>
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
    </AppPageLayout>
  );
}
