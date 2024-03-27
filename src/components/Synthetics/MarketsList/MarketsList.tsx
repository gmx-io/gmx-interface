import { t, Trans } from "@lingui/macro";
import { BigNumber, constants } from "ethers";
import { useMemo } from "react";
import { useMedia } from "react-use";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getIcon } from "config/icons";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import {
  getAvailableLiquidity,
  getMarketIndexName,
  getMarketPoolName,
  MarketInfo,
  MarketsInfoData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { getMidPrice, TokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, importImage } from "lib/legacy";
import { BN_ZERO, formatAmount, formatRatePercentage, formatUsd } from "lib/numbers";

import PageTitle from "components/PageTitle/PageTitle";
import { MarketListSkeleton } from "components/Skeleton/Skeleton";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { NetFeeTooltip } from "./NetFeeTooltip";

import "./MarketsList.scss";
import { renderNetFeeHeaderTooltipContent } from "./NetFeeHeaderTooltipContent";

export type MarketStat = {
  marketInfo: MarketInfo;
  poolValueUsd: BigNumber;
  availableLiquidity: BigNumber;
  netFeeLong: BigNumber;
  netFeeShort: BigNumber;
  // fundingRateLong: BigNumber;
  // fundingRateShort: BigNumber;
  // borrowingRateLong: BigNumber;
  // borrowingRateShort: BigNumber;
  utilization: BigNumber;
};

type IndexTokenStat = {
  token: TokenData;
  price: BigNumber;
  totalPoolValue: BigNumber;
  // avgFundingRateLong: BigNumber;
  // avgFundingRateShort: BigNumber;
  totalUtilization: BigNumber;
  totalAvailableLiquidity: BigNumber;
  totalMaxLiquidity: BigNumber;
  bestNetFeeLong: BigNumber;
  bestNetFeeShort: BigNumber;
  marketsStats: MarketStat[];
};

type IndexTokensStats = {
  [address: string]: IndexTokenStat;
};

function bnMax(...args: BigNumber[]): BigNumber {
  let max = args[0];
  for (let i = 1; i < args.length; i++) {
    if (args[i].gt(max)) {
      max = args[i];
    }
  }

  return max;
}

function marketsInfoDataToIndexTokensStats(marketsInfoData: MarketsInfoData): IndexTokenStat[] {
  const markets = Object.values(marketsInfoData || {}).sort((a, b) => {
    return a.indexToken.symbol.localeCompare(b.indexToken.symbol);
  });

  const indexMap: IndexTokensStats = {};

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
        totalPoolValue: BN_ZERO,
        totalUtilization: BN_ZERO,
        totalAvailableLiquidity: BN_ZERO,
        totalMaxLiquidity: BN_ZERO,
        marketsStats: [],
        bestNetFeeLong: constants.MinInt256,
        bestNetFeeShort: constants.MinInt256,
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

    const netFeeLong = borrowingRateLong.add(fundingRateLong);
    const netFeeShort = borrowingRateShort.add(fundingRateShort);

    indexTokenStats.totalPoolValue = indexTokenStats.totalPoolValue.add(poolValueUsd);
    indexTokenStats.totalAvailableLiquidity = indexTokenStats.totalAvailableLiquidity.add(availableLiquidity);
    indexTokenStats.totalMaxLiquidity = indexTokenStats.totalMaxLiquidity.add(maxLiquidity);
    indexTokenStats.bestNetFeeLong = bnMax(indexTokenStats.bestNetFeeLong, netFeeLong);
    indexTokenStats.bestNetFeeShort = bnMax(indexTokenStats.bestNetFeeShort, netFeeShort);
    indexTokenStats.marketsStats.push({
      marketInfo,
      utilization,
      netFeeLong,
      netFeeShort,
      availableLiquidity,
      poolValueUsd,
    });
  }

  for (const indexTokenStats of Object.values(indexMap)) {
    indexTokenStats.totalUtilization = indexTokenStats.totalMaxLiquidity.gt(0)
      ? indexTokenStats.totalAvailableLiquidity.mul(BASIS_POINTS_DIVISOR).div(indexTokenStats.totalMaxLiquidity)
      : BigNumber.from(0);
  }

  return Object.values(indexMap).sort((a, b) => {
    return b.totalPoolValue.gt(a.totalPoolValue) ? 1 : -1;
  });
}

export function MarketsList() {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const isMobile = useMedia("(max-width: 1100px)");

  const indexTokensStats = useMemo(() => {
    if (!marketsInfoData) {
      return [];
    }

    return marketsInfoDataToIndexTokensStats(marketsInfoData);
  }, [marketsInfoData]);

  return (
    <>
      {!isMobile && <MarketsListDesktop chainId={chainId} indexTokensStats={indexTokensStats} />}
      {isMobile && <MarketsListMobile indexTokensStats={indexTokensStats} />}
    </>
  );
}

