import { Trans, t } from "@lingui/macro";
import "./MarketsList.scss";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getIcon } from "config/icons";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import { MarketInfo, getMarketPoolName, getAvailableLiquidity, useMarketsInfoRequest } from "domain/synthetics/markets";
import { TokenData, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, importImage } from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { formatAmount, formatRatePercentage, formatUsd } from "lib/numbers";
import AssetDropdown from "pages/Dashboard/AssetDropdown";

import { useMemo } from "react";
import { useMedia } from "react-use";
import PageTitle from "components/PageTitle/PageTitle";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketListSkeleton } from "components/Skeleton/Skeleton";
import { DOCS_LINKS } from "config/links";
import MarketNetFee from "../MarketNetFee/MarketNetFee";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getTokenPriceDecimals } from "config/tokens";

export function MarketsList() {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const isMobile = useMedia("(max-width: 1100px)");

  const indexTokensStats = useMemo(() => {
    const markets = Object.values(marketsInfoData || {}).sort((a, b) => {
      return a.indexToken.symbol.localeCompare(b.indexToken.symbol);
    });

    const indexMap: {
      [address: string]: {
        token: TokenData;
        price: BigNumber;
        totalPoolValue: BigNumber;
        avgFundingRateLong: BigNumber;
        avgFundingRateShort: BigNumber;
        totalUtilization: BigNumber;
        totalAvailableLiquidity: BigNumber;
        totalMaxLiquidity: BigNumber;
        marketsStats: {
          marketInfo: MarketInfo;
          poolValueUsd: BigNumber;
          fundingRateLong: BigNumber;
          fundingRateShort: BigNumber;
          borrowingRateLong: BigNumber;
          borrowingRateShort: BigNumber;
          utilization: BigNumber;
        }[];
      };
    } = {};

    for (const marketInfo of markets) {
      if (marketInfo.isSpotOnly || marketInfo.isDisabled) {
        continue;
      }

      const { indexToken } = marketInfo;

      if (!indexMap[indexToken.address]) {
        const price = getMidPrice(indexToken.prices)!;

        indexMap[marketInfo.indexTokenAddress] = {
          token: indexToken,
          price,
          totalPoolValue: BigNumber.from(0),
          avgFundingRateLong: BigNumber.from(0),
          avgFundingRateShort: BigNumber.from(0),
          totalUtilization: BigNumber.from(0),
          totalAvailableLiquidity: BigNumber.from(0),
          totalMaxLiquidity: BigNumber.from(0),
          marketsStats: [],
        };
      }

      const indexTokenStats = indexMap[marketInfo.indexTokenAddress];

      const poolValueUsd = marketInfo.poolValueMax;

      const fundingRateLong = getFundingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]);
      const fundingRateShort = getFundingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]);
      const borrowingRateLong = getBorrowingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]).mul(-1);
      const borrowingRateShort = getBorrowingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]).mul(-1);

      const [longAvailableLiquidity, longMaxLiquidity] = getAvailableLiquidity(marketInfo, true);

      const [shortAvailableLiquidity, shortMaxLiquidity] = getAvailableLiquidity(marketInfo, false);

      const availableLiquidity = longAvailableLiquidity.add(shortAvailableLiquidity);
      const maxLiquidity = longMaxLiquidity.add(shortMaxLiquidity);

      const utilization = maxLiquidity.gt(0)
        ? availableLiquidity.mul(BASIS_POINTS_DIVISOR).div(maxLiquidity)
        : BigNumber.from(0);

      indexTokenStats.totalPoolValue = indexTokenStats.totalPoolValue.add(poolValueUsd);
      indexTokenStats.totalAvailableLiquidity = indexTokenStats.totalAvailableLiquidity.add(availableLiquidity);
      indexTokenStats.totalMaxLiquidity = indexTokenStats.totalMaxLiquidity.add(maxLiquidity);
      indexTokenStats.marketsStats.push({
        marketInfo: marketInfo,
        utilization,
        fundingRateLong,
        fundingRateShort,
        poolValueUsd,
        borrowingRateLong,
        borrowingRateShort,
      });
    }

    for (const indexTokenStats of Object.values(indexMap)) {
      indexTokenStats.totalUtilization = indexTokenStats.totalMaxLiquidity.gt(0)
        ? indexTokenStats.totalAvailableLiquidity.mul(BASIS_POINTS_DIVISOR).div(indexTokenStats.totalMaxLiquidity)
        : BigNumber.from(0);

      indexTokenStats.avgFundingRateLong = indexTokenStats.marketsStats.reduce((acc, stat) => {
        return acc.add(stat.fundingRateLong).div(indexTokenStats.marketsStats.length);
      }, BigNumber.from(0));

      indexTokenStats.avgFundingRateShort = indexTokenStats.marketsStats.reduce((acc, stat) => {
        return acc.add(stat.fundingRateShort).div(indexTokenStats.marketsStats.length);
      }, BigNumber.from(0));
    }

    return Object.values(indexMap).sort((a, b) => {
      return b.totalPoolValue.gt(a.totalPoolValue) ? 1 : -1;
    });
  }, [marketsInfoData]);

  function renderFundingRateTooltip(stats: typeof indexTokensStats[0]) {
    return () => (
      <>
        {stats.marketsStats.map((stat) => {
          const { marketInfo: market, fundingRateLong, fundingRateShort, borrowingRateLong, borrowingRateShort } = stat;

          return (
            <div className="mb-base" key={market.marketTokenAddress}>
              <div className="mb-sm text-white">[{getMarketPoolName(market)}]</div>
              <MarketNetFee borrowRateHourly={borrowingRateLong} fundingRateHourly={fundingRateLong} isLong={true} />
              <div className="divider my-base" />
              <MarketNetFee borrowRateHourly={borrowingRateShort} fundingRateHourly={fundingRateShort} isLong={false} />
            </div>
          );
        })}
        <div className="divider my-base" />
        <Trans>
          Funding fees help to balance longs and shorts and are exchanged between both sides.{" "}
          <ExternalLink href={DOCS_LINKS.fundingFees}>Read more</ExternalLink>.
        </Trans>

        <br />
        <br />

        <Trans>
          Borrowing fees help ensure available liquidity.{" "}
          <ExternalLink href={DOCS_LINKS.borrowingFees}>Read more</ExternalLink>.
        </Trans>
      </>
    );
  }

  return (
    <>
      {!isMobile && (
        <div className="token-table-wrapper App-card">
          <div className="App-card-title">
            <Trans>GM Pools</Trans> <img src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
          </div>
          <div className="App-card-divider"></div>
          <table className="token-table">
            <thead>
              <tr>
                <th>
                  <Trans>TOKEN</Trans>
                </th>
                <th>
                  <Trans>PRICE</Trans>
                </th>
                <th>
                  <Trans>POOLS</Trans>
                </th>
                <th>
                  <Trans>NET FEE / 1 H</Trans>
                </th>
                <th>
                  <Trans>UTILIZATION</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {indexTokensStats.length ? (
                indexTokensStats.map((stats, index) => {
                  const largestPool = stats.marketsStats.sort((a, b) => {
                    return b.poolValueUsd.gt(a.poolValueUsd) ? 1 : -1;
                  })[0];
                  const tooltipPositionNetFee = index < indexTokensStats.length / 2 ? "bottom-end" : "top-end";
                  const netFeePerHourLong = largestPool.fundingRateLong.add(largestPool.borrowingRateLong);
                  const netFeePerHourShort = largestPool.fundingRateShort.add(largestPool.borrowingRateShort);

                  return (
                    <tr key={stats.token.symbol}>
                      <td>
                        <div className="token-symbol-wrapper">
                          <div className="App-card-title-info">
                            <div className="App-card-title-info-icon">
                              <img
                                src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                                alt={stats.token.symbol}
                                width="40"
                              />
                            </div>
                            <div className="App-card-title-info-text">
                              <div className="App-card-info-title">{stats.token.name}</div>
                              <div className="App-card-info-subtitle">{stats.token.symbol}</div>
                            </div>
                            <div>
                              <AssetDropdown token={stats.token} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {formatUsd(stats.token.prices?.minPrice, {
                          displayDecimals: getTokenPriceDecimals(stats.token.prices?.minPrice),
                        })}
                      </td>
                      <td>
                        <Tooltip
                          className="nowrap"
                          handle={formatUsd(stats.totalPoolValue)}
                          renderContent={() => (
                            <>
                              {stats.marketsStats.map(({ marketInfo, poolValueUsd }) => (
                                <StatsTooltipRow
                                  key={marketInfo.marketTokenAddress}
                                  showDollar={false}
                                  label={`[${getMarketPoolName(marketInfo)}]`}
                                  value={formatUsd(poolValueUsd)}
                                />
                              ))}
                            </>
                          )}
                        />
                      </td>
                      <td>
                        <TooltipWithPortal
                          portalClassName="MarketList-netfee-tooltip"
                          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(
                            netFeePerHourShort
                          )}`}
                          maxAllowedWidth={340}
                          renderContent={renderFundingRateTooltip(stats)}
                          position={tooltipPositionNetFee}
                        />
                      </td>
                      <td>{formatAmount(stats.totalUtilization, 2, 2)}%</td>
                    </tr>
                  );
                })
              ) : (
                <MarketListSkeleton />
              )}
            </tbody>
          </table>
        </div>
      )}

      {isMobile && (
        <>
          <PageTitle title={t`GM Pools`} />
          <div className="token-grid">
            {indexTokensStats.map((stats, index) => {
              const largestPool = stats.marketsStats.sort((a, b) => {
                return b.poolValueUsd.gt(a.poolValueUsd) ? 1 : -1;
              })[0];

              const tooltipPositionNetFee = index < indexTokensStats.length / 2 ? "bottom-end" : "top-end";
              const netFeePerHourLong = largestPool.fundingRateLong.add(largestPool.borrowingRateLong);
              const netFeePerHourShort = largestPool.fundingRateShort.add(largestPool.borrowingRateShort);

              return (
                <div className="App-card" key={stats.token.symbol}>
                  <div className="App-card-title">
                    <div className="mobile-token-card">
                      <img
                        src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                        alt={stats.token.symbol}
                        width="20"
                      />
                      <div className="token-symbol-text">{stats.token.symbol}</div>
                      <div>
                        <AssetDropdown assetSymbol={stats.token.symbol} />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Price</Trans>
                      </div>
                      <div>{formatUsd(stats.token.prices?.minPrice)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Pools</Trans>
                      </div>
                      <div>
                        <Tooltip
                          handle={formatUsd(stats.totalPoolValue)}
                          position="bottom-end"
                          renderContent={() => (
                            <>
                              {stats.marketsStats.map(({ marketInfo, poolValueUsd }) => (
                                <StatsTooltipRow
                                  key={marketInfo.marketTokenAddress}
                                  showDollar={false}
                                  label={`[${getMarketPoolName(marketInfo)}]`}
                                  value={formatUsd(poolValueUsd)}
                                />
                              ))}
                            </>
                          )}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Net Fee / 1h</Trans>
                      </div>
                      <div>
                        <TooltipWithPortal
                          maxAllowedWidth={340}
                          portalClassName="MarketList-netfee-tooltip"
                          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(
                            netFeePerHourShort
                          )}`}
                          position={tooltipPositionNetFee}
                          renderContent={renderFundingRateTooltip(stats)}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Utilization</Trans>
                      </div>
                      <div>{formatAmount(stats.totalUtilization, 2, 2, false)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
