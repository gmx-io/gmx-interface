import { useChainId } from "lib/chains";
import { CHART_PERIODS, PRECISION } from "lib/legacy";

import { BigNumber, BigNumberish, ethers } from "ethers";
import { formatAmount, formatUsd } from "lib/numbers";

import cx from "classnames";
import { ShareBar } from "components/ShareBar/ShareBar";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarketIndexName,
  getMarketPoolName,
  getMaxOpenInterestUsd,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { usePositionsConstants } from "domain/synthetics/positions";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import "./SyntheticsStats.scss";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

function formatAmountHuman(amount: BigNumberish | undefined, tokenDecimals: number, showDollar: boolean = false) {
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

function formatFactor(factor: BigNumber) {
  if (factor.gt(PRECISION)) {
    return factor.div(PRECISION).toString();
  } else if (factor.gt(0)) {
    let factorDecimals = PRECISION.div(factor).toString().length;

    return (Number(factor) / 10 ** 30).toFixed(factorDecimals);
  }

  return factor.toString();
}

export function SyntheticsStats() {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants(chainId);

  const markets = Object.values(marketsInfoData || {});

  return (
    <div className="SyntheticsStats">
      <table>
        <thead>
          <tr>
            <th className="sticky-left">Market</th>
            <th>Pool Value</th>
            <th>Pool Balance</th>
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
                position="right-bottom"
                renderContent={() => (
                  <>
                    <p>Virtual inventory for positons</p>
                    <p>
                      Virtual Inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC, ETH/USDT.
                    </p>
                  </>
                )}
              />
            </th>
            <th>
              <TooltipWithPortal
                handle="VI Swaps"
                position="right-bottom"
                renderContent={() => (
                  <>
                    <p>Virtual inventory for swaps (Long / Short)</p>
                    <p>
                      Virtual Inventory tracks the imbalance of tokens across similar markets, e.g. ETH/USDC, ETH/USDT.
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
            const totalInterestUsd = market.longInterestUsd.add(market.shortInterestUsd);

            const midLongPrice = getMidPrice(market.longToken.prices);
            const midShortPrice = getMidPrice(market.shortToken.prices);

            const longPoolUsd = convertToUsd(market.longPoolAmount, market.longToken.decimals, midLongPrice);
            const shortPoolUsd = convertToUsd(market.shortPoolAmount, market.shortToken.decimals, midShortPrice);
            const totalPoolUsd = longPoolUsd?.add(shortPoolUsd || 0);

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

            const reservedUsdShort = getReservedUsd(market, false);
            const maxReservedUsdShort = getMaxReservedUsd(market, false);
            const maxOpenInterestShort = getMaxOpenInterestUsd(market, false);

            const borrowingRateLong = getBorrowingFactorPerPeriod(market, true, 60 * 60 * 100);
            const borrowingRateShort = getBorrowingFactorPerPeriod(market, false, 60 * 60 * 100);

            const fundingAprLong = getFundingFactorPerPeriod(market, true, CHART_PERIODS["1h"]).mul(100);
            const fundingAprShort = getFundingFactorPerPeriod(market, false, CHART_PERIODS["1h"]).mul(100);

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
                                {market.virtualMarketId !== ethers.constants.HashZero ? market.virtualMarketId : "-"}
                              </div>
                            }
                            showDollar={false}
                          />
                          <br />
                          <StatsTooltipRow
                            label="Virtual Long Token Id"
                            value={
                              <div className="debug-key">
                                {market.virtualLongTokenId !== ethers.constants.HashZero
                                  ? market.virtualLongTokenId
                                  : "-"}
                              </div>
                            }
                            showDollar={false}
                          />
                          <br />
                          <StatsTooltipRow
                            label="Virtual Short Token Id"
                            value={
                              <div className="debug-key">
                                {market.virtualShortTokenId !== ethers.constants.HashZero
                                  ? market.virtualShortTokenId
                                  : "-"}
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
                          value={formatAmount(market.maxShortPoolAmountForDeposit, market.shortToken.decimals, 0, true)}
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
                  <ShareBar className="MarketCard-pool-balance-bar" share={longPoolUsd} total={totalPoolUsd} />
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
                          <span className={fundingAprLong.gt(0) ? "text-green" : "text-red"}>
                            {market.longsPayShorts ? "-" : "+"}
                            {formatAmount(fundingAprLong.abs(), 30, 4)}%
                          </span>
                          {" / "}
                          <span className={fundingAprShort.gt(0) ? "text-green" : "text-red"}>
                            {market.longsPayShorts ? "+" : "-"}
                            {formatAmount(fundingAprShort.abs(), 30, 4)}%
                          </span>
                        </>
                      }
                      renderContent={() =>
                        market.fundingIncreaseFactorPerSecond?.gt(0) ? (
                          <>
                            <StatsTooltipRow
                              label="Funding increase factor"
                              value={formatAmount(market.fundingIncreaseFactorPerSecond, 30, 14)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Funding decrease factor"
                              value={formatAmount(market.fundingDecreaseFactorPerSecond, 30, 14)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Max funding factor"
                              value={formatAmount(market.maxFundingFactorPerSecond, 30, 14)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Min funding factor"
                              value={formatAmount(market.minFundingFactorPerSecond, 30, 14)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Threshold for stable funding"
                              value={formatAmount(market.thresholdForStableFunding, 30, 14)}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Threshold for decrease funding"
                              value={formatAmount(market.thresholdForDecreaseFunding, 30, 14)}
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
                            value={formatAmount(market.shortInterestUsd.add(market.longInterestUsd), 30, 0, true)}
                          />
                          <StatsTooltipRow label="Long" value={formatAmount(market.longInterestUsd, 30, 0, true)} />
                          <StatsTooltipRow label="Short" value={formatAmount(market.shortInterestUsd, 30, 0, true)} />
                          <StatsTooltipRow
                            label="Percentage"
                            value={(() => {
                              const totalInterestUsd = market.shortInterestUsd.add(market.longInterestUsd);
                              const longInterestPercent = formatAmount(
                                market.longInterestUsd.mul(10000).div(totalInterestUsd),
                                2,
                                2
                              );
                              const shortInterestPercent = formatAmount(
                                market.shortInterestUsd.mul(10000).div(totalInterestUsd),
                                2,
                                2
                              );

                              return (
                                <>
                                  {longInterestPercent}% / {shortInterestPercent}%
                                </>
                              );
                            })()}
                          />
                        </>
                      )}
                    />
                  </div>
                  <ShareBar
                    className="MarketCard-pool-balance-bar"
                    share={market.longInterestUsd}
                    total={totalInterestUsd}
                  />
                </div>
              );
            }

            return (
              <tr key={market.marketTokenAddress}>
                <td className="sticky-left">{renderMarketCell()}</td>
                <td>{renderPoolCell()}</td>
                <td>{renderPoolBalanceCell()}</td>
                <td>
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <TooltipWithPortal
                        handle={
                          <span className={cx({ positive: market.netPnlMax.gt(0), negative: market.netPnlMax.lt(0) })}>
                            {market.netPnlMax.gt(0) ? "+" : "-"}${formatAmountHuman(market.netPnlMax.abs(), 30)}
                          </span>
                        }
                        renderContent={() => (
                          <>
                            <StatsTooltipRow
                              showDollar={false}
                              label="PnL Long"
                              className={market.pnlLongMax.gt(0) ? "text-green" : "text-red"}
                              value={`${market.pnlLongMax.gt(0) ? "+" : "-"}${formatAmountHuman(
                                market.pnlLongMax.abs(),
                                30,
                                true
                              )}`}
                            />
                            <StatsTooltipRow
                              showDollar={false}
                              label="PnL Short"
                              className={market.pnlShortMax.gt(0) ? "text-green" : "text-red"}
                              value={`${market.pnlShortMax.gt(0) ? "+" : "-"}${formatAmountHuman(
                                market.pnlShortMax.abs(),
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
                <td>
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <TooltipWithPortal
                        handle={`$${formatAmountHuman(market.totalBorrowingFees, 30)}`}
                        renderContent={() => (
                          <>
                            <StatsTooltipRow
                              label="Rate Long"
                              value={`-${formatAmount(borrowingRateLong, 30, 4)}% / 1h`}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Rate Short"
                              value={`-${formatAmount(borrowingRateShort, 30, 4)}% / 1h`}
                              showDollar={false}
                            />
                          </>
                        )}
                      />
                    )}
                  </div>
                </td>
                <td>{renderFundingCell()}</td>
                <td>{renderOIBalanceCell()}</td>
                <td>
                  <TooltipWithPortal
                    handle={
                      market.isSpotOnly ? (
                        formatAmountHuman(longCollateralLiquidityUsd, 30)
                      ) : (
                        <div className="cell">
                          <div>
                            ${formatAmountHuman(reservedUsdLong, 30)} / ${formatAmountHuman(maxReservedUsdLong, 30)}
                          </div>
                          <ShareBar share={reservedUsdLong} total={maxReservedUsdLong} />
                        </div>
                      )
                    }
                    renderContent={() => (
                      <>
                        <StatsTooltipRow label={`Reserved Long`} value={formatAmount(reservedUsdLong, 30, 0, true)} />
                        <StatsTooltipRow
                          label={`Max Open Interest Long`}
                          value={formatAmount(maxOpenInterestLong, 30, 0, true)}
                        />
                        <StatsTooltipRow
                          label={`Max ${market.longToken.symbol} Out`}
                          value={formatAmount(longCollateralLiquidityUsd, 30, 0, true)}
                        />
                      </>
                    )}
                  />
                </td>
                <td>
                  <TooltipWithPortal
                    position="right-bottom"
                    handle={
                      market.isSpotOnly ? (
                        formatAmountHuman(shortCollateralLiquidityUsd, 30)
                      ) : (
                        <div className="cell">
                          <div>
                            ${formatAmountHuman(reservedUsdShort, 30)} / ${formatAmountHuman(maxReservedUsdShort, 30)}
                          </div>
                          <ShareBar share={reservedUsdShort} total={maxReservedUsdShort} />
                        </div>
                      )
                    }
                    renderContent={() => (
                      <>
                        <StatsTooltipRow label={`Reserved Short`} value={formatAmount(reservedUsdShort, 30, 0, true)} />
                        <StatsTooltipRow
                          label={`Max Open Interest Short`}
                          value={formatAmount(maxOpenInterestShort, 30, 0, true)}
                        />
                        <StatsTooltipRow
                          label={`Max ${market.shortToken.symbol} Out`}
                          value={formatAmount(shortCollateralLiquidityUsd, 30, 0, true)}
                        />
                      </>
                    )}
                  />
                </td>
                <td>
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <TooltipWithPortal
                        position="right-bottom"
                        handle={
                          <>
                            <div>
                              {virtualInventoryPositions?.gt(0) ? "Short" : "Long"}{" "}
                              {formatAmountHuman(virtualInventoryPositions?.abs(), 30) || "$0.00"}
                            </div>
                          </>
                        }
                        renderContent={() => {
                          return (
                            <StatsTooltipRow
                              label={virtualInventoryPositions?.gt(0) ? "Short" : "Long"}
                              value={formatUsd(virtualInventoryPositions?.abs()) || "$0.00"}
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
                      position="right-bottom"
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
                <td>
                  <div className="cell">
                    <TooltipWithPortal
                      handle={`$${formatAmount(positionImpactUsd, 30, 2, true)}`}
                      position="right-bottom"
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
                            label="Distribution Rate"
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
                              market.positionImpactPoolDistributionRate
                                .mul(86400)
                                .mul(market.indexToken.prices.minPrice),
                              market.indexToken.decimals + 60,
                              2,
                              true
                            )}
                          />
                        </>
                      )}
                    />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <TooltipWithPortal
                      position={"right-bottom"}
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
                              market.minCollateralFactor.gt(0)
                                ? formatAmount(PRECISION.div(market.minCollateralFactor).mul(100), 2, 2)
                                : "..."
                            }
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
  );
}
