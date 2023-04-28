import { Trans } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getIcon } from "config/icons";
import { getFundingFactorPerPeriod } from "domain/synthetics/fees";
import {
  MarketInfo,
  getMarketPoolName,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { TokenData, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, CHART_PERIODS, importImage } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import AssetDropdown from "pages/Dashboard/AssetDropdown";

import { useMemo } from "react";
import { useMedia } from "react-use";

function formatFundingRate(fundingRate?: BigNumber) {
  if (!fundingRate) {
    return "-";
  }

  const sign = fundingRate.isZero() ? "" : fundingRate.isNegative() ? "-" : "+";

  return `${sign}${formatAmount(fundingRate.mul(100).abs(), 30, 4)}%`;
}

export function MarketsList() {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfo(chainId);

  const isMobile = useMedia("(max-width: 1100px)");

  const indexTokensStats = useMemo(() => {
    const markets = Object.values(marketsInfoData || {});

    const indexMap: {
      [address: string]: {
        token: TokenData;
        price: BigNumber;
        totalPoolValue: BigNumber;
        avgFundingRateLong: BigNumber;
        avgFundingRateShort: BigNumber;
        totalUtilization: BigNumber;
        totalReservedUsd: BigNumber;
        totalMaxReservedUsd: BigNumber;
        marketsStats: {
          marketInfo: MarketInfo;
          poolValueUsd: BigNumber;
          fundingRateLong: BigNumber;
          fundingRateShort: BigNumber;
          utilization: BigNumber;
        }[];
      };
    } = {};

    for (const marketInfo of markets) {
      if (marketInfo.isSpotOnly) {
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
          totalReservedUsd: BigNumber.from(0),
          totalMaxReservedUsd: BigNumber.from(0),
          marketsStats: [],
        };
      }

      const indexTokenStats = indexMap[marketInfo.indexTokenAddress];

      const poolValueUsd = marketInfo.poolValueMax;

      const fundingRateLong = getFundingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]);
      const fundingRateShort = getFundingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]);

      const longReservedUsd = getReservedUsd(marketInfo, true);
      const maxLongReservedUsd = getMaxReservedUsd(marketInfo, true);

      const shortReservedUsd = getReservedUsd(marketInfo, false);
      const maxShortReservedUsd = getMaxReservedUsd(marketInfo, false);

      const totalReservedUsd = longReservedUsd.add(shortReservedUsd);
      const maxTotalReservedUsd = maxLongReservedUsd.add(maxShortReservedUsd);

      const utilization = maxTotalReservedUsd.gt(0)
        ? totalReservedUsd.mul(BASIS_POINTS_DIVISOR).div(maxTotalReservedUsd)
        : BigNumber.from(0);

      indexTokenStats.totalPoolValue = indexTokenStats.totalPoolValue.add(poolValueUsd);
      indexTokenStats.totalReservedUsd = indexTokenStats.totalReservedUsd.add(totalReservedUsd);
      indexTokenStats.totalMaxReservedUsd = indexTokenStats.totalMaxReservedUsd.add(maxTotalReservedUsd);
      indexTokenStats.marketsStats.push({
        marketInfo: marketInfo,
        utilization,
        fundingRateLong,
        fundingRateShort,
        poolValueUsd,
      });
    }

    for (const indexTokenStats of Object.values(indexMap)) {
      indexTokenStats.totalUtilization = indexTokenStats.totalMaxReservedUsd.gt(0)
        ? indexTokenStats.totalReservedUsd.mul(BASIS_POINTS_DIVISOR).div(indexTokenStats.totalMaxReservedUsd)
        : BigNumber.from(0);

      indexTokenStats.avgFundingRateLong = indexTokenStats.marketsStats.reduce((acc, stat) => {
        return acc.add(stat.fundingRateLong).div(indexTokenStats.marketsStats.length);
      }, BigNumber.from(0));

      indexTokenStats.avgFundingRateShort = indexTokenStats.marketsStats.reduce((acc, stat) => {
        return acc.add(stat.fundingRateShort).div(indexTokenStats.marketsStats.length);
      }, BigNumber.from(0));
    }

    return Object.values(indexMap);
  }, [marketsInfoData]);

  return (
    <>
      {!isMobile && (
        <div className="token-table-wrapper App-card">
          <div className="App-card-title">
            <Trans>GM Index Composition</Trans> <img src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
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
                  <Trans>POOL</Trans>
                </th>
                <th>
                  <Trans>FUNDING RATE / 1h</Trans>
                </th>
                <th>
                  <Trans>UTILIZATION</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {indexTokensStats.map((stats) => (
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
                          <div className="App-card-title-info-text-name">{stats.token.name}</div>
                          <div className="App-card-title-info-text-address">{stats.token.symbol}</div>
                        </div>
                        <div>
                          <AssetDropdown assetSymbol={stats.token.symbol} assetInfo={stats.token} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatUsd(stats.token.prices?.minPrice)}</td>
                  <td>
                    <Tooltip
                      handle={formatUsd(stats.totalPoolValue)}
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ marketInfo, poolValueUsd }) => (
                            <StatsTooltipRow
                              key={marketInfo.marketTokenAddress}
                              showDollar={false}
                              label={getMarketPoolName(marketInfo)}
                              value={formatUsd(poolValueUsd)}
                            />
                          ))}
                        </>
                      )}
                    />
                  </td>
                  <td>
                    <Tooltip
                      handle={`${formatFundingRate(stats.avgFundingRateLong)} / ${formatFundingRate(
                        stats.avgFundingRateShort
                      )}`}
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ marketInfo: market, fundingRateLong, fundingRateShort }) => (
                            <StatsTooltipRow
                              key={market.marketTokenAddress}
                              showDollar={false}
                              label={getMarketPoolName(market)}
                              value={`${formatFundingRate(fundingRateLong)} / ${formatFundingRate(fundingRateShort)}`}
                            />
                          ))}
                        </>
                      )}
                    />
                  </td>
                  <td>{formatAmount(stats.totalUtilization, 2, 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isMobile && (
        <>
          <div className="App-card-title-small">
            <span>
              <Trans>GM Index Composition</Trans>
            </span>
            <img className="title-icon" src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
          </div>

          <div className="token-grid">
            {indexTokensStats.map((stats) => (
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
                      <AssetDropdown assetSymbol={stats.token.symbol} assetInfo={stats.token} />
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
                      <Trans>Pool</Trans>
                    </div>
                    <div>
                      <Tooltip
                        handle={`${formatFundingRate(stats.avgFundingRateLong)} / ${formatFundingRate(
                          stats.avgFundingRateShort
                        )}`}
                        renderContent={() => (
                          <>
                            {stats.marketsStats.map(({ marketInfo, fundingRateLong, fundingRateShort }) => (
                              <StatsTooltipRow
                                key={marketInfo.marketTokenAddress}
                                showDollar={false}
                                label={getMarketPoolName(marketInfo)}
                                value={`${formatFundingRate(fundingRateLong)} / ${formatFundingRate(fundingRateShort)}`}
                              />
                            ))}
                          </>
                        )}
                      />
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Funding Rate / 1h</Trans>
                    </div>
                    <div>
                      <Tooltip
                        handle={`${formatFundingRate(stats.avgFundingRateLong)} / ${formatFundingRate(
                          stats.avgFundingRateShort
                        )}`}
                        renderContent={() => (
                          <>
                            {stats.marketsStats.map(({ marketInfo, fundingRateLong, fundingRateShort }) => (
                              <StatsTooltipRow
                                key={marketInfo.marketTokenAddress}
                                showDollar={false}
                                label={getMarketPoolName(marketInfo)}
                                value={`${formatFundingRate(fundingRateLong)} / ${formatFundingRate(fundingRateShort)}`}
                              />
                            ))}
                          </>
                        )}
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
            ))}
          </div>
        </>
      )}
    </>
  );
}
