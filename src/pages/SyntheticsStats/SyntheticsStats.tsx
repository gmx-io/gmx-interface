import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { format } from "date-fns";
import { zeroAddress, zeroHash } from "viem";

import { FACTOR_TO_PERCENT_MULTIPLIER_BIGINT } from "config/factors";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod, getPriceImpactUsd } from "domain/synthetics/fees";
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
import { expandDecimals, formatAmount, formatFactor, formatUsd, getPlusOrMinusSymbol, PRECISION } from "lib/numbers";
import { formatAmountHuman } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { bigMath } from "sdk/utils/bigmath";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { DownloadAsCsv } from "components/DownloadAsCsv/DownloadAsCsv";
import { ShareBar } from "components/ShareBar/ShareBar";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./SyntheticsStats.scss";

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
    <AppPageLayout>
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
                  <TooltipWithPortal handle={t`PNL`} renderContent={() => t`Pending PnL from all open positions`} />
                </th>
                <th>
                  <TooltipWithPortal
                    handle={t`BORROWING FEES`}
                    renderContent={() => t`Pending borrowing fees from all open positions`}
                  />
                </th>
                <th>
                  <TooltipWithPortal
                    handle={t`FUNDING APR`}
                    renderContent={() => (
                      <div>
                        <Trans>Longs / shorts</Trans>
                        <br />
                        <br />
                        <Trans>Per 1h</Trans>
                        <br />
                        <br />
                        <Trans>Negative value: traders pay funding</Trans>
                        <br />
                        <br />
                        <Trans>Positive value: traders receive funding</Trans>
                      </div>
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
                  <TooltipWithPortal
                    handle={t`VI POSITIONS`}
                    position="bottom-end"
                    renderContent={() => (
                      <>
                        <p>
                          <Trans>Virtual inventory for positions</Trans>
                        </p>
                        <p>
                          <Trans>
                            Virtual Inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC,
                            ETH/USDT.
                          </Trans>
                        </p>
                      </>
                    )}
                  />
                </th>
                <th>
                  <TooltipWithPortal
                    handle={t`VI SWAPS`}
                    position="bottom-end"
                    renderContent={() => (
                      <>
                        <p>
                          <Trans>Virtual inventory for swaps (long / short)</Trans>
                        </p>
                        <p>
                          <Trans>
                            Virtual Inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC,
                            ETH/USDT.
                          </Trans>
                        </p>
                      </>
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
                        <TooltipWithPortal
                          tooltipClassName="SyntheticsStats-tooltip"
                          handle={getMarketIndexName(market)}
                          renderContent={() => (
                            <>
                              <StatsTooltipRow label={t`Key`} value={market.marketTokenAddress} showDollar={false} />
                              <br />
                              <StatsTooltipRow
                                label={t`Virtual market ID`}
                                value={
                                  <div className="debug-key">
                                    {market.virtualMarketId !== zeroHash ? market.virtualMarketId : "-"}
                                  </div>
                                }
                                showDollar={false}
                              />
                              <br />
                              <StatsTooltipRow
                                label={t`Virtual long token ID`}
                                value={
                                  <div className="debug-key">
                                    {market.virtualLongTokenId !== zeroHash ? market.virtualLongTokenId : "-"}
                                  </div>
                                }
                                showDollar={false}
                              />
                              <br />
                              <StatsTooltipRow
                                label={t`Virtual short token ID`}
                                value={
                                  <div className="debug-key">
                                    {market.virtualShortTokenId !== zeroHash ? market.virtualShortTokenId : "-"}
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
                        handle={formatAmountHuman(market.poolValueMax, 30, true)}
                        renderContent={() => (
                          <>
                            <StatsTooltipRow label={t`Pool USD long`} value={formatAmount(longPoolUsd, 30, 2, true)} />
                            <StatsTooltipRow
                              label={t`Pool USD short`}
                              value={formatAmount(shortPoolUsd, 30, 2, true)}
                            />

                            <StatsTooltipRow
                              label={t`Pool long amount`}
                              value={formatAmount(market.longPoolAmount, market.longToken.decimals, 0, true)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Pool short amount`}
                              value={formatAmount(market.shortPoolAmount, market.shortToken.decimals, 0, true)}
                              showDollar={false}
                            />

                            <StatsTooltipRow
                              label={t`Pool max long amount`}
                              value={formatAmount(market.maxLongPoolAmount, market.longToken.decimals, 0, true)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Pool max short amount`}
                              value={formatAmount(market.maxShortPoolAmount, market.shortToken.decimals, 0, true)}
                              showDollar={false}
                            />

                            <StatsTooltipRow
                              label={t`Pool max long USD for deposit`}
                              value={formatUsd(market.maxLongPoolUsdForDeposit)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Pool max short USD for deposit`}
                              value={formatUsd(market.maxShortPoolUsdForDeposit)}
                              showDollar={false}
                            />

                            <StatsTooltipRow
                              label={t`Swap impact amount ${market.longToken.symbol}`}
                              value={formatAmount(swapImpactUsdLong, 30, 0, true)}
                            />
                            <StatsTooltipRow
                              label={t`Swap impact amount ${market.shortToken.symbol}`}
                              value={formatAmount(swapImpactUsdShort, 30, 0, true)}
                            />
                            <StatsTooltipRow
                              label={t`Position impact amount`}
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
                          handle={`${formatAmountHuman(longPoolUsd, 30, true)} / ${formatAmountHuman(shortPoolUsd, 30, true)}`}
                          renderContent={() => {
                            return (
                              <>
                                <StatsTooltipRow
                                  label={t`Pool USD long`}
                                  value={formatAmount(longPoolUsd, 30, 2, true)}
                                />
                                <StatsTooltipRow
                                  label={t`Pool USD short`}
                                  value={formatAmount(shortPoolUsd, 30, 2, true)}
                                />

                                <StatsTooltipRow
                                  label={t`Pool long amount`}
                                  value={formatAmount(market.longPoolAmount, market.longToken.decimals, 0, true)}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Pool short amount`}
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
                  const maxPoolUsdForSwap = getMaxPoolUsdForSwap(market, isLong);
                  const maxPoolUsdForDeposit = isLong
                    ? market.maxLongPoolUsdForDeposit
                    : market.maxShortPoolUsdForDeposit;
                  const maxPoolAmount = isLong ? market.maxLongPoolAmount : market.maxShortPoolAmount;
                  const maxPoolUsd = getStrictestMaxPoolUsdForDeposit(market, isLong);
                  const token = isLong ? market.longToken : market.shortToken;
                  const poolUsd = convertToUsd(poolAmount, token.decimals, getMidPrice(token.prices));

                  return (
                    <TooltipWithPortal
                      handle={
                        <div className="cell">
                          {formatAmountHuman(poolAmount, token.decimals, true)} {token.symbol} / {formatUsd(maxPoolUsd)}{" "}
                          <ShareBar share={poolUsd} total={maxPoolUsd} warningThreshold={90} />
                        </div>
                      }
                      renderContent={() => (
                        <>
                          <StatsTooltipRow
                            label={t`Pool amount capacity`}
                            showDollar={false}
                            value={`${formatAmountHuman(poolAmount, token.decimals)} ${token.symbol} / ${formatAmountHuman(maxPoolAmount, token.decimals)} ${token.symbol}`}
                          />
                          <StatsTooltipRow
                            label={t`Pool USD capacity (swap)`}
                            showDollar={false}
                            value={`${formatUsd(poolUsd)} / ${formatUsd(maxPoolUsdForSwap)}`}
                          />
                          <StatsTooltipRow
                            label={t`Deposit USD capacity`}
                            showDollar={false}
                            value={`${formatUsd(poolUsd)} / ${formatUsd(maxPoolUsdForDeposit)}`}
                          />
                          <StatsTooltipRow
                            label={t`Strictest deposit USD capacity`}
                            showDollar={false}
                            value={`${formatUsd(poolUsd)} / ${formatUsd(maxPoolUsd)}`}
                          />
                        </>
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
                              {marketKinkModelBorrowingData ? (
                                <>
                                  <StatsTooltipRow
                                    label={t`Pending borrowing fee`}
                                    value={formatAmountHuman(market.totalBorrowingFees, 30)}
                                  />
                                  <StatsTooltipRow
                                    label={t`Optimal usage factor long`}
                                    value={`${formatFactor(marketKinkModelBorrowingData.optimalUsageFactorLong * FACTOR_TO_PERCENT_MULTIPLIER_BIGINT)}%`}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Optimal usage factor short`}
                                    value={`${formatFactor(marketKinkModelBorrowingData.optimalUsageFactorShort * FACTOR_TO_PERCENT_MULTIPLIER_BIGINT)}%`}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Base borrowing factor long`}
                                    value={formatAmount(marketKinkModelBorrowingData.baseBorrowingFactorLong, 30, 11)}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Base borrowing factor short`}
                                    value={formatAmount(marketKinkModelBorrowingData.baseBorrowingFactorShort, 30, 11)}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Max rate long`}
                                    value={
                                      marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorLong
                                        ? `-${formatAmount(marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorLong * 3600n * 100n, 30, 5)}% / 1h`
                                        : "N/A"
                                    }
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Max rate short`}
                                    value={
                                      marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorShort
                                        ? `-${formatAmount(marketKinkModelBorrowingData.aboveOptimalUsageBorrowingFactorShort * 3600n * 100n, 30, 5)}% / 1h`
                                        : "N/A"
                                    }
                                    showDollar={false}
                                  />
                                </>
                              ) : (
                                <>
                                  <StatsTooltipRow
                                    label={t`Pending borrowing fee`}
                                    value={formatAmountHuman(market.totalBorrowingFees, 30)}
                                  />
                                  <StatsTooltipRow
                                    label={t`Borrowing factor long`}
                                    value={formatFactor(market.borrowingFactorLong)}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Borrowing factor short`}
                                    value={formatFactor(market.borrowingFactorShort)}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Borrowing exponent long`}
                                    value={formatFactor(market.borrowingExponentFactorLong)}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Borrowing exponent short`}
                                    value={formatFactor(market.borrowingExponentFactorShort)}
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Max rate long`}
                                    value={
                                      maxBorrowingRateLong
                                        ? `-${formatAmount(maxBorrowingRateLong, 30, 4)}% / 1h`
                                        : "N/A"
                                    }
                                    showDollar={false}
                                  />
                                  <StatsTooltipRow
                                    label={t`Max rate short`}
                                    value={
                                      maxBorrowingRateShort
                                        ? `-${formatAmount(maxBorrowingRateShort, 30, 4)}% / 1h`
                                        : "N/A"
                                    }
                                    showDollar={false}
                                  />
                                </>
                              )}
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
                                  label={t`Funding increase factor`}
                                  value={formatFactor(market.fundingIncreaseFactorPerSecond)}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Funding decrease factor`}
                                  value={formatFactor(market.fundingDecreaseFactorPerSecond)}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Max funding factor`}
                                  value={formatFactor(market.maxFundingFactorPerSecond)}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Min funding factor`}
                                  value={formatFactor(market.minFundingFactorPerSecond)}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Threshold for stable funding`}
                                  value={formatFactor(market.thresholdForStableFunding)}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Threshold for decrease funding`}
                                  value={formatFactor(market.thresholdForDecreaseFunding)}
                                  showDollar={false}
                                />
                              </>
                            ) : (
                              <>
                                <StatsTooltipRow
                                  label={t`Funding factor`}
                                  value={formatAmount(market.fundingFactor, 30, 2)}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Funding exponent factor`}
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
                  const longOIUsd = getOpenInterestForBalance(market, true);
                  const shortOIUsd = getOpenInterestForBalance(market, false);
                  const totalOIUsd = longOIUsd + shortOIUsd;
                  return (
                    <div className="cell">
                      <div>
                        <TooltipWithPortal
                          handle={`${formatAmountHuman(longOIUsd, 30, true)} / ${formatAmountHuman(shortOIUsd, 30, true)}`}
                          renderContent={() => (
                            <>
                              <StatsTooltipRow label={t`Total`} value={formatAmount(totalOIUsd, 30, 0, true)} />
                              <StatsTooltipRow label={t`Long`} value={formatAmount(longOIUsd, 30, 0, true)} />
                              <StatsTooltipRow label={t`Short`} value={formatAmount(shortOIUsd, 30, 0, true)} />
                              <StatsTooltipRow
                                showDollar={false}
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
                              <StatsTooltipRow
                                label={t`Difference`}
                                value={formatAmount(bigMath.abs(shortOIUsd - longOIUsd), 30, 0, true)}
                              />
                            </>
                          )}
                        />
                      </div>
                      <ShareBar className="balance" share={longOIUsd} total={totalOIUsd} />
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
                        <TooltipWithPortal
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
                            <>
                              <StatsTooltipRow
                                label={t`Reserved ${directionLabel}`}
                                value={formatAmount(reservedUsd, 30, 0, true)}
                              />
                              <StatsTooltipRow
                                label={t`Max reserved ${directionLabel}`}
                                value={formatAmount(maxReservedUsd, 30, 0, true)}
                              />
                              <StatsTooltipRow
                                label={t`Open interest ${directionLabel}`}
                                value={formatAmount(interestUsd, 30, 0, true)}
                              />
                              <StatsTooltipRow
                                label={t`Max open interest ${directionLabel}`}
                                value={formatAmount(maxOpenInterest, 30, 0, true)}
                              />
                              <StatsTooltipRow
                                label={t`Max ${token.symbol} out`}
                                value={formatAmount(collateralLiquidityUsd, 30, 0, true)}
                              />
                              <StatsTooltipRow
                                label={t`Available liquidity ${directionLabel}`}
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
                      <TooltipWithPortal
                        handle={`$\u200a${formatAmount(positionImpactUsd, 30, 2, true)}`}
                        position="bottom-end"
                        renderContent={() => (
                          <>
                            <StatsTooltipRow
                              label={t`Impact pool amount`}
                              value={formatAmount(market.positionImpactPoolAmount, market.indexToken.decimals, 2, true)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Min impact pool amount`}
                              value={formatAmount(market.minPositionImpactPoolAmount, market.indexToken.decimals, 4)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Impact pool after reserved positive impact`}
                              value={formatAmount(
                                market.positionImpactPoolAmount - reservedPositivePriceImpact,
                                market.indexToken.decimals,
                                2,
                                true
                              )}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Distribution rate, ${market.indexToken.symbol}`}
                              value={formatAmount(
                                market.positionImpactPoolDistributionRate,
                                market.indexToken.decimals + 30,
                                10
                              )}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Distribution rate per day, USD`}
                              value={formatAmount(
                                bigMath.mulDiv(
                                  market.positionImpactPoolDistributionRate * 86400n,
                                  market.indexToken.prices.minPrice,
                                  expandDecimals(1, 60)
                                ),
                                market.indexToken.decimals,
                                2,
                                true
                              )}
                            />
                            <StatsTooltipRow
                              label={t`Bonus APR`}
                              value={formatAmount(bonusApr, market.indexToken.decimals + 30, 2, true)}
                              showDollar={false}
                              unit="%"
                            />
                            <StatsTooltipRow
                              label={t`Negative impact factor`}
                              value={formatFactor(market.positionImpactFactorNegative)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Positive impact factor`}
                              value={formatFactor(market.positionImpactFactorPositive)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Impact exponent (positive)`}
                              value={formatFactor(market.positionImpactExponentFactorPositive)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Impact exponent (negative)`}
                              value={formatFactor(market.positionImpactExponentFactorNegative)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Reserved positive impact`}
                              value={formatAmount(reservedPositivePriceImpact, market.indexToken.decimals, 4, true)}
                              showDollar={false}
                            />
                          </>
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
                          <TooltipWithPortal
                            handle={
                              <span className={cx({ positive: netPnlMax > 0, negative: netPnlMax < 0 })}>
                                {getPlusOrMinusSymbol(netPnlMax)}${formatAmountHuman(bigMath.abs(netPnlMax), 30)}
                              </span>
                            }
                            renderContent={() => (
                              <>
                                <StatsTooltipRow
                                  showDollar={false}
                                  label={t`PnL long`}
                                  textClassName={getPositiveOrNegativeClass(cappedLongPnlMax)}
                                  value={`${getPlusOrMinusSymbol(cappedLongPnlMax)}${formatAmountHuman(
                                    bigMath.abs(cappedLongPnlMax),
                                    30,
                                    true
                                  )}`}
                                />
                                <StatsTooltipRow
                                  showDollar={false}
                                  label={t`PnL short`}
                                  textClassName={getPositiveOrNegativeClass(shortPnlMax)}
                                  value={`${getPlusOrMinusSymbol(cappedShortPnlMax)}${formatAmountHuman(
                                    bigMath.abs(cappedShortPnlMax),
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
                                  {virtualInventoryPositions > 0 ? t`Short` : t`Long`}{" "}
                                  {formatAmountHuman(bigMath.abs(virtualInventoryPositions), 30) || "$0.00"}
                                </div>
                              </>
                            }
                            renderContent={() => {
                              return (
                                <StatsTooltipRow
                                  label={virtualInventoryPositions > 0 ? t`Short` : t`Long`}
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
                                  label={t`Long`}
                                  value={formatUsd(
                                    convertToUsd(virtualInventorySwapsLong, market.longToken.decimals, midLongPrice)
                                  )}
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`Short`}
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
                          tooltipClassName="MarketCard-config-tooltip"
                          renderContent={() => (
                            <div
                              onWheel={(e) => {
                                e.stopPropagation();
                              }}
                              onTouchMove={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <div>
                                <Trans>Position impact</Trans>
                              </div>
                              <br />
                              <StatsTooltipRow
                                label={t`Exponent (positive)`}
                                value={formatFactor(market.positionImpactExponentFactorPositive)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Exponent (negative)`}
                                value={formatFactor(market.positionImpactExponentFactorNegative)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Positive factor`}
                                value={formatFactor(market.positionImpactFactorPositive)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Negative factor`}
                                value={formatFactor(market.positionImpactFactorNegative)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Max positive factor`}
                                value={formatFactor(market.maxPositionImpactFactorPositive)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Max negative factor`}
                                value={formatFactor(market.maxPositionImpactFactorNegative)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Max factor for liquidations`}
                                value={formatFactor(market.maxPositionImpactFactorForLiquidations)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Max lendable impact factor`}
                                value={formatFactor(market.maxLendableImpactFactor)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Max lendable impact factor for withdrawals`}
                                value={formatFactor(market.maxLendableImpactFactorForWithdrawals)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Max lendable impact USD`}
                                value={formatUsd(market.maxLendableImpactUsd)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Lent position impact pool amount`}
                                value={formatUsd(market.lentPositionImpactPoolAmount)}
                                showDollar={false}
                              />
                              <br />
                              <div className="Tooltip-divider" />
                              <br />
                              <div>
                                <Trans>Swap impact</Trans>
                              </div>
                              <br />
                              <StatsTooltipRow
                                label={t`Swap impact exponent`}
                                value={formatFactor(market.swapImpactExponentFactor)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Positive factor`}
                                value={formatFactor(market.swapImpactFactorPositive)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Negative factor`}
                                value={formatFactor(market.swapImpactFactorNegative)}
                                showDollar={false}
                              />
                              <br />
                              <div className="Tooltip-divider" />
                              <br />
                              <div>
                                <Trans>Fee factors</Trans>
                              </div>
                              <br />

                              <StatsTooltipRow
                                label={t`Swap fee factor (positive PI)`}
                                value={formatFactor(market.swapFeeFactorForBalanceWasImproved)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Swap fee factor (negative PI)`}
                                value={formatFactor(market.swapFeeFactorForBalanceWasNotImproved)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Position fee factor (positive PI)`}
                                value={formatFactor(market.positionFeeFactorForBalanceWasImproved)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Position fee factor (negative PI)`}
                                value={formatFactor(market.positionFeeFactorForBalanceWasNotImproved)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Borrowing factor long`}
                                value={formatFactor(market.borrowingFactorLong)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Borrowing factor short`}
                                value={formatFactor(market.borrowingFactorShort)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Borrowing exponent long`}
                                value={formatFactor(market.borrowingExponentFactorLong)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Borrowing exponent short`}
                                value={formatFactor(market.borrowingExponentFactorShort)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Funding factor`}
                                value={formatFactor(market.fundingFactor)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Funding exponent`}
                                value={formatFactor(market.fundingExponentFactor)}
                                showDollar={false}
                              />
                              <br />
                              <div className="Tooltip-divider" />
                              <br />
                              <div>
                                <Trans>Other</Trans>
                              </div>
                              <br />
                              <StatsTooltipRow
                                label={t`Min collateral`}
                                value={formatUsd(minCollateralUsd)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Min position size`}
                                value={formatUsd(minPositionSizeUsd) || "..."}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Min collateral factor`}
                                value={formatFactor(market.minCollateralFactor)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Min collateral factor for liquidation`}
                                value={formatFactor(market.minCollateralFactorForLiquidation)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Min collateral factor OI long`}
                                value={formatFactor(market.minCollateralFactorForOpenInterestLong)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Min collateral factor OI short`}
                                value={formatFactor(market.minCollateralFactorForOpenInterestShort)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Max leverage`}
                                value={
                                  market.minCollateralFactor > 0
                                    ? formatAmount((PRECISION / market.minCollateralFactor) * 100n, 2, 2)
                                    : "..."
                                }
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Reserve factor longs`}
                                value={formatFactor(market.reserveFactorLong)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Reserve factor shorts`}
                                value={formatFactor(market.reserveFactorShort)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Open interest reserve factor longs`}
                                value={formatFactor(market.openInterestReserveFactorLong)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Open interest reserve factor shorts`}
                                value={formatFactor(market.openInterestReserveFactorShort)}
                                showDollar={false}
                              />
                              <br />
                              <StatsTooltipRow
                                label={t`Claimable collateral delay`}
                                value={claimableCollateralDelay?.toString() || "..."}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Claimable collateral reduction factor`}
                                value={formatFactor(claimableCollateralReductionFactor ?? 0n)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Use open interest in tokens for balance`}
                                value={market.useOpenInterestInTokensForBalance ? t`true` : t`false`}
                                showDollar={false}
                              />
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
