import { useChainId } from "lib/chains";
import { CHART_PERIODS, PRECISION } from "lib/legacy";

import { BigNumber, BigNumberish, ethers } from "ethers";
import { formatAmount, formatUsd } from "lib/numbers";

import cx from "classnames";
import { ShareBar } from "components/ShareBar/ShareBar";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarketIndexName,
  getMarketPoolName,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { usePositionsConstants } from "domain/synthetics/positions";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import "./SyntheticsStats.scss";

function formatAmountHuman(amount: BigNumberish | undefined, tokenDecimals: number) {
  const n = Number(formatAmount(amount, tokenDecimals));

  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toFixed(1);
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
            <th>Market</th>
            <th>Pool Value</th>
            <th>Pool Balance</th>
            <th>
              <Tooltip handle="PnL" renderContent={() => "Pending PnL from all open positions"} />
            </th>
            <th>
              <Tooltip handle="Borrowing Fees" renderContent={() => "Pending Borrowing Fees from all open positions"} />
            </th>
            <th>
              <Tooltip
                handle="Funding APR"
                renderContent={() => (
                  <div>
                    Longs / Shorts
                    <br />
                    <br />
                    Per 1h
                    <br />
                    <br />
                    Negative value: traders pay funding
                    <br /> Positive value: traders receive funding
                  </div>
                )}
              />
            </th>
            <th>OI Balance</th>
            <th>Liquidity Long</th>
            <th>Liquidity Short</th>
            <th>
              <Tooltip handle="VI Positions" renderContent={() => "Virtual inventory for positons"} />
            </th>
            <th>
              <Tooltip handle="VI Swaps" renderContent={() => "Virtual inventory for swaps (Long / Short)"} />
            </th>
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

            const reservedUsdShort = getReservedUsd(market, false);
            const maxReservedUsdShort = getMaxReservedUsd(market, false);

            const borrowingRateLong = getBorrowingFactorPerPeriod(market, true, 60 * 60);
            const borrowingRateShort = getBorrowingFactorPerPeriod(market, false, 60 * 60);

            const fundingAprLong = getFundingFactorPerPeriod(market, true, CHART_PERIODS["1h"]).mul(100);
            const fundingAprShort = getFundingFactorPerPeriod(market, false, CHART_PERIODS["1h"]).mul(100);

            return (
              <tr key={market.marketTokenAddress}>
                <td>
                  <div className="cell">
                    <div>
                      <Tooltip
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
                    <div className="muted">[{getMarketPoolName(market)}]</div>
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <Tooltip
                      handle={`$${formatAmountHuman(market.poolValueMax, 30)}`}
                      renderContent={() => (
                        <>
                          <StatsTooltipRow label="Pool USD Long" value={formatAmountHuman(longPoolUsd, 30)} />
                          <StatsTooltipRow label="Pool USD Short" value={formatAmountHuman(shortPoolUsd, 30)} />

                          <StatsTooltipRow
                            label="Pool Long Amount"
                            value={formatAmountHuman(market.longPoolAmount, market.longToken.decimals)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Pool Short Amount"
                            value={formatAmountHuman(market.shortPoolAmount, market.shortToken.decimals)}
                            showDollar={false}
                          />

                          <StatsTooltipRow
                            label="Pool Max Long Amount"
                            value={formatAmountHuman(market.maxLongPoolAmount, market.longToken.decimals)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Pool Max Short Amount"
                            value={formatAmountHuman(market.maxShortPoolAmount, market.shortToken.decimals)}
                            showDollar={false}
                          />

                          <StatsTooltipRow
                            label={`Swap Impact Amount ${market.longToken.symbol}`}
                            value={formatAmountHuman(swapImpactUsdLong, 30)}
                          />
                          <StatsTooltipRow
                            label={`Swap Impact Amount ${market.shortToken.symbol}`}
                            value={formatAmountHuman(swapImpactUsdShort, 30)}
                          />
                          <StatsTooltipRow
                            label={`Position Impact Amount`}
                            value={formatAmountHuman(positionImpactUsd, 30)}
                          />
                        </>
                      )}
                    />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div>
                      ${formatAmountHuman(longPoolUsd, 30)} / ${formatAmountHuman(shortPoolUsd, 30)}
                    </div>
                    <ShareBar className="MarketCard-pool-balance-bar" share={longPoolUsd} total={totalPoolUsd} />
                  </div>
                </td>
                <td>
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <Tooltip
                        handle={
                          <span className={cx({ positive: market.netPnlMax.gt(0), negative: market.netPnlMax.lt(0) })}>
                            {market.netPnlMax.gt(0) ? "+" : "-"}${formatAmountHuman(market.netPnlMax.abs(), 30)}
                          </span>
                        }
                        renderContent={() => (
                          <>
                            <StatsTooltipRow label="PnL Long" value={formatAmountHuman(market.pnlLongMax, 30)} />
                            <StatsTooltipRow label="PnL Short" value={formatAmountHuman(market.pnlShortMax, 30)} />
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
                      <Tooltip
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
                <td>
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <div>
                        <span className={cx({ positive: true })}>
                          {market.longsPayShorts ? "-" : "+"}
                          {formatAmount(fundingAprLong.abs(), 30, 4)}%
                        </span>{" "}
                        /{" "}
                        <span className={cx({ negative: true })}>
                          {market.longsPayShorts ? "+" : "-"}
                          {formatAmount(fundingAprShort.abs(), 30, 4)}%
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <>
                        <div>
                          ${formatAmountHuman(market.longInterestUsd, 30)} / $
                          {formatAmountHuman(market.shortInterestUsd, 30)}
                        </div>
                        <ShareBar
                          className="MarketCard-pool-balance-bar"
                          share={market.longInterestUsd}
                          total={totalInterestUsd}
                        />
                      </>
                    )}
                  </div>
                </td>
                <td>
                  <Tooltip
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
                      <StatsTooltipRow
                        label={`Max ${market.longToken.symbol} Out`}
                        value={formatAmountHuman(longCollateralLiquidityUsd, 30)}
                      />
                    )}
                  />
                </td>
                <td>
                  <Tooltip
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
                      <StatsTooltipRow
                        label={`Max ${market.shortToken.symbol} Out`}
                        value={formatAmountHuman(shortCollateralLiquidityUsd, 30)}
                      />
                    )}
                  />
                </td>
                <td>
                  <div className="cell">
                    {market.isSpotOnly ? (
                      "..."
                    ) : (
                      <>
                        <div>
                          {virtualInventoryPositions?.gt(0) ? "Short" : "Long"}{" "}
                          {formatUsd(virtualInventoryPositions?.abs()) || "$0.00"}
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <div>
                      {formatUsd(convertToUsd(virtualInventorySwapsLong, market.longToken.decimals, midLongPrice)) ||
                        "$0.00"}{" "}
                      /{" "}
                      {formatUsd(convertToUsd(virtualInventorySwapsShort, market.shortToken.decimals, midShortPrice)) ||
                        "$0.00"}{" "}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell">
                    <Tooltip
                      position={"right-bottom"}
                      handle="..."
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