function MarketsListDesktop({ chainId, indexTokensStats }: { chainId: number; indexTokensStats: IndexTokenStat[] }) {
  return (
    <div className="token-table-wrapper App-card">
      <div className="App-card-title">
        <Trans>GM Pools</Trans> <img src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
      </div>
      <div className="App-card-divider"></div>
      <table className="token-table">
        <thead>
          <tr>
            <th>
              <Trans>MARKETS</Trans>
            </th>
            <th>
              <Trans>PRICE</Trans>
            </th>
            <th>
              <Trans>TVL</Trans>
            </th>
            <th>
              <Trans>LIQUIDITY</Trans>
            </th>
            <th>
              <Tooltip handle={<Trans>NET FEE / 1 H</Trans>} renderContent={renderNetFeeHeaderTooltipContent} />
            </th>
            <th>
              <Trans>UTILIZATION</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {indexTokensStats.length ? (
            indexTokensStats.map((stats) => <MarketsListDesktopItem key={stats.token.address} stats={stats} />)
          ) : (
            <MarketListSkeleton />
          )}
        </tbody>
      </table>
    </div>
  );
}

function MarketsListMobile({ indexTokensStats }: { indexTokensStats: IndexTokenStat[] }) {
  return (
    <>
      <PageTitle title={t`GM Pools`} />
      <div className="token-grid">
        {indexTokensStats.map((stats, index) => {
          const tooltipPositionNetFee = index < indexTokensStats.length / 2 ? "bottom-end" : "top-end";
          const netFeePerHourLong = stats.bestNetFeeLong;
          const netFeePerHourShort = stats.bestNetFeeShort;

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
                    <Trans>TVL</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatUsd(stats.totalPoolValue)}
                      position="bottom-end"
                      className="MarketList-mobile-tvl-tooltip"
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ marketInfo, poolValueUsd }) => (
                            <StatsTooltipRow
                              key={marketInfo.marketTokenAddress}
                              showDollar={false}
                              label={
                                <div className="items-top">
                                  <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                                  <span className="subtext lh-1">[{getMarketPoolName(marketInfo)}]</span>
                                </div>
                              }
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
                    <Trans>Liquidity</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatUsd(stats.totalAvailableLiquidity)}
                      className="MarketList-mobile-tvl-tooltip"
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ marketInfo, availableLiquidity }) => (
                            <StatsTooltipRow
                              key={marketInfo.marketTokenAddress}
                              showDollar={false}
                              label={
                                <div className="items-top">
                                  <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                                  <span className="subtext lh-1">[{getMarketPoolName(marketInfo)}]</span>
                                </div>
                              }
                              value={formatUsd(availableLiquidity)}
                            />
                          ))}
                        </>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Tooltip handle={<Trans>Net Fee / 1h</Trans>} renderContent={renderNetFeeHeaderTooltipContent} />
                  </div>
                  <div>
                    <TooltipWithPortal
                      portalClassName="MarketList-netfee-tooltip"
                      handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(
                        netFeePerHourShort
                      )}`}
                      position={tooltipPositionNetFee}
                      renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
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
  );
}

function MarketsListDesktopItem({ stats }: { stats: IndexTokenStat }) {
  const anyPool = stats.marketsStats[0];

  const netFeePerHourLong = stats.bestNetFeeLong;
  const netFeePerHourShort = stats.bestNetFeeShort;
  const marketIndexName = getMarketIndexName(anyPool.marketInfo);

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
              <div className="App-card-info-title">{marketIndexName}</div>
              <div className="App-card-info-subtitle">{stats.token.symbol}</div>
            </div>
            <div>
              <AssetDropdown token={stats.token} />
            </div>
          </div>
        </div>
      </td>
      <td>{formatUsd(stats.token.prices?.minPrice)}</td>
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
                  label={
                    <div className="items-top">
                      <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext lh-1">[{getMarketPoolName(marketInfo)}]</span>
                    </div>
                  }
                  value={formatUsd(poolValueUsd)}
                />
              ))}
            </>
          )}
        />
      </td>
      <td>
        <Tooltip
          className="nowrap"
          handle={formatUsd(stats.totalAvailableLiquidity)}
          renderContent={() => (
            <>
              {stats.marketsStats.map(({ marketInfo, availableLiquidity }) => (
                <StatsTooltipRow
                  key={marketInfo.marketTokenAddress}
                  showDollar={false}
                  label={
                    <div className="items-top">
                      <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext lh-1">[{getMarketPoolName(marketInfo)}]</span>
                    </div>
                  }
                  value={formatUsd(availableLiquidity)}
                />
              ))}
            </>
          )}
        />
      </td>
      <td>
        <TooltipWithPortal
          portalClassName="MarketList-netfee-tooltip"
          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(netFeePerHourShort)}`}
          maxAllowedWidth={500}
          position="bottom-end"
          renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
        />
      </td>
      <td>{formatAmount(stats.totalUtilization, 2, 2)}%</td>
    </tr>
  );
}
