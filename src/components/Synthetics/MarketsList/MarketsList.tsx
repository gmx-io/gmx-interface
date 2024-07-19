import { Trans, t } from "@lingui/macro";
import noop from "lodash/noop";
import { useCallback, useMemo, useState } from "react";
import { useMedia } from "react-use";
import { Address, isAddress, isAddressEqual } from "viem";

import { getIcon } from "config/icons";
import { useMarketsInfoDataToIndexTokensStats } from "context/SyntheticsStateContext/hooks/statsHooks";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { IndexTokenStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { formatAmount, formatRatePercentage, formatUsd, formatUsdPrice } from "lib/numbers";

import { renderNetFeeHeaderTooltipContent } from "./NetFeeHeaderTooltipContent";
import PageTitle from "components/PageTitle/PageTitle";
import SearchInput from "components/SearchInput/SearchInput";
import { MarketListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { NetFeeTooltip } from "./NetFeeTooltip";

import "./MarketsList.scss";

export function MarketsList() {
  const { chainId } = useChainId();

  const indexTokensStats = useMarketsInfoDataToIndexTokensStats();

  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <>
      {!isMobile && <MarketsListDesktop chainId={chainId} indexTokensStats={indexTokensStats} />}
      {isMobile && <MarketsListMobile indexTokensStats={indexTokensStats} />}
    </>
  );
}

function MarketsListDesktop({ chainId, indexTokensStats }: { chainId: number; indexTokensStats: IndexTokenStat[] }) {
  const { orderBy, direction, getSorterProps } = useSorterHandlers<
    "price" | "tvl" | "liquidity" | "utilization" | "unspecified"
  >();
  const [searchText, setSearchText] = useState("");

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const sortedMarkets = useFilterSortMarkets({ searchText, indexTokensStats, orderBy, direction });

  return (
    <div className="token-table-wrapper App-card">
      <div className="mb-15 flex items-center text-16">
        <Trans>GM Pools</Trans>
        <img className="ml-5 mr-10" src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
        <SearchInput
          size="s"
          value={searchText}
          setValue={handleSearch}
          className="*:!text-16"
          placeholder="Search Market"
          onKeyDown={noop}
          autoFocus={false}
        />
      </div>
      <div className="App-card-divider"></div>
      <table className="token-table">
        <thead>
          <tr>
            <th>
              <Trans>MARKETS</Trans>
            </th>
            <th>
              <Sorter {...getSorterProps("price")}>
                <Trans>PRICE</Trans>
              </Sorter>
            </th>
            <th>
              <Sorter {...getSorterProps("tvl")}>
                <Trans comment="Total Value Locked">TVL</Trans>
              </Sorter>
            </th>
            <th>
              <Sorter {...getSorterProps("liquidity")}>
                <Trans>LIQUIDITY</Trans>
              </Sorter>
            </th>
            <th>
              <Tooltip handle={<Trans>NET RATE / 1 H</Trans>} renderContent={renderNetFeeHeaderTooltipContent} />
            </th>
            <th>
              <Sorter {...getSorterProps("utilization")}>
                <Trans>UTILIZATION</Trans>
              </Sorter>
            </th>
          </tr>
        </thead>
        <tbody>
          {indexTokensStats.length > 0 &&
            sortedMarkets.length > 0 &&
            sortedMarkets.map((stats) => <MarketsListDesktopItem key={stats.token.address} stats={stats} />)}

          {!indexTokensStats.length && <MarketListSkeleton />}

          {indexTokensStats.length > 0 && !sortedMarkets.length && (
            <tr>
              <td colSpan={6} className="text-center">
                <div className="text-center text-gray-400">
                  <Trans>No markets found.</Trans>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function useFilterSortMarkets({
  indexTokensStats,
  searchText,
  orderBy,
  direction,
}: {
  indexTokensStats: IndexTokenStat[];
  searchText: string;
  orderBy: string;
  direction: string;
}) {
  const filteredMarkets = useMemo(() => {
    if (!searchText.trim()) {
      return indexTokensStats;
    }

    return indexTokensStats.filter((indexTokenStat) => {
      const token = indexTokenStat.token;

      const tokenSymbol = token.symbol;
      const tokenName = token.name;

      const tokenAddress = token.address;

      return (
        tokenSymbol.toLowerCase().includes(searchText.toLowerCase()) ||
        tokenName.toLowerCase().includes(searchText.toLowerCase()) ||
        (isAddress(searchText) && isAddressEqual(tokenAddress as Address, searchText))
      );
    });
  }, [indexTokensStats, searchText]);

  const sortedMarkets = useMemo(() => {
    if (orderBy === "unspecified" || direction === "unspecified") {
      return filteredMarkets;
    }

    return filteredMarkets.slice().sort((a, b) => {
      const directionMultiplier = direction === "asc" ? 1 : -1;

      if (orderBy === "price") {
        return a.token.prices?.minPrice > b.token.prices?.minPrice ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "tvl") {
        return a.totalPoolValue > b.totalPoolValue ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "liquidity") {
        return a.totalMaxLiquidity > b.totalMaxLiquidity ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "utilization") {
        return a.totalUtilization > b.totalUtilization ? directionMultiplier : -directionMultiplier;
      }

      return 0;
    });
  }, [filteredMarkets, orderBy, direction]);

  return sortedMarkets;
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
                  <div>{formatUsdPrice(stats.token.prices?.minPrice)}</div>
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
                                <div className="inline-flex items-start">
                                  <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                                  <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>
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
                      handle={formatUsd(stats.totalMaxLiquidity)}
                      className="MarketList-mobile-tvl-tooltip"
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ marketInfo, maxLiquidity }) => (
                            <StatsTooltipRow
                              key={marketInfo.marketTokenAddress}
                              showDollar={false}
                              label={
                                <div className="inline-flex items-start">
                                  <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                                  <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>
                                </div>
                              }
                              value={formatUsd(maxLiquidity)}
                            />
                          ))}
                        </>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Tooltip handle={<Trans>Net Rate / 1h</Trans>} renderContent={renderNetFeeHeaderTooltipContent} />
                  </div>
                  <div>
                    <TooltipWithPortal
                      tooltipClassName="MarketList-netfee-tooltip"
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
          <div className="flex items-center">
            <div className="App-card-title-info-icon">
              <img
                src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                alt={stats.token.symbol}
                width="40"
              />
            </div>
            <div>
              <div className="App-card-info-title">{marketIndexName}</div>
            </div>
            <div>
              <AssetDropdown token={stats.token} />
            </div>
          </div>
        </div>
      </td>
      <td>{formatUsdPrice(stats.token.prices?.minPrice)}</td>
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
                  showColon
                  label={
                    <div className="inline-flex items-start">
                      <span>{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>:
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
          handle={formatUsd(stats.totalMaxLiquidity)}
          renderContent={() => (
            <>
              {stats.marketsStats.map(({ marketInfo, maxLiquidity }) => (
                <StatsTooltipRow
                  key={marketInfo.marketTokenAddress}
                  showDollar={false}
                  showColon
                  label={
                    <div className="inline-flex items-start">
                      <span>{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>:
                    </div>
                  }
                  value={formatUsd(maxLiquidity)}
                />
              ))}
            </>
          )}
        />
      </td>
      <td>
        <TooltipWithPortal
          tooltipClassName="MarketList-netfee-tooltip"
          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(netFeePerHourShort)}`}
          maxAllowedWidth={510}
          position="bottom-end"
          renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
        />
      </td>
      <td>{formatAmount(stats.totalUtilization, 2, 2)}%</td>
    </tr>
  );
}
